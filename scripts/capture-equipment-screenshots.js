#!/usr/bin/env node

/**
 * Capture REAL equipment photos using Puppeteer screenshots
 * Instead of downloading URLs, we'll take screenshots of actual product images
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

// Add stealth plugin
puppeteer.use(StealthPlugin());

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Capture screenshot of product image from 2nd Swing
 */
async function capture2ndSwingImage(browser, equipment) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    // Search URL for 2nd Swing
    const searchQuery = `${equipment.brand} ${equipment.model}`.replace(/\s+/g, '+');
    const searchUrl = `https://www.2ndswing.com/search/?q=${searchQuery}`;
    
    console.log(`  🔍 Searching 2nd Swing for ${equipment.brand} ${equipment.model}...`);
    
    // Navigate to search results
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for search results
    await page.waitForSelector('.product-results-wrapper', { timeout: 5000 }).catch(() => null);
    
    // Click on first product result
    const firstProduct = await page.$('.product-box a');
    if (firstProduct) {
      await firstProduct.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Wait for main product image
      await page.waitForSelector('.main-product-photo img, .product-image img', { timeout: 5000 });
      
      // Get the main product image element
      const imageElement = await page.$('.main-product-photo img, .product-image img');
      
      if (imageElement) {
        // Take screenshot of just the product image
        const screenshot = await imageElement.screenshot({
          type: 'png',
          omitBackground: true
        });
        
        console.log(`  ✅ Captured screenshot from 2nd Swing`);
        return screenshot;
      }
    }
  } catch (error) {
    console.log(`  ❌ 2nd Swing error: ${error.message}`);
  } finally {
    await page.close();
  }
  
  return null;
}

/**
 * Capture screenshot of product image from TGW (The Golf Warehouse)
 */
async function captureTGWImage(browser, equipment) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    const searchQuery = `${equipment.brand} ${equipment.model}`.replace(/\s+/g, '+');
    const searchUrl = `https://www.tgw.com/search?q=${searchQuery}`;
    
    console.log(`  🔍 Searching TGW for ${equipment.brand} ${equipment.model}...`);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for product grid
    await page.waitForSelector('.product-grid', { timeout: 5000 }).catch(() => null);
    
    // Click first product
    const firstProduct = await page.$('.product-grid .product-tile a');
    if (firstProduct) {
      await firstProduct.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Wait for main image
      await page.waitForSelector('.product-image-main img', { timeout: 5000 });
      
      const imageElement = await page.$('.product-image-main img');
      
      if (imageElement) {
        const screenshot = await imageElement.screenshot({
          type: 'png',
          omitBackground: true
        });
        
        console.log(`  ✅ Captured screenshot from TGW`);
        return screenshot;
      }
    }
  } catch (error) {
    console.log(`  ❌ TGW error: ${error.message}`);
  } finally {
    await page.close();
  }
  
  return null;
}

/**
 * Capture screenshot from Google Images
 */
async function captureGoogleImage(browser, equipment) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    const searchQuery = `${equipment.brand} ${equipment.model} golf ${equipment.category} product photo -used -ebay`;
    const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery)}`;
    
    console.log(`  🔍 Searching Google Images...`);
    
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for images to load
    await page.waitForSelector('img[jsname="Q4LuWd"]', { timeout: 5000 });
    
    // Click on the first large product image
    const firstImage = await page.$('img[jsname="Q4LuWd"]');
    if (firstImage) {
      await firstImage.click();
      
      // Wait for the full-size image panel
      await page.waitForSelector('img[jsname="kn3ccd"]', { timeout: 5000 });
      
      // Get the full-size image
      const fullImage = await page.$('img[jsname="kn3ccd"]');
      
      if (fullImage) {
        const screenshot = await fullImage.screenshot({
          type: 'png',
          omitBackground: true
        });
        
        console.log(`  ✅ Captured screenshot from Google Images`);
        return screenshot;
      }
    }
  } catch (error) {
    console.log(`  ❌ Google Images error: ${error.message}`);
  } finally {
    await page.close();
  }
  
  return null;
}

/**
 * Main function to capture equipment screenshots
 */
async function captureEquipmentScreenshots() {
  console.log('📸 Starting Equipment Screenshot Capture\n');
  console.log('=' .repeat(60) + '\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080'
    ]
  });
  
  try {
    // Get drivers that need real images
    const { data: drivers } = await supabase
      .from('equipment')
      .select('id, brand, model, category')
      .eq('category', 'driver')
      .limit(5);  // Start with 5 for testing
    
    console.log(`Found ${drivers?.length || 0} drivers to process\n`);
    
    let successCount = 0;
    
    for (const driver of drivers || []) {
      console.log(`\n📦 Processing: ${driver.brand} ${driver.model}`);
      
      let screenshot = null;
      
      // Try different sources
      screenshot = await capture2ndSwingImage(browser, driver);
      
      if (!screenshot) {
        screenshot = await captureTGWImage(browser, driver);
      }
      
      if (!screenshot) {
        screenshot = await captureGoogleImage(browser, driver);
      }
      
      if (screenshot) {
        // Upload to Supabase storage
        const fileName = `${driver.brand.toLowerCase()}/${driver.model.toLowerCase().replace(/\s+/g, '-')}-screenshot.png`;
        
        const { error: uploadError } = await supabase.storage
          .from('equipment-images')
          .upload(fileName, screenshot, {
            contentType: 'image/png',
            upsert: true
          });
        
        if (!uploadError) {
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('equipment-images')
            .getPublicUrl(fileName);
          
          // Update or create in equipment_photos
          const { error: dbError } = await supabase
            .from('equipment_photos')
            .upsert({
              equipment_id: driver.id,
              photo_url: publicUrl,
              is_primary: true,
              source: 'screenshot'
            }, {
              onConflict: 'equipment_id,photo_url'
            });
          
          if (!dbError) {
            console.log(`  ✅ Successfully saved screenshot!`);
            successCount++;
          } else {
            console.log(`  ❌ Database error: ${dbError.message}`);
          }
        } else {
          console.log(`  ❌ Upload error: ${uploadError.message}`);
        }
      } else {
        console.log(`  ❌ Could not capture screenshot from any source`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log(`\n✅ Successfully captured ${successCount} screenshots`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
  }
}

// Run it
captureEquipmentScreenshots().catch(console.error);