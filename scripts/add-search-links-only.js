#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

/**
 * Add ONLY search links for drivers
 * We don't show prices unless manually verified
 * This is more honest than showing wrong prices/links
 */

const DRIVER_SEARCH_LINKS = [
  {
    brand: 'TaylorMade',
    model: 'Qi10 LS',
    searches: [
      {
        retailer: 'TaylorMade.com (Search)',
        url: 'https://www.taylormade.com/search?q=Qi10+LS'
      },
      {
        retailer: 'Amazon (Search)',
        url: 'https://www.amazon.com/s?k=TaylorMade+Qi10+LS+Driver'
      },
      {
        retailer: '2nd Swing (Search)',
        url: 'https://www.2ndswing.com/search/?searchTerm=TaylorMade+Qi10+LS'
      },
      {
        retailer: 'PGA Superstore (Search)',
        url: 'https://www.pgatoursuperstore.com/search?q=Qi10+LS'
      }
    ]
  },
  {
    brand: 'TaylorMade',
    model: 'Qi10 Max',
    searches: [
      {
        retailer: 'TaylorMade.com (Search)',
        url: 'https://www.taylormade.com/search?q=Qi10+Max'
      },
      {
        retailer: 'Amazon (Search)',
        url: 'https://www.amazon.com/s?k=TaylorMade+Qi10+Max+Driver'
      },
      {
        retailer: '2nd Swing (Search)',
        url: 'https://www.2ndswing.com/search/?searchTerm=TaylorMade+Qi10+Max'
      }
    ]
  },
  {
    brand: 'TaylorMade',
    model: 'Qi10',
    searches: [
      {
        retailer: 'TaylorMade.com (Search)',
        url: 'https://www.taylormade.com/search?q=Qi10+driver'
      },
      {
        retailer: 'Amazon (Search)',
        url: 'https://www.amazon.com/s?k=TaylorMade+Qi10+Driver'
      }
    ]
  }
];

async function addSearchLinksOnly() {
  console.log('📍 Adding Search Links Only (No Unverified Prices)\n');
  console.log('This is more honest than showing incorrect prices/links\n');
  
  for (const driverData of DRIVER_SEARCH_LINKS) {
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
    
    console.log(`\n${equipment.brand} ${equipment.model}`);
    
    for (const search of driverData.searches) {
      // Add with a high price (999999) so it sorts last and shows as search-only
      const { error } = await supabase
        .from('equipment_prices')
        .insert({
          equipment_id: equipment.id,
          retailer: search.retailer,
          price: 999999, // High price indicates search-only
          url: search.url,
          in_stock: false // Mark as not in stock to show it's search-only
        });
      
      if (!error) {
        console.log(`  🔍 Added search link: ${search.retailer}`);
      }
    }
  }
  
  console.log('\n✅ Search links added');
  console.log('\n📝 Note: These show as "Search Retailer" with no price');
  console.log('   Users must verify actual prices on retailer sites');
}

addSearchLinksOnly().catch(console.error);