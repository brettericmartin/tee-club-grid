#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

/**
 * Real Equipment Price Scraper using Firecrawl
 * 
 * This script uses Firecrawl to scrape actual prices from golf retailers.
 * API Key: fc-5bfd19a22c03445092efedc3ef1c403a
 */

// Firecrawl API configuration
const FIRECRAWL_API_KEY = 'fc-5bfd19a22c03445092efedc3ef1c403a';
const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v0';

/**
 * Make a request to Firecrawl API
 */
async function firecrawlScrape(url, options = {}) {
  const payload = {
    url: url,
    formats: ["markdown", "extract"],
    extract: options.extract || {
      schema: {
        products: [
          {
            name: "Product name or title",
            price: "Current price as a number",
            originalPrice: "Original or list price as a number",
            inStock: "Whether item is in stock (boolean)",
            url: "Product page URL"
          }
        ]
      },
      prompt: "Find golf equipment products and extract their pricing information. Focus on the specific brand and model mentioned in the search."
    },
    ...options
  };

  try {
    console.log(`🔥 Calling Firecrawl for: ${url}`);
    
    const response = await fetch(`${FIRECRAWL_BASE_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Firecrawl response received`);
    
    // Debug: Log the actual response
    console.log('🔍 Debug - Firecrawl response:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error(`❌ Firecrawl error:`, error.message);
    return null;
  }
}

/**
 * Scrape Amazon for equipment (Amazon blocks most automated requests)
 */
async function scrapeAmazon(brand, model) {
  console.log('⚠️  Skipping Amazon - they block automated requests');
  return null;
}

/**
 * Scrape PGA Tour Superstore
 */
async function scrapePGAStore(brand, model) {
  const searchQuery = `${brand} ${model}`;
  const searchUrl = `https://www.pgatoursuperstore.com/search?q=${encodeURIComponent(searchQuery)}`;
  
  const result = await firecrawlScrape(searchUrl, {
    extract: {
      schema: {
        products: [
          {
            name: "Product name",
            currentPrice: "Current price as number",
            originalPrice: "Original/regular price as number", 
            availability: "Stock status text",
            productUrl: "Product page URL"
          }
        ]
      }
    }
  });

  if (result?.extract?.products?.length > 0) {
    const product = result.extract.products[0];
    
    return {
      retailer: 'pga-superstore',
      price: product.currentPrice,
      originalPrice: product.originalPrice,
      inStock: !product.availability?.toLowerCase().includes('out of stock'),
      url: product.productUrl?.startsWith('http') ? product.productUrl : `https://www.pgatoursuperstore.com${product.productUrl}`,
      metadata: {
        availability: product.availability
      }
    };
  }
  
  return null;
}

/**
 * Scrape 2nd Swing Golf
 */
async function scrape2ndSwing(brand, model) {
  const searchQuery = `${brand} ${model}`;
  const searchUrl = `https://www.2ndswing.com/search/?searchTerm=${encodeURIComponent(searchQuery)}`;
  
  const result = await firecrawlScrape(searchUrl, {
    extract: {
      schema: {
        products: [
          {
            name: "Product name",
            newPrice: "New condition price as number",
            usedPrices: [
              {
                condition: "Condition (e.g. Excellent, Good)",
                price: "Price as number"
              }
            ],
            tradeValue: "Trade-in value as number",
            productUrl: "Product page URL"
          }
        ]
      }
    }
  });

  if (result?.extract?.products?.length > 0) {
    const product = result.extract.products[0];
    const prices = [];
    
    // Add new price if available
    if (product.newPrice) {
      prices.push({
        retailer: '2nd-swing',
        condition: 'new',
        price: product.newPrice,
        inStock: true,
        url: product.productUrl
      });
    }
    
    // Add used prices
    if (product.usedPrices) {
      product.usedPrices.forEach(used => {
        prices.push({
          retailer: '2nd-swing',
          condition: `used-${used.condition?.toLowerCase()}`,
          price: used.price,
          inStock: true,
          url: product.productUrl,
          metadata: {
            tradeValue: product.tradeValue
          }
        });
      });
    }
    
    return prices.length > 0 ? prices : null;
  }
  
  return null;
}

/**
 * Scrape Golf Galaxy
 */
async function scrapeGolfGalaxy(brand, model) {
  const searchQuery = `${brand} ${model}`;
  const searchUrl = `https://www.golfgalaxy.com/search?searchTerm=${encodeURIComponent(searchQuery)}`;
  
  const result = await firecrawlScrape(searchUrl, {
    extract: {
      schema: {
        products: [
          {
            name: "Product name",
            price: "Current price as number",
            originalPrice: "Original price as number",
            availability: "Availability status",
            productUrl: "Product URL"
          }
        ]
      }
    }
  });

  if (result?.extract?.products?.length > 0) {
    const product = result.extract.products[0];
    
    return {
      retailer: 'golf-galaxy',
      price: product.price,
      originalPrice: product.originalPrice,
      inStock: !product.availability?.toLowerCase().includes('out of stock'),
      url: product.productUrl?.startsWith('http') ? product.productUrl : `https://www.golfgalaxy.com${product.productUrl}`,
      metadata: {
        availability: product.availability
      }
    };
  }
  
  return null;
}

/**
 * Store price data in database
 */
async function storePriceData(equipmentId, priceData) {
  const prices = Array.isArray(priceData) ? priceData : [priceData];
  
  for (const price of prices) {
    const dbRecord = {
      equipment_id: equipmentId,
      retailer: price.retailer,
      price: price.price,
      url: price.url,
      in_stock: price.inStock !== false,
      recorded_at: new Date().toISOString(),
      metadata: price.metadata || {}
    };
    
    // Add condition if present
    if (price.condition) {
      dbRecord.condition = price.condition;
    }
    
    const { error } = await supabase
      .from('equipment_prices')
      .insert(dbRecord);
      
    if (error) {
      console.error('❌ Error storing price:', error);
    } else {
      console.log(`✅ Stored ${price.retailer} price: $${price.price}`);
    }
  }
}

/**
 * Scrape prices for a specific equipment item
 */
async function scrapeEquipmentPrices(equipmentId) {
  console.log(`\n🎯 Scraping prices for equipment ID: ${equipmentId}`);
  
  // Get equipment details
  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .eq('id', equipmentId)
    .single();
    
  if (error || !equipment) {
    console.error('❌ Equipment not found:', error);
    return [];
  }
  
  console.log(`🏌️ Equipment: ${equipment.brand} ${equipment.model} (${equipment.category})`);
  
  const allResults = [];
  
  // Define scrapers to run (skipping Amazon as they block automated requests)
  const scrapers = [
    { name: 'PGA Tour Superstore', fn: () => scrapePGAStore(equipment.brand, equipment.model) },
    { name: '2nd Swing Golf', fn: () => scrape2ndSwing(equipment.brand, equipment.model) },
    { name: 'Golf Galaxy', fn: () => scrapeGolfGalaxy(equipment.brand, equipment.model) }
  ];
  
  // Run scrapers with delays to be respectful
  for (const scraper of scrapers) {
    try {
      console.log(`\n🛒 Scraping ${scraper.name}...`);
      
      const result = await scraper.fn();
      
      if (result) {
        await storePriceData(equipmentId, result);
        allResults.push(result);
        console.log(`✅ Found prices from ${scraper.name}`);
      } else {
        console.log(`⚠️  No prices found on ${scraper.name}`);
      }
      
      // Wait between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error(`❌ Error scraping ${scraper.name}:`, error.message);
    }
  }
  
  console.log(`\n📊 Total prices found: ${allResults.length}`);
  return allResults;
}

/**
 * Main execution
 */
async function main() {
  const equipmentId = process.argv[2];
  
  if (!equipmentId) {
    console.log('🚀 Usage: node scripts/scrape-real-prices-firecrawl.js <equipment-id>');
    console.log('\nOr use --test to scrape prices for a few popular items');
    
    // Show some equipment IDs for testing
    const { data: sampleEquipment } = await supabase
      .from('equipment')
      .select('id, brand, model, category')
      .in('category', ['driver', 'putter'])
      .limit(3);
    
    if (sampleEquipment) {
      console.log('\n📝 Sample equipment IDs to test:');
      sampleEquipment.forEach(item => {
        console.log(`  ${item.id} - ${item.brand} ${item.model} (${item.category})`);
      });
    }
    
    process.exit(1);
  }
  
  if (equipmentId === '--test') {
    // Test with popular items from our check
    const testIds = [
      '9e61279b-0e60-4b45-a5c6-719c86a56faa', // PXG Driver
      '98c49640-eacc-46c9-8ca2-90658aec889d'  // TaylorMade Putter
    ];
    
    for (const id of testIds) {
      await scrapeEquipmentPrices(id);
      console.log('\n' + '='.repeat(60));
    }
  } else {
    await scrapeEquipmentPrices(equipmentId);
  }
  
  console.log('\n🎉 Price scraping complete!');
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}

export { scrapeEquipmentPrices };