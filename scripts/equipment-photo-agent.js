#!/usr/bin/env node

/**
 * Equipment Photo Collection Agent
 * 
 * Intelligent photo scraping agent that:
 * 1. Searches multiple sources for equipment photos
 * 2. Validates image quality and relevance
 * 3. Handles rate limiting and caching
 * 4. Updates database with best photos found
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration
const CONFIG = {
  // Browser settings
  headless: true,
  viewport: { width: 1920, height: 1080 },
  
  // Scraping settings
  maxRetries: 3,
  timeout: 30000,
  rateLimitDelay: 2000, // 2 seconds between requests
  
  // Image settings
  minImageWidth: 600,
  minImageHeight: 600,
  maxImageSize: 5 * 1024 * 1024, // 5MB
  targetImageSize: { width: 1200, height: 1200 },
  
  // Cache settings
  cacheDir: join(__dirname, '..', 'data', 'photo-cache'),
  cacheMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // Batch settings
  batchSize: 10,
  maxConcurrentBrowsers: 3,
};

// Source configurations for different sites
const SOURCES = {
  // Manufacturer sites
  TAYLORMADE: {
    name: 'TaylorMade',
    baseUrl: 'https://www.taylormadegolf.com',
    searchUrl: 'https://www.taylormadegolf.com/search?q=',
    selectors: {
      searchResults: '.search-result-item a',
      productImage: '.product-image-main img, .pdp-image img, picture img',
      productGallery: '.product-thumbnails img, .pdp-thumbnails img',
      productTitle: '.product-name, h1.product-title'
    },
    priority: 1
  },
  
  CALLAWAY: {
    name: 'Callaway',
    baseUrl: 'https://www.callawaygolf.com',
    searchUrl: 'https://www.callawaygolf.com/search?q=',
    selectors: {
      searchResults: '.product-tile a.thumb-link',
      productImage: '.primary-image img, .product-primary-image img',
      productGallery: '.alternate-images img',
      productTitle: '.product-name, h1'
    },
    priority: 1
  },
  
  TITLEIST: {
    name: 'Titleist',
    baseUrl: 'https://www.titleist.com',
    searchUrl: 'https://www.titleist.com/search?q=',
    selectors: {
      searchResults: '.product-item a',
      productImage: '.product-image img, .main-image img',
      productGallery: '.product-thumbnails img',
      productTitle: '.product-name, h1'
    },
    priority: 1
  },
  
  PING: {
    name: 'Ping',
    baseUrl: 'https://ping.com',
    searchUrl: 'https://ping.com/search?q=',
    selectors: {
      searchResults: '.product-item a',
      productImage: '.product-hero img, .main-product-image img',
      productGallery: '.thumbnail-list img',
      productTitle: '.product-title, h1'
    },
    priority: 1
  },
  
  // Retailer sites
  GOLF_GALAXY: {
    name: 'Golf Galaxy',
    baseUrl: 'https://www.golfgalaxy.com',
    searchUrl: 'https://www.golfgalaxy.com/search?searchTerm=',
    selectors: {
      searchResults: '.product-card a',
      productImage: '.main-image img',
      productGallery: '.alternate-images img',
      productTitle: '.product-title'
    },
    priority: 2
  },
  
  SECOND_SWING: {
    name: '2nd Swing',
    baseUrl: 'https://www.2ndswing.com',
    searchUrl: 'https://www.2ndswing.com/search/?q=',
    selectors: {
      searchResults: '.product-box a',
      productImage: '.main-product-photo img',
      productGallery: '.product-photo-thumbs img',
      productTitle: '.product-title h1'
    },
    priority: 2
  },
  
  // Search engines (fallback)
  GOOGLE_IMAGES: {
    name: 'Google Images',
    searchUrl: 'https://www.google.com/search?tbm=isch&q=',
    selectors: {
      images: 'img[data-src], img.rg_i',
      firstResults: 'div[data-ri="0"] img, div[data-ri="1"] img, div[data-ri="2"] img'
    },
    priority: 3
  }
};

/**
 * Cache system for avoiding repeated scraping
 */
