#!/usr/bin/env node

import { supabase } from './supabase-admin.js';
import fetch from 'node-fetch';

const FIRECRAWL_API_KEY = 'fc-5bfd19a22c03445092efedc3ef1c403a';

/**
 * Known direct product URLs for popular equipment
 * This helps bypass search and go straight to products
 */
const KNOWN_PRODUCT_URLS = {
  'Scotty Cameron Special Select Newport 2 Plus': {
    'Titleist Direct': 'https://www.titleist.com/golf-clubs/putters/special-select/special-select-newport-2-plus',
    'Amazon': 'https://www.amazon.com/dp/B0BVP8MFYC',
    '2nd Swing': 'https://www.2ndswing.com/pv-2091034503-scotty-cameron-2023-special-select-newport-2-plus-putter-steel-right-handed-350-degrees.aspx'
  },
  'TaylorMade Qi10 Max': {
    'TaylorMade Direct': 'https://www.taylormade.com/Qi10-Max-Driver/DW-TA093.html',
    'Amazon': 'https://www.amazon.com/dp/B0CL5K2QNW',
    'Golf Galaxy': 'https://www.golfgalaxy.com/p/taylormade-qi10-max-driver-23tymmmq10mxdrvrrdrv/23tymmmq10mxdrvrrdrv'
  },
  'Callaway Paradym Ai Smoke MAX': {
    'Callaway Direct': 'https://www.callawaygolf.com/golf-clubs/drivers/drivers-2024-paradym-ai-smoke-max.html',
    'Amazon': 'https://www.amazon.com/dp/B0CL68NMLR'
  },
  'Titleist Pro V1': {
    'Titleist Direct': 'https://www.titleist.com/golf-balls/pro-v1',
    'Amazon': 'https://www.amazon.com/dp/B0BN6V9YZW',
    'Golf Galaxy': 'https://www.golfgalaxy.com/p/titleist-2023-pro-v1-golf-balls-22ttlm2023prv1whtgbl/22ttlm2023prv1whtgbl'
  }
};

/**
 * Price validation ranges by category
 */
const PRICE_RANGES = {
  driver: { min: 150, max: 800 },
  fairway_wood: { min: 100, max: 500 },
  hybrid: { min: 100, max: 400 },
  iron: { min: 400, max: 2500 }, // For sets
  wedge: { min: 80, max: 250 },
  putter: { min: 100, max: 800 },
  ball: { min: 20, max: 80 }, // Per dozen
  bag: { min: 50, max: 500 },
  glove: { min: 10, max: 50 },
  rangefinder: { min: 100, max: 700 }
};

/**
 * Use Firecrawl's extract API with structured schema
 */
