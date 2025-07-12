import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: 'https://www.2ndswing.com',
  categories: {
    drivers: '/golf-clubs/drivers',
    fairway_woods: '/golf-clubs/fairway-woods',
    hybrids: '/golf-clubs/hybrids',
    irons: '/golf-clubs/iron-sets',
    wedges: '/golf-clubs/wedges',
    putters: '/golf-clubs/putters'
  },
  maxProductsPerCategory: 20,
  delayBetweenRequests: 2000,
  headless: true,
  timeout: 30000
};

// Helper functions
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function extractYear(text) {
  const yearMatch = text.match(/\b(20\d{2} < /dev/null | 19\d{2})\b/);
  return yearMatch ? parseInt(yearMatch[0]) : null;
}

function parsePrice(priceText) {
  const cleanPrice = priceText.replace(/[^0-9.]/g, '');
  return cleanPrice ? parseFloat(cleanPrice) : null;
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if(totalHeight >= scrollHeight){
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

async function scrapeCategoryPage(page, category, url) {
  console.log(`\n📍 Scraping ${category}...`);
  
  try {
    await page.goto(CONFIG.baseUrl + url, {
      waitUntil: 'networkidle2',
      timeout: CONFIG.timeout
    });
    
    // Wait for initial load
    await delay(2000);
    
    // Scroll to load more products
    await autoScroll(page);
    
    // Wait for products to render
    await page.waitForSelector('[data-testid="product-card"], .product-item, .product-listing', { 
      timeout: 10000 
    });
    
    // Extract product data
    const products = await page.evaluate((cat) => {
      const productCards = document.querySelectorAll('[data-testid="product-card"], .product-item, .product-listing');
      const extractedProducts = [];
      
      productCards.forEach(card => {
        try {
          // Try multiple selectors for brand
          const brandEl = card.querySelector('.product-brand, .brand, [data-testid="product-brand"]');
          const brand = brandEl?.textContent?.trim() || '';
          
          // Try multiple selectors for model
          const modelEl = card.querySelector('.product-model, .model, .product-name, [data-testid="product-name"]');
          const model = modelEl?.textContent?.trim() || '';
          
          // Try multiple selectors for price
          const priceEl = card.querySelector('.price, .product-price, [data-testid="product-price"]');
          const priceText = priceEl?.textContent?.trim() || '';
          
          // Try multiple selectors for image
          const imgEl = card.querySelector('img');
          let imageUrl = imgEl?.src || imgEl?.dataset?.src || '';
          
          // Handle relative URLs
          if (imageUrl && \!imageUrl.startsWith('http')) {
            imageUrl = new URL(imageUrl, window.location.origin).href;
          }
          
          // Try to get product link
          const linkEl = card.querySelector('a');
          const productUrl = linkEl?.href || '';
          
          if (brand || model) {
            extractedProducts.push({
              brand,
              model,
              category: cat,
              priceText,
              image_url: imageUrl,
              product_url: productUrl
            });
          }
        } catch (e) {
          console.error('Error extracting product:', e);
        }
      });
      
      return extractedProducts;
    }, category);
    
    console.log(`✅ Found ${products.length} ${category}`);
    
    // Process and enrich data
    const processedProducts = products.slice(0, CONFIG.maxProductsPerCategory).map(product => {
      const year = extractYear(product.model);
      const price = parsePrice(product.priceText);
      
      return {
        brand: product.brand,
        model: product.model,
        category: category,
        release_year: year,
        msrp: price,
        current_price: price,
        image_url: product.image_url,
        product_url: product.product_url,
        source: '2ndswing',
        scraped_at: new Date().toISOString()
      };
    });
    
    return processedProducts;
    
  } catch (error) {
    console.error(`❌ Error scraping ${category}:`, error.message);
    return [];
  }
}

async function scrapeAll() {
  console.log('🏌️ Starting 2nd Swing comprehensive scraper...\n');
  console.log('Categories to scrape:', Object.keys(CONFIG.categories).join(', '));
  
  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const allProducts = [];
  const errors = [];
  
  try {
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Scrape each category
    for (const [category, url] of Object.entries(CONFIG.categories)) {
      try {
        const products = await scrapeCategoryPage(page, category, url);
        allProducts.push(...products);
        
        // Save progress after each category
        await saveData(allProducts, errors);
        
        // Delay between categories
        if (category \!== Object.keys(CONFIG.categories).pop()) {
          console.log(`⏳ Waiting ${CONFIG.delayBetweenRequests}ms before next category...`);
          await delay(CONFIG.delayBetweenRequests);
        }
      } catch (error) {
        errors.push({
          category,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    errors.push({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    await browser.close();
    
    // Save final results
    await saveData(allProducts, errors);
    
    console.log('\n📊 Scraping Summary:');
    console.log(`✅ Total products scraped: ${allProducts.length}`);
    
    // Count by category
    const categoryCounts = {};
    allProducts.forEach(p => {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    });
    
    console.log('\nProducts by category:');
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
    
    if (errors.length > 0) {
      console.log(`\n❌ Errors encountered: ${errors.length}`);
    }
  }
}

async function saveData(products, errors) {
  const dataDir = path.join(path.dirname(__dirname), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  
  // Save products
  const productsPath = path.join(dataDir, 'scraped-equipment.json');
  await fs.writeFile(
    productsPath,
    JSON.stringify(products, null, 2)
  );
  
  // Save errors if any
  if (errors.length > 0) {
    const errorsPath = path.join(dataDir, 'scrape-errors.log');
    await fs.writeFile(
      errorsPath,
      JSON.stringify(errors, null, 2)
    );
  }
}

// Run the scraper
scrapeAll().catch(console.error);
