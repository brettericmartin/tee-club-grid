#!/usr/bin/env node

/**
 * Simple screenshot capture for driver images
 * Uses direct product URLs and captures visible images
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

puppeteer.use(StealthPlugin());

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Direct product URLs for popular drivers
const DRIVER_PRODUCT_URLS = {
  'Qi10': 'https://www.taylormadegolf.com/Qi10-Driver/DW-JQ912.html',
  'Qi10 Max': 'https://www.taylormadegolf.com/Qi10-Max-Driver/DW-JQ913.html',
  'Qi10 LS': 'https://www.taylormadegolf.com/Qi10-LS-Driver/DW-JQ914.html',
  'Paradym Ai Smoke': 'https://www.callawaygolf.com/golf-clubs/drivers/paradym-ai-smoke-driver/',
  'Paradym Ai Smoke MAX': 'https://www.callawaygolf.com/golf-clubs/drivers/paradym-ai-smoke-max-driver/',
  'G430 Max': 'https://ping.com/en-us/clubs/drivers/g430-max',
  'G430 LST': 'https://ping.com/en-us/clubs/drivers/g430-lst',
  'Darkspeed': 'https://www.cobragolf.com/darkspeed-driver',
  'TSR3': 'https://www.titleist.com/golf-clubs/drivers/tsr3',
  'TSR2': 'https://www.titleist.com/golf-clubs/drivers/tsr2'
};

/**
 * Capture screenshot from a specific URL
 */
async function captureFromUrl(browser, url, equipment) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    console.log(`  📸 Capturing from: ${url.substring(0, 50)}...`);
    
    // Navigate to page
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    // Wait a bit for images to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try different selectors for product images
    const selectors = [
      '.product-image-main img',
      '.product-hero img',
      '.pdp-image img',
      '.primary-image img',
      '#product-image img',
      '.product-photo img',
      'img[alt*="' + equipment.model + '"]',
      'img[title*="' + equipment.model + '"]',
      '.gallery-image img',
      'picture img'
    ];
    
    let screenshot = null;
    
    for (const selector of selectors) {
      const element = await page.$(selector);
      if (element) {
        // Check if element is visible
        const isVisible = await element.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 100 && rect.height > 100;
        });
        
        if (isVisible) {
          screenshot = await element.screenshot({
            type: 'png',
            omitBackground: true
          });
          console.log(`  ✅ Captured using selector: ${selector}`);
          break;
        }
      }
    }
    
    // If no specific image found, try to capture the largest image on page
    if (!screenshot) {
      const largestImage = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        let largest = null;
        let maxSize = 0;
        
        images.forEach(img => {
          const size = img.width * img.height;
          if (size > maxSize && img.width > 200 && img.src && !img.src.includes('logo')) {
            maxSize = size;
            largest = img;
          }
        });
        
        return largest ? images.indexOf(largest) : -1;
      });
      
      if (largestImage >= 0) {
        const images = await page.$$('img');
        if (images[largestImage]) {
          screenshot = await images[largestImage].screenshot({
            type: 'png',
            omitBackground: true
          });
          console.log(`  ✅ Captured largest image on page`);
        }
      }
    }
    
    return screenshot;
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return null;
  } finally {
    await page.close();
  }
}

/**
 * Simple Google Images screenshot
 */
async function captureGoogleImageSimple(browser, equipment) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    const searchQuery = `${equipment.brand} ${equipment.model} golf driver official product`;
    const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery)}`;
    
    console.log(`  🔍 Trying Google Images...`);
    
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Just capture the first visible image
    const firstImage = await page.$('img[class="rg_i"]');
    if (firstImage) {
      const screenshot = await firstImage.screenshot({
        type: 'png',
        omitBackground: true
      });
      console.log(`  ✅ Captured from Google Images`);
      return screenshot;
    }
  } catch (error) {
    console.log(`  ❌ Google Images error: ${error.message}`);
  } finally {
    await page.close();
  }
  
  return null;
}

async function captureDriverScreenshots() {
  console.log('📸 Starting Simple Driver Screenshot Capture\n');
  console.log('=' .repeat(60) + '\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080'
    ]
  });
  
  try {
    // Get drivers to process
    const { data: drivers } = await supabase
      .from('equipment')
      .select('id, brand, model, category')
      .eq('category', 'driver')
      .in('model', Object.keys(DRIVER_PRODUCT_URLS))
      .limit(3); // Start with 3 for testing
    
    console.log(`Found ${drivers?.length || 0} drivers with known URLs\n`);
    
    let successCount = 0;
    
    for (const driver of drivers || []) {
      console.log(`\n📦 Processing: ${driver.brand} ${driver.model}`);
      
      let screenshot = null;
      
      // Try direct URL if we have one
      const directUrl = DRIVER_PRODUCT_URLS[driver.model];
      if (directUrl) {
        screenshot = await captureFromUrl(browser, directUrl, driver);
      }
      
      // Fallback to Google Images
      if (!screenshot) {
        screenshot = await captureGoogleImageSimple(browser, driver);
      }
      
      if (screenshot) {
        // Upload to Supabase
        const fileName = `${driver.brand.toLowerCase()}/${driver.model.toLowerCase().replace(/\s+/g, '-')}-real.png`;
        
        const { error: uploadError } = await supabase.storage
          .from('equipment-images')
          .upload(fileName, screenshot, {
            contentType: 'image/png',
            upsert: true
          });
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('equipment-images')
            .getPublicUrl(fileName);
          
          // Delete old bad entry if exists
          await supabase
            .from('equipment_photos')
            .delete()
            .eq('equipment_id', driver.id)
            .like('photo_url', '%equipment-images%');
          
          // Insert new photo
          const { error: dbError } = await supabase
            .from('equipment_photos')
            .insert({
              equipment_id: driver.id,
              photo_url: publicUrl,
              is_primary: true,
              likes_count: 0
            });
          
          if (!dbError) {
            console.log(`  ✅ Successfully saved real screenshot!`);
            successCount++;
          } else {
            console.log(`  ❌ Database error: ${dbError.message}`);
          }
        } else {
          console.log(`  ❌ Upload error: ${uploadError.message}`);
        }
      } else {
        console.log(`  ❌ Could not capture screenshot`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log(`\n✅ Successfully captured ${successCount} real screenshots`);
    console.log('\nCheck them at: http://localhost:3333/equipment?category=driver\n');
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
  }
}

// Run it
captureDriverScreenshots().catch(console.error);