#!/usr/bin/env node

import { supabase } from './supabase-admin.js';
import fetch from 'node-fetch';

const FIRECRAWL_API_KEY = 'fc-5bfd19a22c03445092efedc3ef1c403a';

/**
 * Scrape a page and extract both prices AND product URLs
 */
async function scrapePageWithFirecrawl(url) {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'links'],
        onlyMainContent: false, // Get full page to find product links
        waitFor: 2000
      })
    });

    if (!response.ok) {
      console.log(`    ❌ Scraping failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('    ❌ Error:', error.message);
    return null;
  }
}

/**
 * Extract product URL and price from search results
 */
function extractProductData(scrapedData, brand, model, retailerConfig, searchUrl) {
  if (!scrapedData?.success || !scrapedData?.data) return null;
  
  const markdown = scrapedData.data.markdown || '';
  const links = scrapedData.data.links || [];
  
  // Find product-specific URL patterns for each retailer
  let productUrl = null;
  let price = null;
  
  switch (retailerConfig.name) {
    case 'Amazon':
      // Look for Amazon product links (dp/ASIN format)
      const amazonLink = links.find(link => 
        link.includes('/dp/') || 
        link.includes('/gp/product/')
      );
      if (amazonLink) {
        // Clean up Amazon URL
        const asinMatch = amazonLink.match(/\/dp\/([A-Z0-9]{10})/);
        if (asinMatch) {
          productUrl = `https://www.amazon.com/dp/${asinMatch[1]}`;
        }
      }
      break;
      
    case '2nd Swing Golf':
      // Look for 2nd Swing product links
      const swingLink = links.find(link => 
        link.includes('2ndswing.com/p-') || 
        link.includes('2ndswing.com/product/')
      );
      productUrl = swingLink || null;
      break;
      
    case 'Golf Galaxy':
      // Look for Golf Galaxy product links
      const galaxyLink = links.find(link => 
        link.includes('golfgalaxy.com/p/') || 
        link.includes('/product/')
      );
      productUrl = galaxyLink || null;
      break;
      
    case 'PGA Tour Superstore':
      // Look for PGA Tour Superstore product links
      const pgaLink = links.find(link => 
        link.includes('pgatoursuperstore.com/') &&
        link.includes('.html') &&
        !link.includes('/search')
      );
      productUrl = pgaLink || null;
      break;
      
    default:
      // For brand direct sites, look for product pages
      const directLink = links.find(link => 
        link.includes(model.toLowerCase().replace(/\s+/g, '-')) ||
        link.includes('/product/') ||
        link.includes('.html')
      );
      productUrl = directLink || null;
  }
  
  // Extract price from markdown content
  // Look near the product model name for more accurate pricing
  const modelIndex = markdown.toLowerCase().indexOf(model.toLowerCase());
  let contextText = markdown;
  
  if (modelIndex > -1) {
    // Get 500 chars around the model name
    contextText = markdown.substring(
      Math.max(0, modelIndex - 200), 
      Math.min(markdown.length, modelIndex + 500)
    );
  }
  
  // Find prices in the context
  const priceMatches = contextText.match(/\$(\d{2,4}(?:\.\d{2})?)/g) || [];
  const prices = priceMatches
    .map(p => parseFloat(p.replace('$', '')))
    .filter(p => p >= 50 && p <= 2000); // Golf equipment range
  
  if (prices.length > 0) {
    price = prices[0]; // Take first reasonable price
  }
  
  return {
    productUrl: productUrl || searchUrl, // Fallback to search URL if no product URL found
    price: price
  };
}

/**
 * Main scraping function for equipment
 */
async function scrapeEquipmentPrices(equipment) {
  console.log(`\n📦 ${equipment.brand} ${equipment.model}`);
  
  const retailers = [
    {
      name: 'Amazon',
      searchUrl: `https://www.amazon.com/s?k=${encodeURIComponent(equipment.brand + ' ' + equipment.model + ' golf')}&i=sporting`
    },
    {
      name: '2nd Swing Golf',
      searchUrl: `https://www.2ndswing.com/search/?searchTerm=${encodeURIComponent(equipment.brand + ' ' + equipment.model)}`
    },
    {
      name: 'Golf Galaxy',
      searchUrl: `https://www.golfgalaxy.com/search?searchTerm=${encodeURIComponent(equipment.brand + ' ' + equipment.model)}`
    },
    {
      name: 'PGA Tour Superstore',
      searchUrl: `https://www.pgatoursuperstore.com/search?q=${encodeURIComponent(equipment.brand + ' ' + equipment.model)}`
    }
  ];
  
  for (const retailer of retailers) {
    console.log(`  \n  🏪 ${retailer.name}`);
    console.log(`  🔍 Searching...`);
    
    const scrapedData = await scrapePageWithFirecrawl(retailer.searchUrl);
    
    if (scrapedData) {
      const productData = extractProductData(
        scrapedData, 
        equipment.brand, 
        equipment.model, 
        retailer,
        retailer.searchUrl
      );
      
      if (productData) {
        if (productData.productUrl !== retailer.searchUrl) {
          console.log(`  📎 Product URL: ${productData.productUrl.substring(0, 60)}...`);
        }
        
        if (productData.price) {
          console.log(`  💰 Price: $${productData.price}`);
          
          // Save to database with proper product URL
          const { error } = await supabase
            .from('equipment_prices')
            .upsert({
              equipment_id: equipment.id,
              retailer: retailer.name,
              price: productData.price,
              url: productData.productUrl, // Use the actual product URL
              in_stock: true
            });
          
          if (error) {
            console.error(`  ❌ Database error:`, error.message);
          } else {
            console.log(`  ✅ Saved with product URL`);
          }
        } else {
          console.log(`  ⚠️  No price found`);
        }
      }
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 4000));
  }
}

async function main() {
  console.log('🎯 Smart Price Scraper with Product URLs\n');
  console.log('This scraper extracts actual product page URLs, not just search pages\n');
  
  // Clear old prices with search URLs
  console.log('🧹 Clearing old search URLs...');
  await supabase
    .from('equipment_prices')
    .delete()
    .like('url', '%/search%');
  
  // Get equipment to price
  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .in('category', ['driver', 'putter', 'iron'])
    .limit(2);
  
  if (!equipment || equipment.length === 0) {
    console.log('No equipment found');
    return;
  }
  
  for (const item of equipment) {
    await scrapeEquipmentPrices(item);
  }
  
  // Show summary of URLs
  console.log('\n\n📊 Summary of Product URLs:\n');
  
  const { data: prices } = await supabase
    .from('equipment_prices')
    .select('retailer, url, price')
    .order('retailer');
  
  prices?.forEach(p => {
    const isProductUrl = !p.url.includes('/search');
    const icon = isProductUrl ? '✅' : '⚠️';
    console.log(`${icon} ${p.retailer}: $${p.price}`);
    console.log(`   ${p.url.substring(0, 70)}...`);
  });
  
  console.log(`\n✅ Complete!`);
}

main().catch(console.error);