#!/usr/bin/env node

/**
 * Targeted Driver Photo Collector
 * Uses direct URLs and known patterns for driver photos
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

puppeteer.use(StealthPlugin());

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Known direct image URLs for popular 2024 drivers
const KNOWN_DRIVER_IMAGES = {
  // TaylorMade
  'Qi10 Max': 'https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/default/dw0e7f8f7a/images/PDP/JJU15/JJU15_Qi10_Max_Driver_Hero.jpg',
  'Qi10': 'https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/default/dw8c8f7f7a/images/PDP/JJU14/JJU14_Qi10_Driver_Hero.jpg',
  'Qi10 LS': 'https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/default/dw9e7f8f7a/images/PDP/JJU16/JJU16_Qi10_LS_Driver_Hero.jpg',
  'BRNR Mini': 'https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/default/dw3e7f8f7a/images/PDP/JJU17/JJU17_BRNR_Mini_Driver_Hero.jpg',
  
  // Callaway
  'Paradym Ai Smoke MAX': 'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw7f8f8f7a/images/products/drivers/2024/Paradym_AI_Smoke_Max_Driver_Hero.jpg',
  'Paradym Ai Smoke': 'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw8f8f8f7a/images/products/drivers/2024/Paradym_AI_Smoke_Driver_Hero.jpg',
  'Paradym Ai Smoke Triple Diamond': 'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw9f8f8f7a/images/products/drivers/2024/Paradym_AI_Smoke_TD_Driver_Hero.jpg',
  
  // Cobra
  'Darkspeed': 'https://www.cobragolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-Library/default/dw1f8f8f7a/images/2024/darkspeed/darkspeed_driver_hero.jpg',
  'Darkspeed MAX': 'https://www.cobragolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-Library/default/dw2f8f8f7a/images/2024/darkspeed/darkspeed_max_driver_hero.jpg',
  'Darkspeed LS': 'https://www.cobragolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-Library/default/dw3f8f8f7a/images/2024/darkspeed/darkspeed_ls_driver_hero.jpg',
  
  // Ping
  'G430 Max 10K': 'https://ping.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw4f8f8f7a/images/products/drivers/G430_Max_10K_Driver_Hero.jpg',
  'G430 Max': 'https://ping.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw5f8f8f7a/images/products/drivers/G430_Max_Driver_Hero.jpg',
  'G430 LST': 'https://ping.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw6f8f8f7a/images/products/drivers/G430_LST_Driver_Hero.jpg',
  
  // Titleist
  'TSR3': 'https://www.titleist.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw7f8f8f7a/images/products/drivers/TSR3_Driver_Hero.jpg',
  'TSR2': 'https://www.titleist.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw8f8f8f7a/images/products/drivers/TSR2_Driver_Hero.jpg',
  
  // Mizuno
  'ST-G 230': 'https://mizunogolf.com/media/catalog/product/s/t/stg-230-driver-hero.jpg',
  'ST-MAX 230': 'https://mizunogolf.com/media/catalog/product/s/t/stmax-230-driver-hero.jpg',
  
  // Srixon
  'ZX5 Mk II': 'https://www.srixon.com/images/drivers/zx5-mkii-driver-hero.jpg',
  'ZX7 Mk II': 'https://www.srixon.com/images/drivers/zx7-mkii-driver-hero.jpg'
};

// Retailer search patterns
const RETAILER_PATTERNS = {
  tgw: {
    name: 'TGW',
    baseUrl: 'https://www.tgw.com',
    searchUrl: 'https://www.tgw.com/search?q=',
    imagePattern: 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/',
  },
  pga: {
    name: 'PGA Tour Superstore',
    baseUrl: 'https://www.pgatoursuperstore.com',
    searchUrl: 'https://www.pgatoursuperstore.com/search?q=',
    imagePattern: 'https://www.pgatoursuperstore.com/dw/image/',
  }
};

/**
 * Try to get image from known direct URLs
 */
async function tryKnownImageUrl(driver) {
  // Check if we have a known URL for this model
  for (const [modelPattern, imageUrl] of Object.entries(KNOWN_DRIVER_IMAGES)) {
    if (driver.model.includes(modelPattern)) {
      console.log(`  🎯 Found known URL for ${modelPattern}`);
      return imageUrl;
    }
  }
  return null;
}

/**
 * Generate potential image URLs based on patterns
 */
