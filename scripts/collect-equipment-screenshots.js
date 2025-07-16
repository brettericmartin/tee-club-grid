import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration
const CONFIG = {
  headless: true, // Set to false for debugging
  defaultTimeout: 30000,
  viewportWidth: 1920,
  viewportHeight: 1080,
  maxRetries: 3,
  batchSize: 10,
  delayBetweenRequests: 3000, // 3 seconds
  storageBucket: 'equipment-images'
};

// Search strategies for different brands
const SEARCH_STRATEGIES = {
  'TaylorMade': {
    baseUrl: 'https://www.taylormadegolf.com',
    searchPath: '/search?q=',
    selectors: {
      productImage: '.product-image-main img, .pdp-image img, .product-hero img',
      productTitle: '.product-name, .pdp-title',
      imageGallery: '.product-thumbnails img, .pdp-thumbnails img'
    }
  },
  'Callaway': {
    baseUrl: 'https://www.callawaygolf.com',
    searchPath: '/search?q=',
    selectors: {
      productImage: '.product-image img, .product-detail-image img',
      productTitle: '.product-name, .product-title',
      imageGallery: '.product-thumbnails img'
    }
  },
  'Titleist': {
    baseUrl: 'https://www.titleist.com',
    searchPath: '/search?q=',
    selectors: {
      productImage: '.product-image img, .product-hero-image img',
      productTitle: '.product-name',
      imageGallery: '.product-image-thumbnails img'
    }
  },
  'Ping': {
    baseUrl: 'https://ping.com',
    searchPath: '/search?q=',
    selectors: {
      productImage: '.product-image img, .club-hero-image img',
      productTitle: '.product-name',
      imageGallery: '.image-thumbnails img'
    }
  },
  // Retailers as fallback
  'GolfGalaxy': {
    baseUrl: 'https://www.golfgalaxy.com',
    searchPath: '/search?searchTerm=',
    selectors: {
      productImage: '.product-image img, .main-image img',
      productTitle: '.product-title',
      imageGallery: '.alternate-images img'
    }
  },
  '2ndSwing': {
    baseUrl: 'https://www.2ndswing.com',
    searchPath: '/search/?q=',
    selectors: {
      productImage: '.product-image img, .main-product-image img',
      productTitle: '.product-name',
      imageGallery: '.thumbnail-images img'
    }
  }
};

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Find equipment without photos
async function findEquipmentWithoutPhotos(limit = null) {
  console.log('🔍 Finding equipment without photos...');
  
  let query = supabase
    .from('equipment')
    .select('id, brand, model, category')
    .or('image_url.is.null,image_url.eq.""')
    .order('created_at', { ascending: false });
    
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching equipment:', error);
    return [];
  }
  
  console.log(`Found ${data.length} equipment items without photos`);
  return data;
}

// Screenshot a specific element
async function screenshotElement(page, selector, padding = 20) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout: 10000 });
    const element = await page.$(selector);
    
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    
    // Get element bounds
    const box = await element.boundingBox();
    if (!box) {
      throw new Error('Could not get element bounds');
    }
    
    // Take screenshot with padding
    const screenshot = await page.screenshot({
      clip: {
        x: Math.max(0, box.x - padding),
        y: Math.max(0, box.y - padding),
        width: box.width + (padding * 2),
        height: box.height + (padding * 2)
      }
    });
    
    return screenshot;
  } catch (error) {
    console.error('Error taking screenshot:', error.message);
    return null;
  }
}

