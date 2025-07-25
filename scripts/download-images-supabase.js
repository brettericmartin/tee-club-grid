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
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('equipment-images')
      .getPublicUrl(filename);
    
    return publicUrl;
  } catch (error) {
    throw new Error(`Failed to upload to Supabase: ${error.message}`);
  }
}

async function downloadAndUploadImages() {
  console.log('📸 Starting image download and upload process...\n');
  
  try {
    // Create temp directory for downloads
    const tempDir = path.join(__dirname, 'temp-images');
    await fs.mkdir(tempDir, { recursive: true });
    
    // Option 1: Process scraped JSON files
    console.log('🔍 Looking for scraped equipment data...');
    const scrapedDataDir = path.join(__dirname, 'scraped-data');
    let jsonFiles = [];
    
    try {
      const files = await fs.readdir(scrapedDataDir);
      jsonFiles = files.filter(f => f.endsWith('.json'));
    } catch (error) {
      console.log('No scraped data found, will check database instead');
    }
    
    let equipmentToProcess = [];
    
    if (jsonFiles.length > 0) {
      // Process from JSON files
      console.log(`Found ${jsonFiles.length} data files\n`);
      
      for (const file of jsonFiles) {
        const filePath = path.join(scrapedDataDir, file);
        const jsonData = await fs.readFile(filePath, 'utf-8');
        const equipment = JSON.parse(jsonData);
        equipmentToProcess.push(...equipment);
      }
    } else {
      // Process from database
      console.log('📊 Fetching equipment from database...');
      const { data: equipment, error } = await supabase
        .from('equipment')
        .select('*')
        .or('image_url.is.null,image_url.not.like.%supabase%')
        .limit(100);
      
      if (error) throw error;
      equipmentToProcess = equipment || [];
    }
    
    console.log(`Found ${equipmentToProcess.length} equipment items to process\n`);
    
    let downloadedCount = 0;
    let uploadedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each equipment item
    for (let i = 0; i < equipmentToProcess.length; i++) {
      const item = equipmentToProcess[i];
      
      // Skip if no image URL or already has Supabase URL
      if (!item.image_url || item.image_url.includes('supabase')) {
        skippedCount++;
        continue;
      }
      
      // Generate filename
      const year = item.specs?.year || item.release_year || 'na';
      const filename = `${slugify(item.brand)}-${slugify(item.model)}-${year}-${Date.now()}.jpg`;
      const tempFilepath = path.join(tempDir, filename);
      
      console.log(`Processing ${i + 1}/${equipmentToProcess.length}: ${item.brand} ${item.model}...`);
      
      try {
        // Download image
        console.log(`  📥 Downloading image...`);
        await downloadImage(item.image_url, tempFilepath);
        downloadedCount++;
        
        // Upload to Supabase
        console.log(`  📤 Uploading to Supabase...`);
        const publicUrl = await uploadToSupabase(tempFilepath, filename);
        uploadedCount++;
        
        // Update database if item has an ID
        if (item.id) {
          const { error: updateError } = await supabase
            .from('equipment')
            .update({ image_url: publicUrl })
            .eq('id', item.id);
          
          if (updateError) {
            console.error(`  ⚠️  Failed to update database:`, updateError.message);
          } else {
            console.log(`  ✅ Updated database with new image URL`);
          }
        }
        
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
    
    // Clean up temp directory
    await fs.rmdir(tempDir).catch(() => {});
    
    console.log('\n📊 Download & Upload Summary:');
    console.log(`✅ Downloaded: ${downloadedCount} images`);
    console.log(`☁️  Uploaded: ${uploadedCount} images`);
    console.log(`⏭️  Skipped: ${skippedCount} (no URL or already uploaded)`);
    console.log(`❌ Errors: ${errorCount}`);
    
    console.log('\n✨ Image processing complete!');
    
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Alternative: Process equipment already in database
async function processExistingEquipment() {
  console.log('📸 Processing equipment images from database...\n');
  
  try {
    // Find equipment without Supabase images
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select('*')
      .or('image_url.is.null,image_url.not.like.%supabase%')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    console.log(`Found ${equipment?.length || 0} equipment items without Supabase images\n`);
    
    if (!equipment || equipment.length === 0) {
      console.log('✅ All equipment already has images!');
      return;
    }
    
    // Create temp directory
    const tempDir = path.join(__dirname, 'temp-images');
    await fs.mkdir(tempDir, { recursive: true });
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const item of equipment) {
      console.log(`\nProcessing: ${item.brand} ${item.model}`);
      
      try {
        // Skip if no image URL
        if (!item.image_url) {
          console.log('  ⏭️  No image URL, searching online...');
          // Could implement image search here
          continue;
        }
        
        // Generate filename
        const filename = `${slugify(item.brand)}-${slugify(item.model)}-${item.id}.jpg`;
        const tempFilepath = path.join(tempDir, filename);
        
        // Download
        console.log('  📥 Downloading...');
        await downloadImage(item.image_url, tempFilepath);
        
        // Upload
        console.log('  📤 Uploading to Supabase...');
        const publicUrl = await uploadToSupabase(tempFilepath, filename);
        
        // Update database
        const { error: updateError } = await supabase
          .from('equipment')
          .update({ image_url: publicUrl })
          .eq('id', item.id);
        
        if (updateError) throw updateError;
        
        console.log('  ✅ Success!');
        processedCount++;
        
        // Clean up
        await fs.unlink(tempFilepath).catch(() => {});
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error('  ❌ Error:', error.message);
        errorCount++;
      }
    }
    
    // Clean up temp directory
    await fs.rmdir(tempDir).catch(() => {});
    
    console.log('\n📊 Summary:');
    console.log(`✅ Processed: ${processedCount} images`);
    console.log(`❌ Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const mode = args[0] || 'scraped';

if (mode === 'db' || mode === 'database') {
  // Process existing database equipment
  processExistingEquipment().catch(console.error);
} else {
  // Default: process scraped data
  downloadAndUploadImages().catch(console.error);
}