async function extractProductData(url, equipment) {
  console.log(`    📡 Extracting from: ${url.substring(0, 60)}...`);
  
  const schema = {
    type: "object",
    properties: {
      productName: {
        type: "string",
        description: "The exact product name/title"
      },
      price: {
        type: "number",
        description: "Current selling price in USD (not MSRP)"
      },
      originalPrice: {
        type: "number",
        description: "Original/MSRP price if item is on sale"
      },
      inStock: {
        type: "boolean",
        description: "Whether the item is currently in stock"
      },
      availability: {
        type: "string",
        description: "Stock status text (e.g., 'In Stock', 'Ships in 2-3 days')"
      }
    },
    required: ["price"]
  };

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        formats: ['extract'],
        extract: {
          schema,
          systemPrompt: `Extract product information for ${equipment.brand} ${equipment.model}. 
                         This is a ${equipment.category} golf equipment item.
                         Focus on the main product price, not accessories or related items.
                         Expected price range: $${PRICE_RANGES[equipment.category]?.min || 50} - $${PRICE_RANGES[equipment.category]?.max || 1000}`
        },
        waitFor: 3000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`      ❌ API Error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.success && data.data?.extract) {
      const extracted = data.data.extract;
      console.log(`      📦 Found: ${extracted.productName || 'Product'}`);
      console.log(`      💰 Price: $${extracted.price}`);
      
      // Validate price is in expected range
      const range = PRICE_RANGES[equipment.category];
      if (range && (extracted.price < range.min || extracted.price > range.max)) {
        console.log(`      ⚠️  Price outside expected range ($${range.min}-$${range.max})`);
        return null;
      }
      
      return {
        price: extracted.price,
        originalPrice: extracted.originalPrice,
        inStock: extracted.inStock !== false,
        availability: extracted.availability
      };
    }
  } catch (error) {
    console.error(`      ❌ Error:`, error.message);
  }
  
  return null;
}

/**
 * Scrape equipment prices using known URLs or search
 */
async function scrapeEquipmentPrices(equipment) {
  console.log(`\n🏌️ ${equipment.brand} ${equipment.model} (${equipment.category})`);
  
  const results = [];
  const knownUrls = KNOWN_PRODUCT_URLS[`${equipment.brand} ${equipment.model}`] || {};
  
  // First, try known direct product URLs
  for (const [retailer, url] of Object.entries(knownUrls)) {
    console.log(`  \n  🏪 ${retailer} (Direct Product URL)`);
    
    const productData = await extractProductData(url, equipment);
    
    if (productData && productData.price) {
      const priceRecord = {
        equipment_id: equipment.id,
        retailer,
        price: productData.price,
        url: url,
        in_stock: productData.inStock
      };
      
      // Save to database
      const { error } = await supabase
        .from('equipment_prices')
        .insert(priceRecord);
      
      if (error) {
        console.error(`    ❌ Database error:`, error.message);
      } else {
        console.log(`    ✅ Saved: $${productData.price}`);
        results.push(priceRecord);
      }
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 3000));
  }
  
  // If no known URLs, try searching (but warn about accuracy)
  if (Object.keys(knownUrls).length === 0) {
    console.log(`  \n  ⚠️  No known product URLs for this item`);
    console.log(`      Consider adding direct product URLs for better accuracy`);
    
    // Try Amazon search as fallback
    const amazonSearchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(equipment.brand + ' ' + equipment.model + ' golf')}`;
    console.log(`  \n  🏪 Amazon (Search - Less Accurate)`);
    
    const searchData = await extractProductData(amazonSearchUrl, equipment);
    if (searchData && searchData.price) {
      const priceRecord = {
        equipment_id: equipment.id,
        retailer: 'Amazon (Search)',
        price: searchData.price,
        url: amazonSearchUrl,
        in_stock: searchData.inStock
      };
      
      await supabase.from('equipment_prices').insert(priceRecord);
      console.log(`    ⚠️  Search result price: $${searchData.price} (may not be accurate)`);
    }
    
    await new Promise(r => setTimeout(r, 3000));
  }
  
  return results;
}

async function main() {
  console.log('🎯 Smart Price Scraper with Extract API\n');
  console.log('Using Firecrawl Extract for structured data extraction\n');
  
  // Get equipment to price - focusing on items we have URLs for
  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .or(`
      model.ilike.%Special Select Newport 2%,
      model.ilike.%Qi10 Max%,
      model.ilike.%Pro V1%,
      model.ilike.%Paradym Ai Smoke%
    `)
    .limit(3);
  
  if (!equipment || equipment.length === 0) {
    console.log('No equipment found. Looking for any equipment...');
    
    const { data: anyEquipment } = await supabase
      .from('equipment')
      .select('id, brand, model, category')
      .in('category', ['driver', 'putter', 'ball'])
      .limit(2);
    
    if (anyEquipment && anyEquipment.length > 0) {
      for (const item of anyEquipment) {
        await scrapeEquipmentPrices(item);
      }
    }
  } else {
    for (const item of equipment) {
      await scrapeEquipmentPrices(item);
    }
  }
  
  // Summary
  console.log('\n\n📊 Results Summary:\n');
  
  const { data: prices } = await supabase
    .from('equipment_prices')
    .select(`
      retailer,
      price,
      url,
      equipment:equipment_id (
        brand,
        model
      )
    `)
    .order('price');
  
  if (prices && prices.length > 0) {
    prices.forEach(p => {
      const isDirectUrl = !p.url.includes('/search') && !p.url.includes('/s?');
      const icon = isDirectUrl ? '✅' : '🔍';
      console.log(`${icon} ${p.equipment?.brand} ${p.equipment?.model}`);
      console.log(`   ${p.retailer}: $${p.price}`);
      console.log(`   ${p.url.substring(0, 60)}...`);
      console.log('');
    });
  } else {
    console.log('No prices found. This could be due to:');
    console.log('- Rate limiting from Firecrawl API');
    console.log('- Sites blocking automated access');
    console.log('- Products not found at retailers');
    console.log('\nConsider adding more known product URLs to the KNOWN_PRODUCT_URLS mapping');
  }
}

main().catch(console.error);