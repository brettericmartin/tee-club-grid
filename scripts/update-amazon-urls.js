#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

/**
 * Clean up Amazon URLs to be direct product links
 */
async function cleanAmazonUrls() {
  console.log('🧹 Cleaning Amazon URLs...\n');
  
  // Get all Amazon prices
  const { data: prices } = await supabase
    .from('equipment_prices')
    .select('*')
    .eq('retailer', 'Amazon');
  
  if (!prices || prices.length === 0) {
    console.log('No Amazon prices found');
    return;
  }
  
  for (const price of prices) {
    let cleanUrl = price.url;
    let updated = false;
    
    // Extract ASIN from various Amazon URL formats
    const patterns = [
      /\/dp\/([A-Z0-9]{10})/,
      /\/gp\/product\/([A-Z0-9]{10})/,
      /\/product\/([A-Z0-9]{10})/,
      /amazon\.com\/[^\/]+\/([A-Z0-9]{10})/
    ];
    
    for (const pattern of patterns) {
      const match = price.url.match(pattern);
      if (match) {
        cleanUrl = `https://www.amazon.com/dp/${match[1]}`;
        updated = true;
        break;
      }
    }
    
    if (updated) {
      console.log(`✅ Updated: ${cleanUrl}`);
      
      await supabase
        .from('equipment_prices')
        .update({ url: cleanUrl })
        .eq('id', price.id);
    } else if (price.url.includes('/s?')) {
      console.log(`⚠️  Search URL (needs product ASIN): ${price.retailer}`);
    } else {
      console.log(`✓ Already clean: ${price.retailer}`);
    }
  }
  
  console.log('\n✅ Done!');
}

cleanAmazonUrls().catch(console.error);