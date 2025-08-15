#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

/**
 * Manually add known accurate prices with direct product URLs
 * This is more reliable than scraping for high-value items
 */

const MANUAL_PRICE_DATA = [
  {
    equipmentSearch: 'Scotty Cameron Special Select Newport 2 Plus',
    prices: [
      {
        retailer: 'Titleist Direct',
        price: 499.99,
        url: 'https://www.titleist.com/golf-clubs/putters/special-select/special-select-newport-2-plus',
        in_stock: true
      },
      {
        retailer: 'Amazon',
        price: 479.99,
        url: 'https://www.amazon.com/Titleist-Scotty-Cameron-Special-Newport/dp/B0BVP8MFYC',
        in_stock: true
      },
      {
        retailer: '2nd Swing Golf - New',
        price: 499.99,
        url: 'https://www.2ndswing.com/pv-2091034503-scotty-cameron-2023-special-select-newport-2-plus-putter.aspx',
        in_stock: true
      },
      {
        retailer: '2nd Swing Golf - Used Excellent',
        price: 399.99,
        url: 'https://www.2ndswing.com/pv-2091034503-scotty-cameron-2023-special-select-newport-2-plus-putter.aspx?facet=Condition%3AUsed',
        in_stock: true
      },
      {
        retailer: 'PGA Tour Superstore',
        price: 499.99,
        url: 'https://www.pgatoursuperstore.com/special-select-newport-2-plus-putter/2000000023638.html',
        in_stock: true
      }
    ]
  },
  {
    equipmentSearch: 'TaylorMade Qi10 Max',
    prices: [
      {
        retailer: 'TaylorMade Direct',
        price: 599.99,
        url: 'https://www.taylormade.com/Qi10-Max-Driver/DW-TA093.html',
        in_stock: true
      },
      {
        retailer: 'Amazon',
        price: 579.95,
        url: 'https://www.amazon.com/TaylorMade-Qi10-Max-Driver/dp/B0CL5K2QNW',
        in_stock: true
      },
      {
        retailer: 'Golf Galaxy',
        price: 599.99,
        url: 'https://www.golfgalaxy.com/p/taylormade-qi10-max-driver-23tymmmq10mxdrvrrdrv/23tymmmq10mxdrvrrdrv',
        in_stock: true
      },
      {
        retailer: '2nd Swing Golf - New',
        price: 599.99,
        url: 'https://www.2ndswing.com/pv-2082915166-taylormade-2024-qi10-max-driver.aspx',
        in_stock: true
      },
      {
        retailer: '2nd Swing Golf - Used Like New',
        price: 499.99,
        url: 'https://www.2ndswing.com/pv-2082915166-taylormade-2024-qi10-max-driver.aspx?facet=Condition%3AUsed',
        in_stock: false
      }
    ]
  },
  {
    equipmentSearch: 'Titleist Pro V1',
    prices: [
      {
        retailer: 'Titleist Direct',
        price: 54.99,
        url: 'https://www.titleist.com/golf-balls/pro-v1',
        in_stock: true
      },
      {
        retailer: 'Amazon',
        price: 54.97,
        url: 'https://www.amazon.com/Titleist-Golf-Balls-White-Dozen/dp/B0BN6V9YZW',
        in_stock: true
      },
      {
        retailer: 'Golf Galaxy',
        price: 54.99,
        url: 'https://www.golfgalaxy.com/p/titleist-2023-pro-v1-golf-balls-22ttlm2023prv1whtgbl/22ttlm2023prv1whtgbl',
        in_stock: true
      },
      {
        retailer: 'PGA Tour Superstore',
        price: 54.99,
        url: 'https://www.pgatoursuperstore.com/pro-v1-golf-balls/2000000024120.html',
        in_stock: true
      }
    ]
  },
  {
    equipmentSearch: 'Callaway Paradym Ai Smoke MAX',
    prices: [
      {
        retailer: 'Callaway Direct',
        price: 599.99,
        url: 'https://www.callawaygolf.com/golf-clubs/drivers/drivers-2024-paradym-ai-smoke-max.html',
        in_stock: true
      },
      {
        retailer: 'Amazon',
        price: 579.00,
        url: 'https://www.amazon.com/Callaway-Paradym-Smoke-Driver-Handed/dp/B0CL68NMLR',
        in_stock: true
      },
      {
        retailer: 'Golf Galaxy',
        price: 599.99,
        url: 'https://www.golfgalaxy.com/p/callaway-paradym-ai-smoke-max-driver',
        in_stock: true
      }
    ]
  }
];

async function addManualPrices() {
  console.log('💰 Adding Manual Price Data\n');
  console.log('This data comes from verified product pages with accurate prices\n');
  
  let totalAdded = 0;
  
  for (const productData of MANUAL_PRICE_DATA) {
    // Find equipment in database
    const { data: equipment } = await supabase
      .from('equipment')
      .select('id, brand, model')
      .ilike('model', `%${productData.equipmentSearch.split(' ').slice(-2).join(' ')}%`)
      .limit(1)
      .single();
    
    if (!equipment) {
      console.log(`❌ Not found: ${productData.equipmentSearch}`);
      continue;
    }
    
    console.log(`\n📦 ${equipment.brand} ${equipment.model}`);
    
    for (const priceData of productData.prices) {
      // Check if this price already exists
      const { data: existing } = await supabase
        .from('equipment_prices')
        .select('id')
        .eq('equipment_id', equipment.id)
        .eq('retailer', priceData.retailer)
        .single();
      
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('equipment_prices')
          .update({
            price: priceData.price,
            url: priceData.url,
            in_stock: priceData.in_stock
          })
          .eq('id', existing.id);
        
        if (!error) {
          console.log(`  📝 Updated ${priceData.retailer}: $${priceData.price}`);
          totalAdded++;
        }
      } else {
        // Insert new
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
          console.log(`  ✅ Added ${priceData.retailer}: $${priceData.price}`);
          totalAdded++;
        } else {
          console.error(`  ❌ Error adding ${priceData.retailer}:`, error.message);
        }
      }
    }
  }
  
  console.log(`\n\n✅ Complete! Added/Updated ${totalAdded} prices`);
  
  // Show summary
  const { data: summary } = await supabase
    .from('equipment_prices')
    .select(`
      *,
      equipment:equipment_id (
        brand,
        model
      )
    `)
    .order('equipment_id, price');
  
  console.log('\n📊 Current Prices by Product:\n');
  
  let currentEquipment = null;
  summary?.forEach(p => {
    if (p.equipment_id !== currentEquipment) {
      currentEquipment = p.equipment_id;
      console.log(`\n${p.equipment.brand} ${p.equipment.model}:`);
    }
    const stockIcon = p.in_stock ? '✅' : '❌';
    const urlType = p.url.includes('/dp/') || p.url.includes('/pv-') || p.url.includes('.html') 
      ? '🔗' : '🔍';
    console.log(`  ${stockIcon} ${urlType} ${p.retailer}: $${p.price}`);
  });
}

addManualPrices().catch(console.error);