import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for Golf Galaxy (more reliable for scraping)
const CONFIG = {
  baseUrl: 'https://www.golfgalaxy.com',
  categories: {
    drivers: '/c/golf-drivers',
    fairway_woods: '/c/golf-fairway-woods',
    hybrids: '/c/golf-hybrids',
    irons: '/c/golf-irons',
    wedges: '/c/golf-wedges',
    putters: '/c/golf-putters',
    balls: '/c/golf-balls'
  },
  maxProductsPerCategory: 15,
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
  const yearMatch = text.match(/\b(20\d{2}|19\d{2})\b/);
  return yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
}

function parsePrice(priceText) {
  const cleanPrice = priceText.replace(/[^0-9.]/g, '');
  return cleanPrice ? parseFloat(cleanPrice) : null;
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeCategoryPage(page, category, url) {
  console.log(`\n📍 Scraping ${category}...`);
  
  try {
    await page.goto(CONFIG.baseUrl + url, {
      waitUntil: 'networkidle2',
      timeout: CONFIG.timeout
    });
    
    // Wait for products to load
    await delay(3000);
    
    // Try to find products with various selectors
    const products = await page.evaluate((cat) => {
      const productSelectors = [
        '.ProductCard',
        '.product-card',
        '[data-testid="product-card"]',
        '.product-grid-item',
        '.product-item',
        'article[data-product]',
        '.s-result-item'
      ];
      
      let productCards = [];
      for (const selector of productSelectors) {
        productCards = document.querySelectorAll(selector);
        if (productCards.length > 0) break;
      }
      
      const extractedProducts = [];
      
      productCards.forEach((card, index) => {
        if (index >= 15) return; // Limit to 15 products
        
        try {
          // Extract text content
          const textContent = card.textContent || '';
          
          // Try to find brand - often in specific elements or at start of title
          let brand = '';
          const brandEl = card.querySelector('.brand, .product-brand, [data-brand]');
          if (brandEl) {
            brand = brandEl.textContent.trim();
          } else {
            // Try to extract from title
            const titleEl = card.querySelector('h2, h3, h4, .product-title, .product-name');
            if (titleEl) {
              const title = titleEl.textContent.trim();
              const brandMatch = title.match(/^(TaylorMade|Callaway|Titleist|Ping|Cobra|Mizuno|Cleveland|Odyssey|Scotty Cameron|Wilson|Srixon|Bridgestone)/i);
              if (brandMatch) {
                brand = brandMatch[1];
              }
            }
          }
          
          // Extract model/title
          const titleEl = card.querySelector('h2, h3, h4, .product-title, .product-name, a[title]');
          let model = titleEl?.textContent?.trim() || titleEl?.getAttribute('title') || '';
          
          // Remove brand from model if it starts with it
          if (brand && model.startsWith(brand)) {
            model = model.substring(brand.length).trim();
          }
          
          // Extract price
          const priceEl = card.querySelector('.price, .product-price, [data-price], .price-now');
          const priceText = priceEl?.textContent?.trim() || '';
          
          // Extract image
          const imgEl = card.querySelector('img');
          let imageUrl = imgEl?.src || imgEl?.dataset?.src || '';
          
          // Get product link
          const linkEl = card.querySelector('a[href*="/p/"], a[href*="product"]');
          const productUrl = linkEl?.href || '';
          
          if (model || textContent.length > 20) {
            extractedProducts.push({
              brand: brand || 'Unknown',
              model: model || textContent.substring(0, 100),
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
    const processedProducts = products.map(product => {
      const year = extractYear(product.model);
      const price = parsePrice(product.priceText);
      
      return {
        brand: product.brand,
        model: product.model,
        category: category === 'balls' ? 'balls' : category.replace(/_/g, ' '),
        release_year: year,
        msrp: price,
        current_price: price,
        image_url: product.image_url,
        product_url: product.product_url,
        source: 'golf-galaxy',
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
  console.log('🏌️ Starting Golf Equipment Scraper...\n');
  console.log('Target: Golf Galaxy');
  console.log('Categories:', Object.keys(CONFIG.categories).join(', '));
  
  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const allProducts = [];
  const errors = [];
  
  try {
    const page = await browser.newPage();
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Scrape each category
    for (const [category, url] of Object.entries(CONFIG.categories)) {
      try {
        const products = await scrapeCategoryPage(page, category, url);
        allProducts.push(...products);
        
        // Save progress after each category
        await saveData(allProducts, errors);
        
        // Delay between categories
        console.log(`⏳ Waiting ${CONFIG.delayBetweenRequests}ms...`);
        await delay(CONFIG.delayBetweenRequests);
        
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
      errors.forEach(err => {
        console.log(`  - ${err.category || 'General'}: ${err.error}`);
      });
    }
    
    console.log('\n📁 Data saved to: data/scraped-equipment.json');
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