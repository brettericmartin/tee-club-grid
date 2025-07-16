import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Add stealth plugin
puppeteer.use(StealthPlugin());

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 2nd Swing specific configuration
const CONFIG = {
  baseUrl: 'https://www.2ndswing.com',
  searchPath: '/search/?q=',
  selectors: {
    searchResults: '.product-tile, .product-item, .search-result-item',
    productLink: 'a.product-link, .product-tile a, .product-item a',
    productImage: '.product-image img, .main-product-image img, .product-photo img, #product-main-image img',
    productTitle: '.product-name, .product-title, h1.product-name',
    imageGallery: '.product-thumbnails img, .alternate-images img, .thumbnail-images img'
  },
  delays: {
    betweenRequests: 2500,
    pageLoad: 3000,
    imageLoad: 2000
  }
};

async function findEquipmentWithoutPhotos(limit = 10) {
  console.log('🔍 Finding equipment without photos...');
  
  const { data, error } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .or('image_url.is.null,image_url.eq.""')
    .order('popularity_score', { ascending: false, nullsFirst: false })
    .limit(limit);
    
  if (error) {
    console.error('Error:', error);
    return [];
  }
  
  console.log(`Found ${data.length} equipment items without photos\n`);
  return data;
}

async function extractImageFromPage(page) {
  try {
    // Wait for main product image
    await page.waitForSelector(CONFIG.selectors.productImage, { 
      timeout: 10000,
      visible: true 
    });
    
    // Try multiple strategies to get the best image
    const imageData = await page.evaluate((selectors) => {
      // Strategy 1: Find the main product image
      const mainImage = document.querySelector(selectors.productImage);
      if (mainImage && mainImage.src) {
        return {
          url: mainImage.src,
          alt: mainImage.alt,
          width: mainImage.naturalWidth || mainImage.width,
          height: mainImage.naturalHeight || mainImage.height
        };
      }
      
      // Strategy 2: Find largest image on page
      const allImages = document.querySelectorAll('img');
      let largestImage = null;
      let maxSize = 0;
      
      for (const img of allImages) {
        const size = (img.naturalWidth || img.width) * (img.naturalHeight || img.height);
        if (size > maxSize && img.src && !img.src.includes('logo') && !img.src.includes('icon')) {
          maxSize = size;
          largestImage = img;
        }
      }
      
      if (largestImage) {
        return {
          url: largestImage.src,
          alt: largestImage.alt,
          width: largestImage.naturalWidth || largestImage.width,
          height: largestImage.naturalHeight || largestImage.height
        };
      }
      
      return null;
    }, CONFIG.selectors);
    
    return imageData;
  } catch (error) {
    console.error('  ❌ Error extracting image:', error.message);
    return null;
  }
}

async function downloadImage(imageUrl) {
  try {
    // Use page.goto to download image through browser
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    const response = await page.goto(imageUrl, { 
      waitUntil: 'networkidle0',
      timeout: 15000 
    });
    
    if (response && response.ok()) {
      const buffer = await response.buffer();
      await browser.close();
      return buffer;
    }
    
    await browser.close();
    return null;
  } catch (error) {
    console.error('  ❌ Error downloading image:', error.message);
    return null;
  }
}

async function processAndUploadImage(imageBuffer, equipment) {
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
    
    // Upload to Supabase
    const fileName = `${equipment.brand.toLowerCase().replace(/\s+/g, '-')}/${equipment.model.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    
    const { data, error } = await supabase.storage
      .from('equipment-images')
      .upload(fileName, processed, {
        contentType: 'image/png',
        upsert: true
      });
      
    if (error) throw error;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('equipment-images')
      .getPublicUrl(fileName);
      
    // Update equipment record
    await supabase
      .from('equipment')
      .update({ image_url: publicUrl })
      .eq('id', equipment.id);
      
    console.log(`  ✅ Successfully uploaded image`);
    return true;
    
  } catch (error) {
    console.error(`  ❌ Process/upload error: ${error.message}`);
    return false;
  }
}

async function search2ndSwing(browser, equipment) {
  const page = await browser.newPage();
  
  try {
    // Set realistic viewport
    await page.setViewport({ width: 1366, height: 768 });
    
    // Add extra headers to appear more human
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });
    
    // Build search query
    const searchQuery = `${equipment.brand} ${equipment.model}`;
    const searchUrl = `${CONFIG.baseUrl}${CONFIG.searchPath}${encodeURIComponent(searchQuery)}`;
    
    console.log(`  🔍 Searching 2nd Swing for: ${searchQuery}`);
    
    // Navigate to search page
    await page.goto(searchUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    // Wait for search results
    await new Promise(resolve => setTimeout(resolve, CONFIG.delays.pageLoad));
    
    // Check if we have search results
    const hasResults = await page.$(CONFIG.selectors.searchResults);
    
    if (hasResults) {
      // Click on first product
      const productLinks = await page.$$(CONFIG.selectors.productLink);
      
      if (productLinks.length > 0) {
        console.log(`  📄 Found ${productLinks.length} products, clicking first...`);
        
        // Get href and navigate directly (more reliable than click)
        const href = await productLinks[0].evaluate(el => el.href);
        await page.goto(href, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Wait for product page to load
        await new Promise(resolve => setTimeout(resolve, CONFIG.delays.imageLoad));
        
        // Extract image data
        const imageData = await extractImageFromPage(page);
        
        if (imageData && imageData.url) {
          console.log(`  📸 Found image: ${imageData.width}x${imageData.height}`);
          
          // Download image
          const imageBuffer = await downloadImage(imageData.url);
          
          if (imageBuffer) {
            // Process and upload
            const success = await processAndUploadImage(imageBuffer, equipment);
            return success;
          }
        }
      }
    } else {
      console.log(`  ❌ No search results found`);
    }
    
    return false;
    
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  } finally {
    await page.close();
  }
}

async function collect2ndSwingImages(limit = 10) {
  console.log('🚀 Starting 2nd Swing Image Collection\n');
  console.log('📋 This collector specifically targets 2ndswing.com\n');
  
  const browser = await puppeteer.launch({
    headless: true, // Set to false for debugging
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1366,768'
    ]
  });
  
  try {
    const equipment = await findEquipmentWithoutPhotos(limit);
    
    if (equipment.length === 0) {
      console.log('✨ All equipment has photos!');
      return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < equipment.length; i++) {
      const item = equipment[i];
      console.log(`\n[${i + 1}/${equipment.length}] ${item.brand} ${item.model}`);
      
      const success = await search2ndSwing(browser, item);
      
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Rate limiting
      if (i < equipment.length - 1) {
        console.log(`  ⏳ Waiting ${CONFIG.delays.betweenRequests / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.delays.betweenRequests));
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
  }
}

// Run it
const limit = parseInt(process.argv[2]) || 10;
await collect2ndSwingImages(limit);