// Process and optimize image
async function processImage(imageBuffer) {
  try {
    // Process with sharp
    const processed = await sharp(imageBuffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({ quality: 90 })
      .toBuffer();
      
    return processed;
  } catch (error) {
    console.error('Error processing image:', error);
    return imageBuffer; // Return original if processing fails
  }
}

// Upload image to Supabase
async function uploadToSupabase(imageBuffer, equipment) {
  try {
    const fileName = `${equipment.brand.toLowerCase().replace(/\s+/g, '-')}/${equipment.model.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    
    const { data, error } = await supabase.storage
      .from(CONFIG.storageBucket)
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });
      
    if (error) {
      throw error;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(CONFIG.storageBucket)
      .getPublicUrl(fileName);
      
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    return null;
  }
}

// Search and capture equipment image
async function captureEquipmentImage(browser, equipment) {
  const page = await browser.newPage();
  
  try {
    // Set viewport
    await page.setViewport({
      width: CONFIG.viewportWidth,
      height: CONFIG.viewportHeight
    });
    
    // Try brand-specific strategy first
    const brandStrategy = SEARCH_STRATEGIES[equipment.brand] || SEARCH_STRATEGIES['GolfGalaxy'];
    const searchQuery = `${equipment.brand} ${equipment.model}`;
    const searchUrl = `${brandStrategy.baseUrl}${brandStrategy.searchPath}${encodeURIComponent(searchQuery)}`;
    
    console.log(`  🔗 Searching: ${searchUrl}`);
    
    // Navigate to search page
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: CONFIG.defaultTimeout });
    
    // Wait a bit for dynamic content
    await delay(2000);
    
    // Try to find and click on the first product result
    const productLinks = await page.$$('a[href*="product"], a[href*="golf-clubs"], .product-link, .product-tile');
    if (productLinks.length > 0) {
      await productLinks[0].click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      await delay(2000);
    }
    
    // Try to capture the main product image
    let screenshot = null;
    for (const selector of brandStrategy.selectors.productImage.split(',')) {
      screenshot = await screenshotElement(page, selector.trim());
      if (screenshot) break;
    }
    
    if (!screenshot) {
      // Fallback: try to capture any large image on the page
      const fallbackSelectors = ['img[src*="product"]', 'img[alt*="golf"]', 'img[width="400"]'];
      for (const selector of fallbackSelectors) {
        screenshot = await screenshotElement(page, selector);
        if (screenshot) break;
      }
    }
    
    if (screenshot) {
      // Process the image
      const processed = await processImage(screenshot);
      
      // Upload to Supabase
      const imageUrl = await uploadToSupabase(processed, equipment);
      
      if (imageUrl) {
        // Update equipment record
        const { error: updateError } = await supabase
          .from('equipment')
          .update({ image_url: imageUrl })
          .eq('id', equipment.id);
          
        if (updateError) {
          console.error('Error updating equipment:', updateError);
          return false;
        }
        
        console.log(`  ✅ Successfully captured and saved image`);
        return true;
      }
    }
    
    console.log(`  ❌ No image found for ${equipment.brand} ${equipment.model}`);
    return false;
    
  } catch (error) {
    console.error(`  ❌ Error capturing image:`, error.message);
    return false;
  } finally {
    await page.close();
  }
}

// Main function to process equipment
async function collectEquipmentScreenshots(options = {}) {
  const { limit = CONFIG.batchSize, testMode = false } = options;
  
  console.log('🚀 Starting Equipment Screenshot Collection');
  console.log(`📋 Mode: ${testMode ? 'TEST' : 'PRODUCTION'}`);
  console.log(`📊 Batch size: ${limit}\n`);
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ],
    defaultViewport: null
  });
  
  try {
    // Get equipment without photos
    const equipment = await findEquipmentWithoutPhotos(limit);
    
    if (equipment.length === 0) {
      console.log('✨ All equipment has photos!');
      return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    // Process equipment
    for (let i = 0; i < equipment.length; i++) {
      const item = equipment[i];
      console.log(`\n[${i + 1}/${equipment.length}] Processing: ${item.brand} ${item.model}`);
      
      const success = await captureEquipmentImage(browser, item);
      
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Rate limiting
      if (i < equipment.length - 1) {
        console.log(`  ⏳ Waiting ${CONFIG.delayBetweenRequests / 1000}s before next request...`);
        await delay(CONFIG.delayBetweenRequests);
      }
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    console.log(`  📸 Total processed: ${equipment.length}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
  }
}

// Test with a single item
async function testSingleEquipment() {
  const testItem = {
    id: 'test-' + Date.now(),
    brand: 'TaylorMade',
    model: 'Qi10 Driver',
    category: 'driver'
  };
  
  console.log('🧪 Testing with single equipment item...');
  console.log(`  Brand: ${testItem.brand}`);
  console.log(`  Model: ${testItem.model}`);
  
  const browser = await puppeteer.launch({
    headless: true, // Use headless mode
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ],
    defaultViewport: null
  });
  
  try {
    const success = await captureEquipmentImage(browser, testItem);
    console.log(`  Result: ${success ? '✅ Success' : '❌ Failed'}`);
  } finally {
    await browser.close();
  }
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'test':
    await testSingleEquipment();
    break;
  case 'run':
    const limit = parseInt(args[1]) || CONFIG.batchSize;
    await collectEquipmentScreenshots({ limit });
    break;
  case 'all':
    await collectEquipmentScreenshots({ limit: null });
    break;
  default:
    console.log('📸 Equipment Screenshot Collection System');
    console.log('\nUsage:');
    console.log('  npm run collect:screenshots test     - Test with single item');
    console.log('  npm run collect:screenshots run [n]  - Process n items (default: 10)');
    console.log('  npm run collect:screenshots all      - Process all items without photos');
}