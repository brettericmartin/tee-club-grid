import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Equipment Scraper for Teed.club
 * 
 * This scraper can be adapted to collect golf equipment data from various sources.
 * Currently configured to work with common golf retailer sites.
 */

// Category mapping to our standardized categories
const CATEGORY_MAP = {
  'drivers': 'driver',
  'fairway': 'fairway_wood',
  'fairway woods': 'fairway_wood',
  'hybrids': 'hybrid',
  'utility': 'hybrid',
  'irons': 'iron',
  'iron sets': 'iron',
  'wedges': 'wedge',
  'putters': 'putter',
  'balls': 'balls',
  'golf balls': 'balls',
  'gloves': 'gloves',
  'bags': 'bags',
  'golf bags': 'bags',
  'rangefinders': 'accessories',
  'gps': 'accessories'
};

// Scraper configurations for different sites
const SCRAPERS = {
  // Example scraper for a hypothetical golf retailer
  golfRetailer: {
    baseUrl: 'https://example-golf-retailer.com',
    selectors: {
      productList: '.product-grid .product-item',
      name: '.product-name',
      brand: '.product-brand',
      price: '.product-price',
      image: '.product-image img',
      category: '.product-category',
      specs: '.product-specs li'
    },
    async scrapeProductList(page, category) {
      await page.goto(`${this.baseUrl}/golf-clubs/${category}`);
      await page.waitForSelector(this.selectors.productList);
      
      return await page.evaluate((selectors) => {
        const products = [];
        document.querySelectorAll(selectors.productList).forEach(item => {
          const name = item.querySelector(selectors.name)?.textContent?.trim();
          const brand = item.querySelector(selectors.brand)?.textContent?.trim();
          const priceText = item.querySelector(selectors.price)?.textContent?.trim();
          const image = item.querySelector(selectors.image)?.src;
          
          if (name && brand) {
            products.push({
              name,
              brand,
              price: parseFloat(priceText?.replace(/[^0-9.]/g, '') || '0'),
              image_url: image,
              source_url: item.querySelector('a')?.href
            });
          }
        });
        return products;
      }, this.selectors);
    }
  },

  // TaylorMade official site scraper
  taylormade: {
    baseUrl: 'https://www.taylormadegolf.com',
    async scrapeProducts(page, category) {
      // Navigate to category page
      await page.goto(`${this.baseUrl}/${category}.html`);
      
      // Wait for products to load
      await page.waitForSelector('.product-item', { timeout: 10000 });
      
      // Extract product data
      return await page.evaluate(() => {
        const products = [];
        document.querySelectorAll('.product-item').forEach(item => {
          const name = item.querySelector('.product-name')?.textContent?.trim();
          const priceEl = item.querySelector('.price');
          const imageEl = item.querySelector('.product-image img');
          
          if (name) {
            products.push({
              brand: 'TaylorMade',
              model: name.replace('TaylorMade', '').trim(),
              msrp: parseFloat(priceEl?.textContent?.replace(/[^0-9.]/g, '') || '0'),
              image_url: imageEl?.src,
              source_url: item.querySelector('a')?.href
            });
          }
        });
        return products;
      });
    }
  },

  // Callaway scraper
  callaway: {
    baseUrl: 'https://www.callawaygolf.com',
    async scrapeProducts(page, category) {
      await page.goto(`${this.baseUrl}/golf-clubs/${category}/`);
      await page.waitForSelector('.product-tile');
      
      return await page.evaluate(() => {
        const products = [];
        document.querySelectorAll('.product-tile').forEach(tile => {
          const name = tile.querySelector('.product-name')?.textContent?.trim();
          const price = tile.querySelector('.product-price')?.textContent?.trim();
          const image = tile.querySelector('.product-image img')?.src;
          
          if (name) {
            products.push({
              brand: 'Callaway',
              model: name,
              msrp: parseFloat(price?.replace(/[^0-9.]/g, '') || '0'),
              image_url: image
            });
          }
        });
        return products;
      });
    }
  }
};

// Main scraping function
async function scrapeEquipment(scraperName, categories) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const scraper = SCRAPERS[scraperName];
  if (!scraper) {
    console.error(`Scraper '${scraperName}' not found`);
    return;
  }

  const allProducts = [];

  try {
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    for (const category of categories) {
      console.log(`Scraping ${category} from ${scraperName}...`);
      
      try {
        const products = await scraper.scrapeProducts(page, category);
        
        // Add category to each product
        products.forEach(product => {
          product.category = CATEGORY_MAP[category] || category;
          product.scraped_from = scraperName;
          product.scraped_at = new Date().toISOString();
        });
        
        allProducts.push(...products);
        console.log(`Found ${products.length} ${category}`);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error scraping ${category}:`, error.message);
      }
    }
  } finally {
    await browser.close();
  }

  return allProducts;
}

// Insert equipment into Supabase
async function insertEquipment(equipment) {
  console.log(`\nInserting ${equipment.length} items into database...`);
  
  // Remove duplicates based on brand + model
  const uniqueEquipment = equipment.reduce((acc, item) => {
    const key = `${item.brand}-${item.model}`;
    if (!acc.has(key)) {
      acc.set(key, item);
    }
    return acc;
  }, new Map());

  const items = Array.from(uniqueEquipment.values());
  
  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('equipment')
      .upsert(batch.map(item => ({
        brand: item.brand,
        model: item.model,
        category: item.category,
        msrp: item.msrp || 0,
        image_url: item.image_url,
        specs: item.specs || {},
        release_date: item.release_date || new Date().toISOString(),
        popularity_score: Math.floor(Math.random() * 100), // Random for now
        created_at: new Date().toISOString()
      })), {
        onConflict: 'brand,model', // Prevent duplicates
        ignoreDuplicates: true
      });
    
    if (error) {
      console.error('Error inserting batch:', error);
    } else {
      inserted += batch.length;
      console.log(`Inserted batch ${Math.floor(i/batchSize) + 1}`);
    }
  }
  
  console.log(`\nSuccessfully inserted ${inserted} equipment items!`);
}

// Example usage
async function main() {
  console.log('Starting equipment scraper...\n');
  
  // Example: Scrape TaylorMade drivers and irons
  const equipment = await scrapeEquipment('taylormade', ['drivers', 'irons']);
  
  if (equipment && equipment.length > 0) {
    await insertEquipment(equipment);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { scrapeEquipment, insertEquipment };