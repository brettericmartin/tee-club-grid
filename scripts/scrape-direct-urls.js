#!/usr/bin/env node

import { supabase } from './supabase-admin.js';
import fetch from 'node-fetch';

const FIRECRAWL_API_KEY = 'fc-5bfd19a22c03445092efedc3ef1c403a';
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

/**
 * Direct product URLs for testing
 * These are actual product pages with known prices
 */
const DIRECT_PRODUCT_URLS = [
  {
    equipment: 'TaylorMade Qi10 Max Driver',
    urls: [
      {
        retailer: 'TaylorMade Direct',
        url: 'https://www.taylormade.com/Qi10-Max-Driver/DW-TA093.html',
        expectedPrice: 599.99
      },
      {
        retailer: 'PGA Tour Superstore',
        url: 'https://www.pgatoursuperstore.com/qi10-max-driver/2000000027328.html',
        expectedPrice: 599.99
      }
    ]
  },
  {
    equipment: 'Titleist Pro V1 Golf Balls',
    urls: [
      {
        retailer: 'Titleist Direct',
        url: 'https://www.titleist.com/golf-balls/pro-v1',
        expectedPrice: 54.99
      },
      {
        retailer: 'Amazon',
        url: 'https://www.amazon.com/Titleist-Golf-Balls-White-Dozen/dp/B0BN6V9YZW',
        expectedPrice: 54.99
      }
    ]
  }
];

async function firecrawlScrape(url) {
  console.log(`    🌐 Scraping: ${url}`);
  
  try {
    const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000 // Wait for JS to render
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`    ❌ API Error: ${response.status} - ${error}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('    ❌ Firecrawl error:', error.message);
    return null;
  }
}

function extractPriceFromContent(content) {
  if (!content || !content.data) return null;
  
  const text = content.data.markdown || '';
  
  // More specific price patterns
  const patterns = [
    /\$(\d{1,4}(?:\.\d{2})?)(?:\s|$)/g,     // $599.99
    /\$(\d{1,4}(?:,\d{3})?(?:\.\d{2})?)/g,   // $1,299.99
    /Price[:\s]+\$(\d+(?:\.\d{2})?)/gi,      // Price: $299.99
    /MSRP[:\s]+\$(\d+(?:\.\d{2})?)/gi,       // MSRP: $299.99
  ];

  const prices = new Set();
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (price >= 10 && price <= 5000) {
        prices.add(price);
      }
    }
  }

  const priceArray = Array.from(prices).sort((a, b) => b - a);
  
  // Log all found prices for debugging
  if (priceArray.length > 0) {
    console.log(`    💵 Found prices: ${priceArray.map(p => '$' + p).join(', ')}`);
  }
  
  // Return the highest reasonable price (usually the main product price)
  return priceArray.find(p => p > 30) || priceArray[0] || null;
}

async function scrapeDirectUrls() {
  console.log('🎯 Scraping direct product URLs with Firecrawl\n');
  
  for (const product of DIRECT_PRODUCT_URLS) {
    console.log(`\n📦 ${product.equipment}`);
    
    // First, find or create the equipment in database
    const { data: equipment } = await supabase
      .from('equipment')
      .select('id')
      .or(`model.ilike.%${product.equipment.split(' ').slice(-2).join(' ')}%`)
      .limit(1)
      .single();
    
    if (!equipment) {
      console.log('  ⚠️  Equipment not found in database, skipping...');
      continue;
    }
    
    for (const retailerData of product.urls) {
      console.log(`  \n  🏪 ${retailerData.retailer}`);
      
      const scraped = await firecrawlScrape(retailerData.url);
      
      if (scraped && scraped.success) {
        const price = extractPriceFromContent(scraped);
        
        if (price) {
          console.log(`    ✅ Extracted price: $${price}`);
          
          if (retailerData.expectedPrice) {
            const diff = Math.abs(price - retailerData.expectedPrice);
            if (diff > 50) {
              console.log(`    ⚠️  Warning: Price differs from expected by $${diff.toFixed(2)}`);
            }
          }
          
          // Save to database
          const { error } = await supabase
            .from('equipment_prices')
            .upsert({
              equipment_id: equipment.id,
              retailer: retailerData.retailer,
              price: price,
              url: retailerData.url,
              in_stock: true
            });
          
          if (error) {
            console.error(`    ❌ Database error:`, error.message);
          } else {
            console.log(`    💾 Saved to database`);
          }
        } else {
          console.log(`    ⚠️  No price found in content`);
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Summary
  const { count } = await supabase
    .from('equipment_prices')
    .select('*', { count: 'exact', head: true });
    
  console.log(`\n\n📊 Total prices in database: ${count}`);
}

scrapeDirectUrls().catch(console.error);