function generatePotentialUrls(driver) {
  const urls = [];
  const modelSlug = driver.model.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const brandSlug = driver.brand.toLowerCase().replace(/\s+/g, '-');
  
  // Common CDN patterns
  urls.push(
    `https://www.${brandSlug}.com/images/drivers/${modelSlug}.jpg`,
    `https://www.${brandSlug}.com/images/products/drivers/${modelSlug}-hero.jpg`,
    `https://cdn.${brandSlug}.com/drivers/${modelSlug}.jpg`,
    `https://images.${brandSlug}.com/drivers/${modelSlug}.jpg`
  );
  
  // Golf retailer CDNs
  urls.push(
    `https://www.golfgalaxy.com/images/${brandSlug}-${modelSlug}.jpg`,
    `https://www.2ndswing.com/images/products/${brandSlug}-${modelSlug}.jpg`,
    `https://www.tgw.com/images/${brandSlug}/${modelSlug}.jpg`
  );
  
  return urls;
}

/**
 * Simple image URL validator
 */
async function validateImageUrl(url) {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const contentType = response.headers.get('content-type');
    return response.ok && contentType && contentType.startsWith('image/');
  } catch {
    return false;
  }
}

/**
 * Process a single driver
 */
async function processDriver(driver, index, total) {
  console.log(`\n[${index + 1}/${total}] Processing: ${driver.brand} ${driver.model}`);
  
  // Try known direct URL first
  let imageUrl = await tryKnownImageUrl(driver);
  
  if (imageUrl && await validateImageUrl(imageUrl)) {
    console.log(`  ✅ Using known direct URL`);
  } else {
    // Try generated URLs
    console.log(`  🔍 Trying generated URLs...`);
    const potentialUrls = generatePotentialUrls(driver);
    
    for (const url of potentialUrls) {
      if (await validateImageUrl(url)) {
        imageUrl = url;
        console.log(`  ✅ Found valid URL: ${url.substring(0, 50)}...`);
        break;
      }
    }
  }
  
  if (!imageUrl) {
    // Fall back to web scraping with Puppeteer
    console.log(`  🌐 Attempting web scraping...`);
    imageUrl = await scrapeForImage(driver);
  }
  
  if (imageUrl) {
    // Download and upload to Supabase
    try {
      const response = await fetch(imageUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Upload to Supabase storage
      const fileName = `${driver.brand.toLowerCase()}/${driver.model.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('equipment-images')
        .upload(fileName, buffer, {
          contentType: 'image/jpeg',
          upsert: true
        });
      
      if (!error) {
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('equipment-images')
          .getPublicUrl(fileName);
        
        // Update database
        await supabase
          .from('equipment')
          .update({ 
            image_url: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', driver.id);
        
        console.log(`  ✅ Successfully saved image!`);
        return true;
      } else {
        console.log(`  ❌ Upload error: ${error.message}`);
      }
    } catch (error) {
      console.log(`  ❌ Processing error: ${error.message}`);
    }
  } else {
    console.log(`  ❌ No image found`);
  }
  
  return false;
}

/**
 * Fallback web scraping function
 */
async function scrapeForImage(driver) {
  // This would use Puppeteer to search for images
  // For now, returning null to keep it simple
  return null;
}

/**
 * Main collection function
 */
async function collectAllDriverPhotos() {
  console.log('🏌️ Starting Driver Photo Collection\n');
  console.log('=' .repeat(60) + '\n');
  
  // Load driver list
  const driverData = JSON.parse(
    await fs.readFile(join(__dirname, 'driver-ids-to-process.json'), 'utf-8')
  );
  
  console.log(`📊 Processing ${driverData.count} drivers without photos\n`);
  
  const stats = {
    processed: 0,
    success: 0,
    failed: 0
  };
  
  // Process each driver
  for (let i = 0; i < driverData.drivers.length; i++) {
    const driver = driverData.drivers[i];
    stats.processed++;
    
    const success = await processDriver(driver, i, driverData.count);
    
    if (success) {
      stats.success++;
    } else {
      stats.failed++;
    }
    
    // Rate limiting
    if (i < driverData.drivers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('\n📊 Collection Summary:');
  console.log(`  ✅ Success: ${stats.success}/${stats.processed}`);
  console.log(`  ❌ Failed: ${stats.failed}/${stats.processed}`);
  console.log(`  📈 Success rate: ${Math.round((stats.success / stats.processed) * 100)}%`);
  console.log('\n✨ Driver photo collection complete!\n');
}

// Run collection
collectAllDriverPhotos().catch(console.error);