class PhotoCache {
  constructor() {
    this.cacheDir = CONFIG.cacheDir;
    this.init();
  }
  
  async init() {
    await fs.mkdir(this.cacheDir, { recursive: true });
  }
  
  getCacheKey(equipment) {
    const str = `${equipment.brand}-${equipment.model}-${equipment.category}`.toLowerCase();
    return crypto.createHash('md5').update(str).digest('hex');
  }
  
  async get(equipment) {
    try {
      const key = this.getCacheKey(equipment);
      const cachePath = join(this.cacheDir, `${key}.json`);
      
      const stats = await fs.stat(cachePath);
      if (Date.now() - stats.mtime.getTime() > CONFIG.cacheMaxAge) {
        return null; // Cache expired
      }
      
      const data = await fs.readFile(cachePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null; // Cache miss
    }
  }
  
  async set(equipment, data) {
    const key = this.getCacheKey(equipment);
    const cachePath = join(this.cacheDir, `${key}.json`);
    
    await fs.writeFile(cachePath, JSON.stringify({
      ...data,
      cachedAt: new Date().toISOString(),
      equipment
    }, null, 2));
  }
}

/**
 * Image quality validator
 */
class ImageValidator {
  async validateUrl(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentType = response.headers.get('content-type');
      const contentLength = parseInt(response.headers.get('content-length') || '0');
      
      if (!contentType?.startsWith('image/')) {
        return { valid: false, reason: 'Not an image' };
      }
      
      if (contentLength > CONFIG.maxImageSize) {
        return { valid: false, reason: 'Image too large' };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }
  
  async validateImage(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      
      if (metadata.width < CONFIG.minImageWidth || metadata.height < CONFIG.minImageHeight) {
        return { valid: false, reason: 'Image too small', metadata };
      }
      
      // Check if image is mostly transparent or white (likely placeholder)
      const stats = await sharp(buffer).stats();
      const avgBrightness = (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / 3;
      
      if (avgBrightness > 250) {
        return { valid: false, reason: 'Image too bright (likely placeholder)', metadata };
      }
      
      return { valid: true, metadata };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }
  
  async processImage(buffer) {
    try {
      return await sharp(buffer)
        .resize(CONFIG.targetImageSize.width, CONFIG.targetImageSize.height, {
          fit: 'inside',
          withoutEnlargement: true,
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png({ quality: 90 })
        .toBuffer();
    } catch (error) {
      console.error('Error processing image:', error);
      return null;
    }
  }
}

/**
 * Main photo collection agent
 */
class EquipmentPhotoAgent {
  constructor() {
    this.cache = new PhotoCache();
    this.validator = new ImageValidator();
    this.browser = null;
    this.stats = {
      processed: 0,
      success: 0,
      failed: 0,
      cached: 0,
      errors: []
    };
  }
  
  async init() {
    console.log('🚀 Initializing Equipment Photo Agent\n');
    console.log('Configuration:');
    console.log(`  - Headless: ${CONFIG.headless}`);
    console.log(`  - Min image size: ${CONFIG.minImageWidth}x${CONFIG.minImageHeight}`);
    console.log(`  - Cache duration: ${CONFIG.cacheMaxAge / (24 * 60 * 60 * 1000)} days`);
    console.log(`  - Rate limit: ${CONFIG.rateLimitDelay}ms between requests\n`);
    
    this.browser = await puppeteer.launch({
      headless: CONFIG.headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080'
      ]
    });
  }
  
  async searchManufacturerSite(equipment, source) {
    const page = await this.browser.newPage();
    await page.setViewport(CONFIG.viewport);
    
    try {
      console.log(`    🔍 Searching ${source.name}...`);
      
      // Build search query
      const searchQuery = `${equipment.brand} ${equipment.model}`.trim();
      const searchUrl = source.searchUrl + encodeURIComponent(searchQuery);
      
      // Navigate to search page
      await page.goto(searchUrl, { 
        waitUntil: 'networkidle2', 
        timeout: CONFIG.timeout 
      });
      
      // Wait for search results
      await page.waitForSelector(source.selectors.searchResults || 'img', { 
        timeout: 5000 
      }).catch(() => null);
      
      // Try to find product page
      const productLinks = await page.evaluate((selector) => {
        const links = document.querySelectorAll(selector);
        return Array.from(links).map(a => a.href).slice(0, 3);
      }, source.selectors.searchResults);
      
      if (productLinks.length > 0) {
        // Navigate to first product page
        await page.goto(productLinks[0], { 
          waitUntil: 'networkidle2',
          timeout: CONFIG.timeout 
        });
        
        // Wait for product image
        await page.waitForSelector(source.selectors.productImage, { 
          timeout: 5000 
        });
        
        // Collect all product images
        const imageUrls = await page.evaluate((selectors) => {
          const images = [];
          
          // Main product image
          const mainImg = document.querySelector(selectors.productImage);
          if (mainImg) {
            images.push(mainImg.src || mainImg.dataset.src);
          }
          
          // Gallery images
          const galleryImgs = document.querySelectorAll(selectors.productGallery);
          galleryImgs.forEach(img => {
            const url = img.src || img.dataset.src || img.dataset.zoom;
            if (url) images.push(url);
          });
          
          return [...new Set(images)].filter(url => url && url.startsWith('http'));
        }, source.selectors);
        
        console.log(`    📸 Found ${imageUrls.length} images from ${source.name}`);
        return imageUrls;
      }
      
      return [];
      
    } catch (error) {
      console.log(`    ⚠️ Error searching ${source.name}: ${error.message}`);
      return [];
    } finally {
      await page.close();
    }
  }
  
  async searchGoogleImages(equipment) {
    const page = await this.browser.newPage();
    await page.setViewport(CONFIG.viewport);
    
    try {
      console.log(`    🔍 Searching Google Images...`);
      
      // Build search query with specific terms for better results
      const searchQuery = `${equipment.brand} ${equipment.model} golf ${equipment.category} product official -used -ebay -amazon`;
      const searchUrl = SOURCES.GOOGLE_IMAGES.searchUrl + encodeURIComponent(searchQuery);
      
      // Navigate to Google Images
      await page.goto(searchUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.timeout 
      });
      
      // Wait for images to load
      await page.waitForSelector('img[data-src], img.rg_i', { 
        timeout: 5000 
      });
      
      // Get image URLs from first few results
      const imageUrls = await page.evaluate(() => {
        const images = [];
        const imgElements = document.querySelectorAll('img[data-src], img.rg_i');
        
        for (let i = 1; i < Math.min(6, imgElements.length); i++) {
          const img = imgElements[i];
          const url = img.dataset.src || img.src;
          if (url && url.startsWith('http') && !url.includes('gstatic')) {
            images.push(url);
          }
        }
        
        return images;
      });
      
      console.log(`    📸 Found ${imageUrls.length} images from Google`);
      return imageUrls;
      
    } catch (error) {
      console.log(`    ⚠️ Error searching Google Images: ${error.message}`);
      return [];
    } finally {
      await page.close();
    }
  }
  
  async collectPhotosForEquipment(equipment) {
    console.log(`\n📦 Processing: ${equipment.brand} ${equipment.model}`);
    
    // Check cache first
    const cached = await this.cache.get(equipment);
    if (cached && cached.imageUrl) {
      console.log(`  ✅ Using cached image`);
      this.stats.cached++;
      return cached.imageUrl;
    }
    
    const allImageUrls = [];
    
    // Try manufacturer sites first (if brand matches)
    const brandSources = Object.values(SOURCES)
      .filter(s => s.priority === 1 && s.name.toLowerCase().includes(equipment.brand.toLowerCase()))
      .sort((a, b) => a.priority - b.priority);
    
    for (const source of brandSources) {
      const urls = await this.searchManufacturerSite(equipment, source);
      allImageUrls.push(...urls);
      
      if (urls.length > 0) break; // Stop if we found images
      await this.delay(CONFIG.rateLimitDelay);
    }
    
    // Try retailer sites if no manufacturer images found
    if (allImageUrls.length === 0) {
      const retailerSources = Object.values(SOURCES)
        .filter(s => s.priority === 2)
        .sort((a, b) => a.priority - b.priority);
      
      for (const source of retailerSources) {
        const urls = await this.searchManufacturerSite(equipment, source);
        allImageUrls.push(...urls);
        
        if (urls.length > 0) break;
        await this.delay(CONFIG.rateLimitDelay);
      }
    }
    
    // Fallback to Google Images if still no images
    if (allImageUrls.length === 0) {
      const googleUrls = await this.searchGoogleImages(equipment);
      allImageUrls.push(...googleUrls);
      await this.delay(CONFIG.rateLimitDelay);
    }
    
    // Process and validate images
    console.log(`  🔄 Processing ${allImageUrls.length} candidate images...`);
    
    for (const imageUrl of allImageUrls) {
      try {
        // Validate URL first
        const urlValidation = await this.validator.validateUrl(imageUrl);
        if (!urlValidation.valid) {
          console.log(`    ❌ Invalid URL: ${urlValidation.reason}`);
          continue;
        }
        
        // Download image
        const response = await fetch(imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        
        // Validate image quality
        const imageValidation = await this.validator.validateImage(buffer);
        if (!imageValidation.valid) {
          console.log(`    ❌ Invalid image: ${imageValidation.reason}`);
          continue;
        }
        
        // Process image
        const processedBuffer = await this.validator.processImage(buffer);
        if (!processedBuffer) {
          continue;
        }
        
        // Upload to Supabase
        const fileName = `${equipment.brand.toLowerCase().replace(/\s+/g, '-')}/${equipment.model.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('equipment-images')
          .upload(fileName, processedBuffer, {
            contentType: 'image/png',
            upsert: true
          });
        
        if (uploadError) {
          console.log(`    ❌ Upload error: ${uploadError.message}`);
          continue;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('equipment-images')
          .getPublicUrl(fileName);
        
        // Update equipment record
        const { error: updateError } = await supabase
          .from('equipment')
          .update({ 
            image_url: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', equipment.id);
        
        if (!updateError) {
          console.log(`  ✅ Successfully saved image from ${imageUrl.substring(0, 50)}...`);
          
          // Cache the result
          await this.cache.set(equipment, { imageUrl: publicUrl });
          
          this.stats.success++;
          return publicUrl;
        }
        
      } catch (error) {
        console.log(`    ❌ Error processing image: ${error.message}`);
      }
    }
    
    console.log(`  ❌ No suitable images found`);
    this.stats.failed++;
    return null;
  }
  
  async findEquipmentWithoutPhotos(limit = 10) {
    console.log('🔍 Finding equipment without photos...\n');
    
    const { data, error } = await supabase
      .from('equipment')
      .select('id, brand, model, category, popularity_score')
      .or('image_url.is.null,image_url.eq.""')
      .order('popularity_score', { ascending: false, nullsFirst: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching equipment:', error);
      return [];
    }
    
    console.log(`Found ${data.length} equipment items without photos\n`);
    return data;
  }
  
  async processBatch(batchSize = CONFIG.batchSize) {
    const equipment = await this.findEquipmentWithoutPhotos(batchSize);
    
    for (const item of equipment) {
      this.stats.processed++;
      await this.collectPhotosForEquipment(item);
      
      // Rate limiting between items
      if (this.stats.processed < equipment.length) {
        console.log(`  ⏳ Waiting before next item...\n`);
        await this.delay(CONFIG.rateLimitDelay * 2);
      }
    }
  }
  
  async close() {
    if (this.browser) {
      await this.browser.close();
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Final Statistics:');
    console.log(`  - Processed: ${this.stats.processed}`);
    console.log(`  - Success: ${this.stats.success}`);
    console.log(`  - Failed: ${this.stats.failed}`);
    console.log(`  - Cached: ${this.stats.cached}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.stats.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    console.log('\n✨ Photo collection complete!\n');
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const agent = new EquipmentPhotoAgent();
  
  try {
    await agent.init();
    
    // Process batch (default 10 items, or pass command line argument)
    const batchSize = parseInt(process.argv[2]) || 10;
    await agent.processBatch(batchSize);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await agent.close();
  }
}

// Run the agent
main().catch(console.error);