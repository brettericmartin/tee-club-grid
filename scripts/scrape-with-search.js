#!/usr/bin/env node

import { supabase } from './supabase-admin.js';
import fetch from 'node-fetch';

const FIRECRAWL_API_KEY = 'fc-5bfd19a22c03445092efedc3ef1c403a';

/**
 * Use Firecrawl's search/crawl API to find and scrape product prices
 */
async function searchAndScrape(query, domain) {
  console.log(`  🔍 Searching ${domain} for: ${query}`);
  
  try {
    // First, search the site
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        domain: domain,
        limit: 3,
        formats: ['markdown']
      })
    });

    if (!searchResponse.ok) {
      if (searchResponse.status === 402) {
        console.log(`    ⚠️  Search API requires higher tier plan`);
        return null;
      }
      console.log(`    ❌ Search failed: ${searchResponse.status}`);
      return null;
    }

    const searchData = await searchResponse.json();
    
    if (searchData.data && searchData.data.length > 0) {
      // Extract prices from search results
      const prices = [];
      
      for (const result of searchData.data) {
        const price = extractPriceFromText(result.markdown || result.content || '');
        if (price) {
          prices.push({
            price,
            url: result.url,
            title: result.title
          });
        }
      }
      
      return prices;
    }
  } catch (error) {
    console.error(`    ❌ Error:`, error.message);
  }
  
  return null;
}

/**
 * Fallback: Scrape search page directly
 */
async function scrapeSearchPage(equipment, retailerConfig) {
  const searchUrl = retailerConfig.buildUrl(equipment.brand, equipment.model);
  console.log(`  📡 Scraping search: ${searchUrl.substring(0, 60)}...`);
  
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: searchUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.success && data.data) {
      const price = extractProductPrice(data.data.markdown, equipment.model);
      return price;
    }
  } catch (error) {
    console.error(`    ❌ Scrape error:`, error.message);
  }
  
  return null;
}

/**
 * Extract price from text with better filtering
 */
function extractProductPrice(text, productModel) {
  if (!text) return null;
  
  // Look for the product model in context
  const modelIndex = text.toLowerCase().indexOf(productModel.toLowerCase());
  let relevantText = text;
  
  if (modelIndex > -1) {
    // Get text around the product mention (500 chars before and after)
    relevantText = text.substring(Math.max(0, modelIndex - 500), modelIndex + 1000);
  }
  
  // Price patterns
  const priceMatches = relevantText.match(/\$(\d{2,4}(?:\.\d{2})?)/g) || [];
  
  const prices = priceMatches.map(p => {
    const num = parseFloat(p.replace('$', ''));
    return num;
  }).filter(p => p >= 50 && p <= 2000); // Golf equipment price range
  
  // Return the first reasonable price
  if (prices.length > 0) {
    console.log(`    💰 Found prices: ${prices.map(p => '$' + p).join(', ')}`);
    return prices[0];
  }
  
  return null;
}

function extractPriceFromText(text) {
  const priceMatch = text.match(/\$(\d{2,4}(?:\.\d{2})?)/);
  if (priceMatch) {
    return parseFloat(priceMatch[1]);
  }
  return null;
}

/**
 * Retailer configurations
 */
const RETAILERS = [
  {
    name: 'TaylorMade Direct',
    domain: 'taylormade.com',
    buildUrl: (brand, model) => {
      if (!brand.toLowerCase().includes('taylormade')) return null;
      return `https://www.taylormade.com/search?q=${encodeURIComponent(model)}`;
    }
  },
  {
    name: 'Callaway Direct',
    domain: 'callawaygolf.com',
    buildUrl: (brand, model) => {
      if (!brand.toLowerCase().includes('callaway')) return null;
      return `https://www.callawaygolf.com/search/?q=${encodeURIComponent(model)}`;
    }
  },
  {
    name: 'Titleist Direct',
    domain: 'titleist.com',
    buildUrl: (brand, model) => {
      if (!brand.toLowerCase().includes('titleist')) return null;
      return `https://www.titleist.com/search?q=${encodeURIComponent(model)}`;
    }
  },
  {
    name: '2nd Swing Golf',
    domain: '2ndswing.com',
    buildUrl: (brand, model) => 
      `https://www.2ndswing.com/search/?searchTerm=${encodeURIComponent(brand + ' ' + model)}`
  },
  {
    name: 'Golf Galaxy',
    domain: 'golfgalaxy.com',
    buildUrl: (brand, model) => 
      `https://www.golfgalaxy.com/search?searchTerm=${encodeURIComponent(brand + ' ' + model)}`
  }
];

async function main() {
  console.log('🚀 Smart Equipment Price Scraper\n');
  
  // Get equipment to price
  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .in('brand', ['TaylorMade', 'Callaway', 'Titleist', 'Ping'])
    .in('category', ['driver', 'iron', 'putter'])
    .limit(2);
  
  if (!equipment || equipment.length === 0) {
    console.log('No equipment found');
    return;
  }
  
  for (const item of equipment) {
    console.log(`\n📦 ${item.brand} ${item.model}`);
    
    for (const retailer of RETAILERS) {
      // Skip if not the right brand for direct sites
      if (retailer.buildUrl(item.brand, item.model) === null) {
        continue;
      }
      
      console.log(`\n  🏪 ${retailer.name}`);
      
      // Try to scrape
      const price = await scrapeSearchPage(item, retailer);
      
      if (price) {
        console.log(`    ✅ Price: $${price}`);
        
        // Save to database
        await supabase
          .from('equipment_prices')
          .upsert({
            equipment_id: item.id,
            retailer: retailer.name,
            price: price,
            url: retailer.buildUrl(item.brand, item.model),
            in_stock: true
          });
      } else {
        console.log(`    ⚠️  No price found`);
      }
      
      // Rate limit
      await new Promise(r => setTimeout(r, 4000));
    }
  }
  
  // Summary
  const { count } = await supabase
    .from('equipment_prices')
    .select('*', { count: 'exact', head: true });
    
  console.log(`\n\n✅ Complete! Total prices: ${count}`);
}

main().catch(console.error);