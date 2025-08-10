#!/usr/bin/env node

/**
 * Capture REAL driver images using Puppeteer
 * Focuses on sites that actually work
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import sharp from 'sharp';

dotenv.config({ path: '.env.local' });

puppeteer.use(StealthPlugin());

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Generate a simple driver image with text
 * Fallback when we can't capture a real image
 */
async function generateDriverImage(driver) {
  const width = 600;
  const height = 600;
  
  // Create an SVG with the driver info
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#1a1a1a"/>
      <rect x="50" y="50" width="${width-100}" height="${height-100}" fill="#2a2a2a" stroke="#10B981" stroke-width="2"/>
      <text x="${width/2}" y="${height/2 - 40}" font-family="Arial, sans-serif" font-size="32" fill="#10B981" text-anchor="middle" font-weight="bold">
        ${driver.brand}
      </text>
      <text x="${width/2}" y="${height/2 + 10}" font-family="Arial, sans-serif" font-size="28" fill="white" text-anchor="middle">
        ${driver.model}
      </text>
      <text x="${width/2}" y="${height/2 + 50}" font-family="Arial, sans-serif" font-size="20" fill="#888" text-anchor="middle">
        DRIVER
      </text>
      <circle cx="${width/2}" cy="${height - 100}" r="30" fill="none" stroke="#10B981" stroke-width="2"/>
      <circle cx="${width/2}" cy="${height - 100}" r="3" fill="#10B981"/>
      <line x1="${width/2 - 20}" y1="${height - 100}" x2="${width/2 + 20}" y2="${height - 100}" stroke="#10B981" stroke-width="2"/>
      <line x1="${width/2}" y1="${height - 120}" x2="${width/2}" y2="${height - 80}" stroke="#10B981" stroke-width="2"/>
    </svg>
  `;
  
  // Convert SVG to PNG using sharp
  const buffer = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();
  
  return buffer;
}

/**
 * Try to capture from DuckDuckGo image search (more reliable than Google)
 */
async function captureDuckDuckGoImage(browser, driver) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    const query = `${driver.brand} ${driver.model} golf driver product`;
    const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
    
    console.log(`  🔍 Searching DuckDuckGo Images...`);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for images to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Try to find and capture an image
    const images = await page.$$('.tile--img__img');
    
    if (images.length > 0) {
      // Take screenshot of first image
      const screenshot = await images[0].screenshot({
        type: 'png',
        omitBackground: true
      });
      
      console.log(`  ✅ Captured from DuckDuckGo`);
      return screenshot;
    }
  } catch (error) {
    console.log(`  ⚠️ DuckDuckGo error: ${error.message}`);
  } finally {
    await page.close();
  }
  
  return null;
}

async function captureRealDriverImages() {
  console.log('🏌️ Capturing Real Driver Images\n');
  console.log('=' .repeat(60) + '\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });
  
  try {
    // Get drivers that need images
    const { data: drivers } = await supabase
      .from('equipment')
      .select('id, brand, model, category')
      .eq('category', 'driver')
      .limit(10);
    
    console.log(`Processing ${drivers?.length || 0} drivers\n`);
    
    let successCount = 0;
    let generatedCount = 0;
    
    for (const driver of drivers || []) {
      console.log(`\n📦 ${driver.brand} ${driver.model}`);
      
      let imageBuffer = null;
      let imageType = 'generated';
      
      // Try to capture a real screenshot
      imageBuffer = await captureDuckDuckGoImage(browser, driver);
      
      if (imageBuffer) {
        imageType = 'screenshot';
      } else {
        // Generate a placeholder image with driver info
        console.log(`  🎨 Generating custom image...`);
        imageBuffer = await generateDriverImage(driver);
        generatedCount++;
      }
      
      if (imageBuffer) {
        // Upload to Supabase
        const fileName = `${driver.brand.toLowerCase()}/${driver.model.toLowerCase().replace(/\s+/g, '-')}-${imageType}.png`;
        
        const { error: uploadError } = await supabase.storage
          .from('equipment-images')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            upsert: true
          });
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('equipment-images')
            .getPublicUrl(fileName);
          
          // Delete old entries
          await supabase
            .from('equipment_photos')
            .delete()
            .eq('equipment_id', driver.id);
          
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
            console.log(`  ✅ Saved ${imageType} image!`);
            successCount++;
          } else {
            console.log(`  ❌ Database error: ${dbError.message}`);
          }
        } else {
          console.log(`  ❌ Upload error: ${uploadError.message}`);
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('\n📊 Results:');
    console.log(`  ✅ Total processed: ${successCount}`);
    console.log(`  📸 Screenshots: ${successCount - generatedCount}`);
    console.log(`  🎨 Generated: ${generatedCount}`);
    console.log('\n✨ Images ready at: http://localhost:3333/equipment?category=driver\n');
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
  }
}

// Run it
captureRealDriverImages().catch(console.error);