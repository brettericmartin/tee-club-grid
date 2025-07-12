import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  url: 'https://www.2ndswing.com/golf-clubs/drivers',
  maxProducts: 50,
  delayBetweenRequests: 1500,
  retryAttempts: 3,
  headless: true // Set to false to see browser
};

// Helper to create slug from text
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Helper to extract year from model name
function extractYear(modelName) {
  const yearMatch = modelName.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? parseInt(yearMatch[0]) : null;
}

// Helper to parse price
function parsePrice(priceText) {
  const match = priceText.match(/[\d,]+\.?\d*/);
  return match ? parseFloat(match[0].replace(/,/g, '')) : null;
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeProductDetails(page, productUrl) {
  let retries = CONFIG.retryAttempts;
  
  while (retries > 0) {
    try {
      await page.goto(productUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait for product details
      await page.waitForSelector('.product-detail', { timeout: 10000 });
      
      // Extract detailed information
      const productData = await page.evaluate(() => {
        const data = {};
        
        // Brand and model
        data.brand = document.querySelector('.product-brand')?.textContent?.trim() || '';
        data.model = document.querySelector('.product-name')?.textContent?.trim() || '';
        
        // Price
        const priceEl = document.querySelector('.product-price, .price-now');
        data.priceText = priceEl?.textContent?.trim() || '';
        
        // Condition
        data.condition = document.querySelector('.condition-label')?.textContent?.trim() || 'Used';
        
        // Main image
        const mainImage = document.querySelector('.product-image img, .main-image img');
        data.image_url = mainImage?.src || mainImage?.dataset?.src || '';
        
        // Specifications
        const specs = {};
        
        // Loft options
        const loftElements = document.querySelectorAll('.loft-option, .attribute-loft option');
        specs.loft_options = Array.from(loftElements)
          .map(el => el.textContent.trim())
          .filter(text => text && text !== 'Select Loft');
          
        // Shaft options  
        const shaftElements = document.querySelectorAll('.shaft-option, .attribute-shaft option');
        specs.shaft_options = Array.from(shaftElements)
          .map(el => el.textContent.trim())
          .filter(text => text && text !== 'Select Shaft');
          
        // If no options found, try to extract from description
        const description = document.querySelector('.product-description')?.textContent || '';
        if (specs.loft_options.length === 0 && description.includes('°')) {
          const loftMatches = description.match(/\d+\.?\d*°/g);
          if (loftMatches) {
            specs.loft_options = loftMatches;
          }
        }
        
        data.specifications = specs;
        data.product_url = window.location.href;
        
        return data;
      });
      
      // Process extracted data
      const year = extractYear(productData.model);
      const price = parsePrice(productData.priceText);
      
      return {
        brand: productData.brand,
        model: productData.model,
        category: 'driver',
        release_year: year,
        msrp: price, // Using current price as MSRP for now
        image_url: productData.image_url,
        specifications: productData.specifications,
        condition: productData.condition,
        product_url: productData.product_url
      };
      
    } catch (error) {
      console.error(`Error scraping ${productUrl}:`, error.message);
      retries--;
      if (retries > 0) {
        console.log(`Retrying... (${retries} attempts left)`);
        await delay(2000);
      }
    }
  }
  
  return null;
}

async function scrapeEquipment() {
  console.log('🏌️ Starting 2nd Swing equipment scraper...\n');
  
  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const errorLog = [];
  const scrapedProducts = [];
  
  try {
    const page = await browser.newPage();
    
    // Navigate to drivers page
    console.log('📍 Loading 2nd Swing drivers page...');
    await page.goto(CONFIG.url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for products to load
    await page.waitForSelector('.product-card', { timeout: 10000 });
    
    // Get all product links
    const productLinks = await page.evaluate(() => {
      const cards = document.querySelectorAll('.product-card a');
      return Array.from(cards)
        .map(link => link.href)
        .filter(href => href.includes('/golf-clubs/'));
    });
    
    console.log(`📊 Found ${productLinks.length} products\n`);
    
    const totalToScrape = Math.min(productLinks.length, CONFIG.maxProducts);
    
    // Scrape each product
    for (let i = 0; i < totalToScrape; i++) {
      const url = productLinks[i];
      console.log(`Scraping ${i + 1}/${totalToScrape}...`);
      
      const productData = await scrapeProductDetails(page, url);
      
      if (productData) {
        scrapedProducts.push(productData);
        console.log(`✅ Scraped: ${productData.brand} ${productData.model}`);
      } else {
        errorLog.push({
          url,
          error: 'Failed to extract product data',
          timestamp: new Date().toISOString()
        });
        console.log(`❌ Failed to scrape: ${url}`);
      }
      
      // Delay between requests
      if (i < totalToScrape - 1) {
        await delay(CONFIG.delayBetweenRequests);
      }
      
      // Save progress every 10 products
      if ((i + 1) % 10 === 0) {
        await saveProgress(scrapedProducts, errorLog);
      }
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    errorLog.push({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    await browser.close();
    
    // Save final results
    await saveProgress(scrapedProducts, errorLog);
    
    console.log('\n📊 Scraping complete!');
    console.log(`✅ Successfully scraped: ${scrapedProducts.length} products`);
    console.log(`❌ Errors: ${errorLog.length}`);
  }
}

async function saveProgress(products, errors) {
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
      errors.map(e => JSON.stringify(e)).join('\n')
    );
  }
}

// Run the scraper
scrapeEquipment().catch(console.error);