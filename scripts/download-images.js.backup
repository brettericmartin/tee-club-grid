import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function downloadEquipmentImages() {
  console.log('📸 Starting image download process...\n');
  
  try {
    // Read scraped data
    const dataPath = path.join(path.dirname(__dirname), 'data', 'scraped-equipment.json');
    const jsonData = await fs.readFile(dataPath, 'utf-8');
    const equipment = JSON.parse(jsonData);
    
    console.log(`Found ${equipment.length} equipment items\n`);
    
    // Create images directory
    const imagesDir = path.join(path.dirname(__dirname), 'public', 'images', 'equipment');
    await fs.mkdir(imagesDir, { recursive: true });
    
    let downloadedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each equipment item
    for (let i = 0; i < equipment.length; i++) {
      const item = equipment[i];
      
      if (!item.image_url) {
        console.log(`⏭️  Skipping ${item.brand} ${item.model} - No image URL`);
        skippedCount++;
        continue;
      }
      
      // Generate filename
      const year = item.release_year || 'unknown';
      const filename = `${slugify(item.brand)}-${slugify(item.model)}-${year}.jpg`;
      const filepath = path.join(imagesDir, filename);
      
      // Check if already exists
      try {
        await fs.access(filepath);
        console.log(`✅ Already exists: ${filename}`);
        skippedCount++;
        
        // Update the equipment data with local path
        equipment[i].local_image_path = `/images/equipment/${filename}`;
        continue;
      } catch {
        // File doesn't exist, proceed with download
      }
      
      // Download image
      console.log(`Downloading ${i + 1}/${equipment.length}: ${filename}...`);
      
      try {
        await downloadImage(item.image_url, filepath);
        console.log(`✅ Downloaded: ${filename}`);
        downloadedCount++;
        
        // Update the equipment data with local path
        equipment[i].local_image_path = `/images/equipment/${filename}`;
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Failed to download ${filename}: ${error.message}`);
        errorCount++;
      }
    }
    
    // Save updated equipment data with local paths
    const updatedDataPath = path.join(path.dirname(__dirname), 'data', 'scraped-equipment-with-images.json');
    await fs.writeFile(
      updatedDataPath,
      JSON.stringify(equipment, null, 2)
    );
    
    console.log('\n📊 Download Summary:');
    console.log(`✅ Downloaded: ${downloadedCount} images`);
    console.log(`⏭️  Skipped: ${skippedCount} (already exist or no URL)`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`\n📁 Images saved to: ${imagesDir}`);
    console.log(`📄 Updated data saved to: ${updatedDataPath}`);
    
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the downloader
downloadEquipmentImages().catch(console.error);