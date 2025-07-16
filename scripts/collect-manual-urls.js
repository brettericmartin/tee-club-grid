import axios from 'axios';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Manual curated list of equipment image URLs
// These are publicly available product images from various sources
const EQUIPMENT_IMAGE_URLS = {
  // Balls
  'Pro V1': 'https://m.media-amazon.com/images/I/71hXdOIfpJL._AC_SL1500_.jpg',
  'Chrome Soft X LS': 'https://m.media-amazon.com/images/I/81xQKYNcJwL._AC_SL1500_.jpg',
  'Chrome Soft': 'https://m.media-amazon.com/images/I/81wGmJOQsYL._AC_SL1500_.jpg',
  'Vice Pro Plus': 'https://m.media-amazon.com/images/I/51-e6j0M0ML._AC_.jpg',
  'Vice Pro Soft': 'https://m.media-amazon.com/images/I/51O8L-gOw9L._AC_.jpg',
  'Z-STAR': 'https://m.media-amazon.com/images/I/71SZRJtUKoL._AC_SL1500_.jpg',
  'Tour B RX': 'https://m.media-amazon.com/images/I/81B8Cx7Ue1L._AC_SL1500_.jpg',
  'Supersoft MAX': 'https://m.media-amazon.com/images/I/81hAAhDBOBL._AC_SL1500_.jpg',
  
  // Drivers  
  'G430 Max': 'https://m.media-amazon.com/images/I/71-6RfkRkQL._AC_SL1500_.jpg',
  
  // Rangefinders
  'Tour V6': 'https://m.media-amazon.com/images/I/61rwkYbNKKL._AC_SL1500_.jpg',
  
  // Putters
  'Newport 2 Plus': 'https://m.media-amazon.com/images/I/71+YRsXXn3L._AC_SL1500_.jpg',
  'Special Select Newport 2': 'https://m.media-amazon.com/images/I/71+YRsXXn3L._AC_SL1500_.jpg'
};

async function findEquipmentByName(name) {
  const { data, error } = await supabase
    .from('equipment')
    .select('id, brand, model')
    .or('image_url.is.null,image_url.eq.""')
    .ilike('model', `%${name}%`)
    .limit(1)
    .single();
    
  if (error || !data) {
    return null;
  }
  
  return data;
}

async function downloadAndProcessImage(url, equipment) {
  try {
    console.log(`  📥 Downloading from: ${url.substring(0, 50)}...`);
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.amazon.com/'
      }
    });
    
    // Process with sharp
    const processed = await sharp(Buffer.from(response.data))
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
      
    console.log(`  ✅ Successfully uploaded to Supabase`);
    return true;
    
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function collectManualImages() {
  console.log('🚀 Starting Manual Image Collection');
  console.log('📋 Using curated list of equipment image URLs\n');
  
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  
  for (const [equipmentName, imageUrl] of Object.entries(EQUIPMENT_IMAGE_URLS)) {
    console.log(`\n🔍 Processing: ${equipmentName}`);
    
    // Find equipment in database
    const equipment = await findEquipmentByName(equipmentName);
    
    if (!equipment) {
      console.log(`  ⏭️  Skipping - not found in database`);
      skipCount++;
      continue;
    }
    
    console.log(`  📌 Found: ${equipment.brand} ${equipment.model}`);
    
    const success = await downloadAndProcessImage(imageUrl, equipment);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Summary:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ⏭️  Skipped: ${skipCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
}

// Alternative: Provide equipment IDs and URLs manually
async function collectSpecificImages(equipmentData) {
  console.log('🚀 Starting Specific Image Collection\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const { id, url } of equipmentData) {
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select('id, brand, model')
      .eq('id', id)
      .single();
      
    if (error || !equipment) {
      console.log(`❌ Equipment ID ${id} not found`);
      failCount++;
      continue;
    }
    
    console.log(`\n📸 ${equipment.brand} ${equipment.model}`);
    
    const success = await downloadAndProcessImage(url, equipment);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Summary:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
}

// Example usage - you can modify this list with actual equipment IDs and image URLs
const specificEquipment = [
  // Add equipment here in format: { id: 'equipment-uuid', url: 'https://...' }
];

// Run the appropriate function
if (process.argv[2] === 'specific' && specificEquipment.length > 0) {
  await collectSpecificImages(specificEquipment);
} else {
  await collectManualImages();
}