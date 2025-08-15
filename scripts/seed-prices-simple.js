#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

/**
 * Seed equipment prices using the existing simple schema
 */

async function seedPrices() {
  console.log('🌱 Seeding equipment prices with existing schema...\n');

  // Get some equipment to price
  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .in('category', ['driver', 'iron', 'putter', 'wedge', 'fairway_wood'])
    .limit(10);

  if (error || !equipment?.length) {
    console.error('Could not fetch equipment:', error);
    return;
  }

  console.log(`Found ${equipment.length} equipment items\n`);

  const prices = [];
  
  for (const item of equipment) {
    console.log(`💰 Creating prices for: ${item.brand} ${item.model}`);
    
    const basePrice = getBasePrice(item.category);
    
    // Create prices for different retailers
    const retailers = [
      { 
        name: 'PGA Tour Superstore', 
        price: basePrice * 0.95,
        inStock: true 
      },
      { 
        name: 'Amazon', 
        price: basePrice * 1.02,
        inStock: true 
      },
      { 
        name: '2nd Swing Golf - New', 
        price: basePrice * 0.98,
        inStock: true 
      },
      { 
        name: '2nd Swing Golf - Used Excellent', 
        price: basePrice * 0.75,
        inStock: true 
      },
      { 
        name: '2nd Swing Golf - Used Good', 
        price: basePrice * 0.60,
        inStock: true 
      },
      { 
        name: 'Golf Galaxy', 
        price: basePrice * 0.97,
        inStock: Math.random() > 0.3 
      },
      { 
        name: 'TGW', 
        price: basePrice * 0.93,
        inStock: true 
      }
    ];

    // Add brand-specific retailers
    if (item.brand.toLowerCase().includes('taylormade')) {
      retailers.push({
        name: 'TaylorMade Direct',
        price: basePrice,
        inStock: true
      });
    } else if (item.brand.toLowerCase().includes('callaway')) {
      retailers.push({
        name: 'Callaway Direct',
        price: basePrice * 0.98,
        inStock: true
      });
    } else if (item.brand.toLowerCase().includes('titleist')) {
      retailers.push({
        name: 'Titleist Direct',
        price: basePrice,
        inStock: true
      });
    } else if (item.brand.toLowerCase().includes('ping')) {
      retailers.push({
        name: 'Ping Direct',
        price: basePrice,
        inStock: true
      });
    }

    for (const retailer of retailers) {
      prices.push({
        equipment_id: item.id,
        retailer: retailer.name,
        price: Math.round(retailer.price * 100) / 100,
        url: generateUrl(retailer.name, item.brand, item.model),
        in_stock: retailer.inStock
      });
    }
  }

  // Delete existing prices for these equipment items
  console.log('\n🧹 Clearing existing prices...');
  const equipmentIds = equipment.map(e => e.id);
  await supabase
    .from('equipment_prices')
    .delete()
    .in('equipment_id', equipmentIds);

  // Insert new prices
  console.log(`\n📝 Inserting ${prices.length} price records...`);
  
  // Insert in batches of 50
  const batchSize = 50;
  for (let i = 0; i < prices.length; i += batchSize) {
    const batch = prices.slice(i, i + batchSize);
    const { error } = await supabase
      .from('equipment_prices')
      .insert(batch);
    
    if (error) {
      console.error('Error inserting batch:', error.message);
    } else {
      console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(prices.length/batchSize)}`);
    }
  }

  // Show summary
  const { count } = await supabase
    .from('equipment_prices')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total prices in database: ${count}`);
  
  // Show sample of prices for first equipment
  if (equipment[0]) {
    const { data: samplePrices } = await supabase
      .from('equipment_prices')
      .select('*')
      .eq('equipment_id', equipment[0].id)
      .order('price', { ascending: true });

    if (samplePrices?.length) {
      console.log(`\n💎 Sample prices for ${equipment[0].brand} ${equipment[0].model}:`);
      samplePrices.forEach(p => {
        const stockStatus = p.in_stock ? '✅' : '❌';
        console.log(`   ${stockStatus} ${p.retailer}: $${p.price}`);
      });
    }
  }
}

function getBasePrice(category) {
  const prices = {
    driver: 599.99,
    fairway_wood: 399.99,
    hybrid: 299.99,
    iron: 999.99,
    wedge: 179.99,
    putter: 399.99,
    ball: 49.99,
    bag: 299.99
  };
  return prices[category] || 299.99;
}

function generateUrl(retailer, brand, model) {
  const slug = `${brand}-${model}`.toLowerCase().replace(/\s+/g, '-');
  
  const urls = {
    'PGA Tour Superstore': `https://www.pgatoursuperstore.com/search?q=${encodeURIComponent(brand + ' ' + model)}`,
    'Amazon': `https://www.amazon.com/s?k=${encodeURIComponent(brand + ' ' + model + ' golf')}`,
    '2nd Swing Golf - New': `https://www.2ndswing.com/search/?q=${encodeURIComponent(brand + ' ' + model)}`,
    '2nd Swing Golf - Used Excellent': `https://www.2ndswing.com/search/?q=${encodeURIComponent(brand + ' ' + model)}&condition=excellent`,
    '2nd Swing Golf - Used Good': `https://www.2ndswing.com/search/?q=${encodeURIComponent(brand + ' ' + model)}&condition=good`,
    'Golf Galaxy': `https://www.golfgalaxy.com/search?searchTerm=${encodeURIComponent(brand + ' ' + model)}`,
    'TGW': `https://www.tgw.com/search?q=${encodeURIComponent(brand + ' ' + model)}`,
    'TaylorMade Direct': `https://www.taylormade.com/${slug}.html`,
    'Callaway Direct': `https://www.callawaygolf.com/${slug}/`,
    'Titleist Direct': `https://www.titleist.com/${slug}`,
    'Ping Direct': `https://ping.com/${slug}`
  };
  
  return urls[retailer] || `https://google.com/search?q=${encodeURIComponent(brand + ' ' + model + ' golf')}`;
}

seedPrices().catch(console.error);