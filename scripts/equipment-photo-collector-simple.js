#!/usr/bin/env node

/**
 * Simplified Equipment Photo Collector
 * 
 * A more robust version focused on reliability over speed
 * Uses direct image search with better error handling
 */

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

dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Add stealth plugin
puppeteer.use(StealthPlugin());

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Simple configuration
const CONFIG = {
  headless: true,
  timeout: 15000,
  minImageSize: 400,
  targetSize: 1000,
  delayBetweenItems: 3000
};

/**
 * Find equipment that needs photos
 */
async function findEquipmentNeedingPhotos(limit = 5) {
  console.log('🔍 Finding equipment without photos...\n');
  
  const { data, error } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .or('image_url.is.null,image_url.eq.""')
    .order('popularity_score', { ascending: false, nullsFirst: false })
    .limit(limit);
  
  if (error) {
    console.error('Database error:', error);
    return [];
  }
  
  console.log(`Found ${data.length} items needing photos\n`);
  return data;
}

/**
 * Simple direct image search using DuckDuckGo (no API needed)
 */
async function searchForImages(browser, equipment) {
  const page = await browser.newPage();
  
  try {
    // Build search query
    const query = `${equipment.brand} ${equipment.model} golf ${equipment.category}`.trim();
    console.log(`  🔍 Searching for: "${query}"`);
    
    // Use DuckDuckGo image search (more reliable than Google for scraping)
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
    
    // Navigate to search
    await page.goto(searchUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.timeout 
    });
    
    // Wait a bit for images to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Click on images tab if needed
    try {
      await page.click('a[data-zci-link="images"]', { timeout: 2000 });
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch {
      // Already on images page
    }
    
    // Get image URLs
    const imageUrls = await page.evaluate(() => {
      const images = [];
      // DuckDuckGo image tiles
      const tiles = document.querySelectorAll('.tile--img__img');
      
      tiles.forEach((img, index) => {
        if (index < 5) { // Get first 5 images
          const src = img.getAttribute('data-src') || img.src;
          if (src && src.startsWith('http')) {
            images.push(src);
          }
        }
      });
      
      return images;
    });
    
    console.log(`  📸 Found ${imageUrls.length} images`);
    return imageUrls;
    
  } catch (error) {
    console.log(`  ⚠️ Search error: ${error.message}`);
    return [];
  } finally {
    await page.close();
  }
}

/**
 * Download and process an image
 */
async function processImageUrl(url, equipment) {
  try {
    console.log(`    🔄 Processing image...`);
    
    // Download image with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Check image with sharp
    const metadata = await sharp(buffer).metadata();
    
    if (metadata.width < CONFIG.minImageSize || metadata.height < CONFIG.minImageSize) {
      console.log(`    ❌ Image too small: ${metadata.width}x${metadata.height}`);
      return null;
    }
    
    // Process image
    const processed = await sharp(buffer)
      .resize(CONFIG.targetSize, CONFIG.targetSize, {
        fit: 'inside',
        withoutEnlargement: true,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({ quality: 85 })
      .toBuffer();
    
    // Generate filename
    const timestamp = Date.now();
    const safeModel = equipment.model.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const fileName = `${equipment.brand.toLowerCase()}/${safeModel}-${timestamp}.png`;
    
    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from('equipment-images')
      .upload(fileName, processed, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (error) {
      console.log(`    ❌ Upload error: ${error.message}`);
      return null;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('equipment-images')
      .getPublicUrl(fileName);
    
    console.log(`    ✅ Image uploaded successfully`);
    return publicUrl;
    
  } catch (error) {
    console.log(`    ❌ Processing error: ${error.message}`);
    return null;
  }
}

/**
 * Main collector function
 */
async function collectPhotos(limit = 5) {
  console.log('🚀 Starting Equipment Photo Collection\n');
  console.log('=' .repeat(60) + '\n');
  
  const browser = await puppeteer.launch({
    headless: CONFIG.headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080'
    ]
  });
  
  const stats = {
    processed: 0,
    success: 0,
    failed: 0
  };
  
  try {
    const equipment = await findEquipmentNeedingPhotos(limit);
    
    for (const item of equipment) {
      stats.processed++;
      console.log(`[${stats.processed}/${equipment.length}] ${item.brand} ${item.model}`);
      
      // Search for images
      const imageUrls = await searchForImages(browser, item);
      
      if (imageUrls.length === 0) {
        console.log(`  ❌ No images found\n`);
        stats.failed++;
        continue;
      }
      
      // Try to process images until one succeeds
      let successUrl = null;
      for (const url of imageUrls) {
        successUrl = await processImageUrl(url, item);
        if (successUrl) break;
      }
      
      if (successUrl) {
        // Update database
        const { error } = await supabase
          .from('equipment')
          .update({ 
            image_url: successUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);
        
        if (!error) {
          console.log(`  ✅ Updated database with new image\n`);
          stats.success++;
        } else {
          console.log(`  ❌ Database update failed: ${error.message}\n`);
          stats.failed++;
        }
      } else {
        console.log(`  ❌ Could not process any images\n`);
        stats.failed++;
      }
      
      // Rate limiting
      if (stats.processed < equipment.length) {
        console.log(`⏳ Waiting ${CONFIG.delayBetweenItems / 1000}s before next item...\n`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenItems));
      }
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
    
    // Print summary
    console.log('=' .repeat(60));
    console.log('\n📊 Collection Summary:');
    console.log(`  ✅ Success: ${stats.success}/${stats.processed}`);
    console.log(`  ❌ Failed: ${stats.failed}/${stats.processed}`);
    console.log(`  📈 Success rate: ${Math.round((stats.success / stats.processed) * 100)}%`);
    console.log('\n✨ Collection complete!\n');
  }
}

// Run the collector
const limit = parseInt(process.argv[2]) || 5;
console.log(`Starting collection for ${limit} items...\n`);

collectPhotos(limit).catch(console.error);