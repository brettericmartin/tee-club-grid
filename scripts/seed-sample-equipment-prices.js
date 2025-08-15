#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

/**
 * Seed sample equipment prices for testing
 * This creates realistic price data for demonstration purposes
 */

async function seedSamplePrices() {
  console.log('🌱 Seeding sample equipment prices...\n');

  // First, get some equipment to add prices for
  const { data: equipment, error: equipmentError } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .in('category', ['driver', 'iron', 'putter', 'wedge'])
    .limit(5);

  if (equipmentError || !equipment?.length) {
    console.error('❌ Could not fetch equipment:', equipmentError);
    return;
  }

  console.log(`Found ${equipment.length} equipment items to price\n`);

  const samplePrices = [];

  for (const item of equipment) {
    console.log(`💰 Creating prices for: ${item.brand} ${item.model}`);

    // Generate realistic prices based on category
    const basePrice = getBasePrice(item.category);
    
    // PGA Tour Superstore - usually competitive
    samplePrices.push({
      equipment_id: item.id,
      retailer: 'pga-superstore',
      retailer_logo_url: '/images/retailers/pga-superstore.png',
      price: basePrice,
      sale_price: basePrice * 0.85, // 15% off sale
      currency: 'USD',
      url: `https://www.pgatoursuperstore.com/search?q=${encodeURIComponent(item.brand + ' ' + item.model)}`,
      in_stock: true,
      condition: 'new',
      shipping_cost: 0, // Free shipping
      // availability_text: 'Ships in 1-2 business days',
      is_active: true,
      scraped_data: {
        originalPrice: basePrice,
        discount: '15% off',
        promotion: 'Summer Sale'
      }
    });

    // Amazon - varies in pricing
    samplePrices.push({
      equipment_id: item.id,
      retailer: 'amazon',
      retailer_logo_url: '/images/retailers/amazon.png',
      price: basePrice * 1.05, // Slightly higher
      sale_price: null,
      currency: 'USD',
      url: `https://www.amazon.com/s?k=${encodeURIComponent(item.brand + ' ' + item.model + ' golf')}`,
      in_stock: true,
      condition: 'new',
      shipping_cost: 0, // Prime shipping
      // availability_text: 'Prime 2-Day Shipping',
      is_active: true,
      scraped_data: {
        isPrime: true,
        seller: 'Amazon.com',
        rating: 4.5,
        reviewCount: 127
      }
    });

    // 2nd Swing - Multiple conditions
    // New
    samplePrices.push({
      equipment_id: item.id,
      retailer: '2nd-swing',
      retailer_logo_url: '/images/retailers/2nd-swing.png',
      price: basePrice * 0.95,
      sale_price: null,
      currency: 'USD',
      url: `https://www.2ndswing.com/search/?q=${encodeURIComponent(item.brand + ' ' + item.model)}`,
      in_stock: true,
      condition: 'new',
      shipping_cost: 9.99,
      // availability_text: 'In Stock',
      is_active: true,
      scraped_data: {
        tradeInValue: basePrice * 0.4
      }
    });

    // Used - Excellent
    samplePrices.push({
      equipment_id: item.id,
      retailer: '2nd-swing',
      retailer_logo_url: '/images/retailers/2nd-swing.png',
      price: basePrice * 0.7,
      sale_price: null,
      currency: 'USD',
      url: `https://www.2ndswing.com/search/?q=${encodeURIComponent(item.brand + ' ' + item.model)}`,
      in_stock: true,
      condition: 'used-excellent',
      shipping_cost: 9.99,
      // availability_text: '3 in stock',
      is_active: true,
      scraped_data: {
        tradeInValue: basePrice * 0.35,
        condition_details: 'Minor wear on sole, excellent face'
      }
    });

    // Used - Good
    samplePrices.push({
      equipment_id: item.id,
      retailer: '2nd-swing',
      retailer_logo_url: '/images/retailers/2nd-swing.png',
      price: basePrice * 0.55,
      sale_price: null,
      currency: 'USD',
      url: `https://www.2ndswing.com/search/?q=${encodeURIComponent(item.brand + ' ' + item.model)}`,
      in_stock: true,
      condition: 'used-good',
      shipping_cost: 9.99,
      // availability_text: '5 in stock',
      is_active: true,
      scraped_data: {
        tradeInValue: basePrice * 0.25,
        condition_details: 'Normal play wear, some scratches'
      }
    });

    // Golf Galaxy
    samplePrices.push({
      equipment_id: item.id,
      retailer: 'golf-galaxy',
      retailer_logo_url: '/images/retailers/golf-galaxy.png',
      price: basePrice,
      sale_price: basePrice * 0.9, // 10% off
      currency: 'USD',
      url: `https://www.golfgalaxy.com/search?searchTerm=${encodeURIComponent(item.brand + ' ' + item.model)}`,
      in_stock: Math.random() > 0.3, // 70% chance in stock
      condition: 'new',
      shipping_cost: 0,
      // availability_text: 'Free shipping on orders over $49',
      is_active: true,
      scraped_data: {
        storePickup: true,
        locations: 5
      }
    });

    // TGW
    samplePrices.push({
      equipment_id: item.id,
      retailer: 'tgw',
      retailer_logo_url: '/images/retailers/tgw.png',
      price: basePrice * 0.92,
      sale_price: null,
      currency: 'USD',
      url: `https://www.tgw.com/search?q=${encodeURIComponent(item.brand + ' ' + item.model)}`,
      in_stock: true,
      condition: 'new',
      shipping_cost: 7.99,
      // availability_text: 'Ships same day if ordered by 2pm',
      is_active: true,
      scraped_data: {
        priceMatch: true,
        rewards: '5% back in TGW Bucks'
      }
    });

    // Brand direct (if applicable)
    if (item.brand.toLowerCase() === 'taylormade') {
      samplePrices.push({
        equipment_id: item.id,
        retailer: 'taylormade',
        retailer_logo_url: '/images/retailers/taylormade.png',
        price: basePrice, // MSRP
        sale_price: null,
        currency: 'USD',
        url: `https://www.taylormade.com/${item.model.toLowerCase().replace(/\s+/g, '-')}.html`,
        in_stock: true,
        condition: 'new',
        shipping_cost: 0,
        // availability_text: 'Customization available',
        is_active: true,
        scraped_data: {
          customOptions: true,
          buildTime: '5-7 business days'
        }
      });
    } else if (item.brand.toLowerCase() === 'callaway') {
      samplePrices.push({
        equipment_id: item.id,
        retailer: 'callaway',
        retailer_logo_url: '/images/retailers/callaway.png',
        price: basePrice,
        sale_price: basePrice * 0.88,
        currency: 'USD',
        url: `https://www.callawaygolf.com/${item.model.toLowerCase().replace(/\s+/g, '-')}/`,
        in_stock: true,
        condition: 'new',
        shipping_cost: 0,
        // availability_text: 'Pre-owned available',
        is_active: true,
        scraped_data: {
          preOwnedAvailable: true,
          customFitting: true
        }
      });
    }
  }

  // Insert all prices
  console.log(`\n📝 Inserting ${samplePrices.length} price records...`);

  for (const price of samplePrices) {
    const { error } = await supabase
      .from('equipment_prices')
      .upsert(price, {
        onConflict: 'equipment_id,retailer,condition'
      });

    if (error) {
      console.error(`❌ Error inserting price for ${price.retailer}:`, error.message);
    }
  }

  console.log('\n✅ Sample prices seeded successfully!');
  
  // Show summary
  const { data: summary } = await supabase
    .from('equipment_prices')
    .select('retailer, condition')
    .in('equipment_id', equipment.map(e => e.id));

  if (summary) {
    const retailerCounts = {};
    summary.forEach(row => {
      const key = `${row.retailer} (${row.condition})`;
      retailerCounts[key] = (retailerCounts[key] || 0) + 1;
    });

    console.log('\n📊 Summary:');
    Object.entries(retailerCounts).forEach(([key, count]) => {
      console.log(`   ${key}: ${count} items`);
    });
  }
}

/**
 * Get base price based on equipment category
 */
function getBasePrice(category) {
  const basePrices = {
    driver: 599.99,
    fairway_wood: 399.99,
    hybrid: 299.99,
    iron: 999.99, // For set
    wedge: 179.99,
    putter: 399.99,
    ball: 49.99, // Per dozen
    bag: 299.99,
    glove: 24.99,
    rangefinder: 399.99,
    gps: 299.99
  };

  return basePrices[category] || 199.99;
}

// Run the seeder
seedSamplePrices().catch(console.error);