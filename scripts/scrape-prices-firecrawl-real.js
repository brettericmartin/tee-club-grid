#!/usr/bin/env node

import { supabase } from './supabase-admin.js';
import fetch from 'node-fetch';

const FIRECRAWL_API_KEY = 'fc-5bfd19a22c03445092efedc3ef1c403a';
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

/**
 * Scrape a URL using Firecrawl API
 */
async function firecrawlScrape(url) {
  try {
    const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        onlyMainContent: true
      })
    });

    if (!response.ok) {
      throw new Error(`Firecrawl API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Firecrawl error:', error);
    return null;
  }
}

/**
 * Extract price from scraped content
 */
function extractPrice(content, retailer) {
  if (!content) return null;
  
  const text = (content.markdown || content.content || '').substring(0, 50000); // Limit text size
  
  // Debug: Show a sample of what we scraped
  console.log(`    📄 Content sample: ${text.substring(0, 200)}...`);
  
  // Look for price patterns
  const pricePatterns = [
    /\$(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/g,  // $299.99 or $1,299.99
    /USD\s*(\d+(?:\.\d{2})?)/g,              // USD 299.99
    /Price:\s*\$?(\d+(?:\.\d{2})?)/gi,       // Price: $299.99
    /now:\s*\$(\d+(?:\.\d{2})?)/gi,          // now: $299.99
    /sale:\s*\$(\d+(?:\.\d{2})?)/gi,         // sale: $299.99
  ];

  const prices = [];
  
  for (const pattern of pricePatterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      // Reasonable price range for golf equipment
      if (price >= 20 && price <= 5000) { 
        prices.push(price);
      }
    }
  }

  // Sort prices and return a reasonable one (not the cheapest, which might be an accessory)
  prices.sort((a, b) => b - a);
  
  // For golf equipment, return a price that seems reasonable for the category
  const reasonablePrice = prices.find(p => p > 100) || prices[0];
  
  if (reasonablePrice) {
    console.log(`    💰 Extracted price: $${reasonablePrice}`);
  }
  
  return reasonablePrice || null;
}

/**
 * Scrape prices for a specific equipment item
 */
async function scrapeEquipmentPrices(equipment) {
  console.log(`\n🔍 Scraping prices for: ${equipment.brand} ${equipment.model}`);
  
  const retailers = [
    {
      name: 'Amazon',
      searchUrl: `https://www.amazon.com/s?k=${encodeURIComponent(equipment.brand + ' ' + equipment.model + ' golf')}&i=sporting`
    },
    {
      name: 'PGA Tour Superstore',
      searchUrl: `https://www.pgatoursuperstore.com/search?q=${encodeURIComponent(equipment.brand + ' ' + equipment.model)}`
    },
    {
      name: '2nd Swing Golf',
      searchUrl: `https://www.2ndswing.com/search/?searchTerm=${encodeURIComponent(equipment.brand + ' ' + equipment.model)}`
    },
    {
      name: 'Golf Galaxy',
      searchUrl: `https://www.golfgalaxy.com/search?searchTerm=${encodeURIComponent(equipment.brand + ' ' + equipment.model)}`
    }
  ];

  const results = [];

  for (const retailer of retailers) {
    console.log(`  📡 Scraping ${retailer.name}...`);
    
    const scrapedData = await firecrawlScrape(retailer.searchUrl);
    
    if (scrapedData && scrapedData.success) {
      const price = extractPrice(scrapedData.data, retailer.name);
      
      if (price) {
        const priceData = {
          equipment_id: equipment.id,
          retailer: retailer.name,
          price: price,
          url: retailer.searchUrl,
          in_stock: true
        };
        
        // Save to database (simple insert for now)
        const { error } = await supabase
          .from('equipment_prices')
          .insert(priceData);
        
        if (error) {
          console.error(`    ❌ Error saving price:`, error.message);
        } else {
          console.log(`    ✅ Found price: $${price}`);
          results.push(priceData);
        }
      } else {
        console.log(`    ⚠️  No price found`);
      }
    } else {
      console.log(`    ❌ Scraping failed`);
    }
    
    // Be respectful with rate limiting (5 seconds between requests)
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  return results;
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting Firecrawl price scraper...\n');
  console.log('📌 Using Firecrawl API to get real prices\n');

  // Get some popular equipment to scrape
  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .in('category', ['driver', 'putter'])
    .limit(1);

  if (error || !equipment?.length) {
    console.error('Could not fetch equipment:', error);
    return;
  }

  console.log(`Found ${equipment.length} equipment items to price\n`);

  let totalPrices = 0;
  
  for (const item of equipment) {
    const prices = await scrapeEquipmentPrices(item);
    totalPrices += prices.length;
  }

  console.log(`\n✅ Scraping complete! Found ${totalPrices} prices total`);
  
  // Show summary
  const { count } = await supabase
    .from('equipment_prices')
    .select('*', { count: 'exact', head: true });
    
  console.log(`📊 Total prices in database: ${count}`);
}

// Run the scraper
main().catch(console.error);