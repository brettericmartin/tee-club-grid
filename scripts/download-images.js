import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Helper to create slug from text
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function downloadImage(url, filepath) {
  try {
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const writer = createWriteStream(filepath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    throw new Error(`Failed to download image: ${error.message}`);
  }
}

async function uploadToSupabase(filepath, filename) {
  try {
    const file = await fs.readFile(filepath);
    const { data, error } = await supabase.storage
      .from('equipment-images')
      .upload(filename, file, {
        contentType: 'image/jpeg',
        upsert: true
      });
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('equipment-images')
      .getPublicUrl(filename);
    
    return publicUrl;
  } catch (error) {
    throw new Error(`Failed to upload to Supabase: ${error.message}`);
  }
}

async function downloadEquipmentImages() {
  console.log('📸 Starting image download and upload process...\n');
  
  try {
    // Read scraped data - try multiple locations
    let equipment = [];
    const possiblePaths = [
      path.join(__dirname, 'scraped-data', 'golf-equipment.json'),
      path.join(__dirname, 'scraped-data', '2ndswing-equipment.json'),
      path.join(__dirname, 'scraped-data', 'multi-source-equipment.json'),
      path.join(path.dirname(__dirname), 'data', 'scraped-equipment.json')
    ];
    
    for (const dataPath of possiblePaths) {
      try {
        const jsonData = await fs.readFile(dataPath, 'utf-8');
        const data = JSON.parse(jsonData);
        equipment = equipment.concat(data);
        console.log(`Loaded ${data.length} items from ${path.basename(dataPath)}`);
      } catch (error) {
        // File doesn't exist, continue
      }
    }
    
    if (equipment.length === 0) {
      console.error('No equipment data found!');
      console.log('Please run one of the scraping scripts first:');
      console.log('  npm run scrape:golf');
      console.log('  npm run scrape:2ndswing');
      console.log('  npm run scrape:equipment');
      process.exit(1);
    }
    
    console.log(`Found ${equipment.length} equipment items\n`);
    
    // Create images directory
    const imagesDir = path.join(path.dirname(__dirname), 'public', 'images', 'equipment');
    await fs.mkdir(imagesDir, { recursive: true });
    
    let downloadedCount = 0;
    let uploadedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Create temp directory for downloads
    const tempDir = path.join(__dirname, 'temp-images');
    await fs.mkdir(tempDir, { recursive: true });
    
    // Process each equipment item
    for (let i = 0; i < equipment.length; i++) {
      const item = equipment[i];
      
      if (!item.image_url) {
        console.log(`⏭️  Skipping ${item.brand} ${item.model} - No image URL`);
        skippedCount++;
        continue;
      }
      
      // Generate filename
      const year = item.specs?.year || item.release_year || 'na';
      const filename = `${slugify(item.brand)}-${slugify(item.model)}-${year}-${Date.now()}.jpg`;
      const tempFilepath = path.join(tempDir, filename);
      const localFilepath = path.join(imagesDir, filename);
      
      // Skip if already has Supabase URL
      if (item.image_url && item.image_url.includes('supabase')) {
        console.log(`✅ Already uploaded: ${item.brand} ${item.model}`);
        skippedCount++;
        continue;
      }
      
      // Download image
      console.log(`Processing ${i + 1}/${equipment.length}: ${item.brand} ${item.model}...`);
      
      try {
        // Download to temp directory
        console.log(`  📥 Downloading...`);
        await downloadImage(item.image_url, tempFilepath);
        downloadedCount++;
        
        // Upload to Supabase
        console.log(`  📤 Uploading to Supabase...`);
        const publicUrl = await uploadToSupabase(tempFilepath, filename);
        uploadedCount++;
        
        // Update the equipment data
        equipment[i].supabase_image_url = publicUrl;
        equipment[i].local_image_path = `/images/equipment/${filename}`;
        
        // Copy to local images directory
        await fs.copyFile(tempFilepath, localFilepath);
        console.log(`  ✅ Success!`);
        
        // Clean up temp file
        await fs.unlink(tempFilepath).catch(() => {});
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        errorCount++;
        
        // Clean up temp file on error
        await fs.unlink(tempFilepath).catch(() => {});
      }
    }
    
    // Save updated equipment data with local paths
    const updatedDataPath = path.join(path.dirname(__dirname), 'data', 'scraped-equipment-with-images.json');
    await fs.writeFile(
      updatedDataPath,
      JSON.stringify(equipment, null, 2)
    );
    
    // Clean up temp directory
    await fs.rmdir(tempDir).catch(() => {});
    
    console.log('\n📊 Download & Upload Summary:');
    console.log(`✅ Downloaded: ${downloadedCount} images`);
    console.log(`☁️  Uploaded to Supabase: ${uploadedCount} images`);
    console.log(`⏭️  Skipped: ${skippedCount} (already uploaded or no URL)`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`\n📁 Local images saved to: ${imagesDir}`);
    console.log(`📄 Updated data saved to: ${updatedDataPath}`);
    console.log('\n✨ Next step: Run "npm run scrape:import" to update database with new image URLs');
    
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the downloader
downloadEquipmentImages().catch(console.error);