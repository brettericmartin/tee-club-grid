#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

/**
 * ONLY VERIFIED WORKING URLS
 * Each URL has been manually tested to ensure:
 * 1. It goes to the correct product
 * 2. The price is accurate
 * 3. It's a direct product page (not search)
 */

const VERIFIED_DRIVER_PRICES = [
  {
    brand: 'TaylorMade',
    model: 'Qi10 LS',
    prices: [
      // DO NOT ADD URLS WITHOUT TESTING THEM FIRST
      // The following are placeholders - need real working URLs
    ]
  }
];

async function addOnlyVerifiedPrices() {
  console.log('⚠️  IMPORTANT: Only adding prices with verified working URLs\n');
  console.log('Each URL must be tested to ensure:');
  console.log('1. It goes to the exact product');
  console.log('2. The price matches what we show');
  console.log('3. It\'s a direct product page\n');
  
  let totalAdded = 0;
  
  for (const driverData of VERIFIED_DRIVER_PRICES) {
    // Find equipment in database
    const { data: equipment } = await supabase
      .from('equipment')
      .select('id, brand, model')
      .eq('brand', driverData.brand)
      .eq('model', driverData.model)
      .eq('category', 'driver')
      .single();
    
    if (!equipment) {
      console.log(`❌ Not found: ${driverData.brand} ${driverData.model}`);
      continue;
    }
    
    if (driverData.prices.length === 0) {
      console.log(`⚠️  ${equipment.brand} ${equipment.model}: No verified URLs yet`);
      continue;
    }
    
    console.log(`\n${equipment.brand} ${equipment.model}`);
    
    for (const priceData of driverData.prices) {
      const { error } = await supabase
        .from('equipment_prices')
        .insert({
          equipment_id: equipment.id,
          retailer: priceData.retailer,
          price: priceData.price,
          url: priceData.url,
          in_stock: priceData.in_stock
        });
      
      if (!error) {
        console.log(`  ✅ ${priceData.retailer}: $${priceData.price} (URL verified)`);
        totalAdded++;
      }
    }
  }
  
  if (totalAdded === 0) {
    console.log('\n❌ No prices added - URLs need to be manually verified first');
    console.log('\nTo add prices:');
    console.log('1. Go to each retailer site');
    console.log('2. Search for the exact product');
    console.log('3. Copy the direct product URL');
    console.log('4. Verify the price matches');
    console.log('5. Add to this script');
  } else {
    console.log(`\n✅ Added ${totalAdded} verified prices`);
  }
}

// For now, let's add a manual verification process
async function manuallyAddSinglePrice(brand, model, retailer, price, url) {
  console.log(`\n🔍 Manually adding verified price:`);
  console.log(`   Product: ${brand} ${model}`);
  console.log(`   Retailer: ${retailer}`);
  console.log(`   Price: $${price}`);
  console.log(`   URL: ${url}`);
  
  const { data: equipment } = await supabase
    .from('equipment')
    .select('id')
    .eq('brand', brand)
    .eq('model', model)
    .eq('category', 'driver')
    .single();
  
  if (!equipment) {
    console.log('❌ Equipment not found in database');
    return;
  }
  
  const { error } = await supabase
    .from('equipment_prices')
    .insert({
      equipment_id: equipment.id,
      retailer,
      price,
      url,
      in_stock: true
    });
  
  if (!error) {
    console.log('✅ Price added successfully');
  } else {
    console.log('❌ Error:', error.message);
  }
}

// Example of how to add a single verified price:
// Uncomment and modify with actual verified data
/*
manuallyAddSinglePrice(
  'TaylorMade',
  'Qi10 LS',
  'TaylorMade Direct',
  599.99,
  'https://www.taylormade.com/...' // ACTUAL WORKING URL HERE
);
*/

addOnlyVerifiedPrices().catch(console.error);