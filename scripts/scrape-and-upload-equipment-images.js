import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Downloads images from URLs and uploads them to Supabase Storage
 * Creates proper entries in equipment_photos table
 */

// System user ID for scraped images
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

async function downloadImage(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const buffer = Buffer.from(response.data);
    
    return { buffer, contentType };
  } catch (error) {
    console.error(`Failed to download ${url}:`, error.message);
    return null;
  }
}

async function uploadToSupabase(equipmentId, imageBuffer, contentType) {
  const fileExt = contentType.split('/')[1] || 'jpg';
  const fileName = `${SYSTEM_USER_ID}/${equipmentId}/${Date.now()}-equipment.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('equipment-photos')
    .upload(fileName, imageBuffer, {
      contentType: contentType,
      upsert: false
    });
    
  if (error) {
    console.error('Upload error:', error);
    return null;
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('equipment-photos')
    .getPublicUrl(fileName);
    
  return publicUrl;
}

async function createPhotoRecord(equipmentId, photoUrl, isPrimary = false) {
  const { error } = await supabase
    .from('equipment_photos')
    .insert({
      id: uuidv4(),
      equipment_id: equipmentId,
      user_id: SYSTEM_USER_ID,
      photo_url: photoUrl,
      caption: 'Official product image',
      is_primary: isPrimary,
      likes_count: isPrimary ? 10 : 5 // Give official images some initial likes
    });
    
  if (error) {
    console.error('Database insert error:', error);
    return false;
  }
  
  return true;
}

async function processEquipment() {
  console.log('🏌️ Starting equipment image scraping and upload...\n');
  
  // First, clear existing system photos to avoid duplicates
  console.log('Clearing existing system photos...');
  await supabase
    .from('equipment_photos')
    .delete()
    .eq('user_id', SYSTEM_USER_ID);
  
  // Get all equipment with image URLs
  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, brand, model, category, image_url')
    .not('image_url', 'is', null)
    .order('category');
    
  console.log(`Found ${equipment.length} equipment items with image URLs\n`);
  
  let successCount = 0;
  let failedCount = 0;
  const categoryStats = {};
  
  // Process in batches of 5 to avoid overwhelming the server
  for (let i = 0; i < equipment.length; i += 5) {
    const batch = equipment.slice(i, i + 5);
    
    await Promise.all(batch.map(async (item) => {
      try {
        console.log(`Processing ${item.brand} ${item.model}...`);
        
        // Download the image
        const imageData = await downloadImage(item.image_url);
        if (!imageData) {
          failedCount++;
          return;
        }
        
        // Upload to Supabase Storage
        const publicUrl = await uploadToSupabase(item.id, imageData.buffer, imageData.contentType);
        if (!publicUrl) {
          failedCount++;
          return;
        }
        
        // Create database record
        const created = await createPhotoRecord(item.id, publicUrl, true);
        if (!created) {
          failedCount++;
          return;
        }
        
        successCount++;
        categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
        console.log(`✅ ${item.brand} ${item.model} - Image uploaded successfully`);
        
      } catch (error) {
        console.error(`❌ ${item.brand} ${item.model} - Error:`, error.message);
        failedCount++;
      }
    }));
    
    console.log(`Progress: ${i + batch.length}/${equipment.length}`);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ Scraping complete!');
  console.log(`Successfully uploaded: ${successCount} images`);
  console.log(`Failed: ${failedCount} images`);
  
  console.log('\n📊 Uploads by category:');
  Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(15)} ${count} items`);
    });
    
  // Clean up the unused equipment-images bucket
  console.log('\n🗑️  Removing unused equipment-images bucket...');
  const { error: bucketError } = await supabase.storage.deleteBucket('equipment-images');
  if (bucketError) {
    console.log('Could not delete equipment-images bucket:', bucketError.message);
  } else {
    console.log('✅ Removed equipment-images bucket');
  }
}

// First ensure system user exists
async function ensureSystemUser() {
  const { data: user } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', SYSTEM_USER_ID)
    .single();
    
  if (!user) {
    console.log('Creating system user...');
    await supabase
      .from('profiles')
      .insert({
        id: SYSTEM_USER_ID,
        username: 'system',
        display_name: 'Teed.club',
        bio: 'Official equipment images'
      });
  }
}

async function main() {
  await ensureSystemUser();
  await processEquipment();
}

main().catch(console.error);