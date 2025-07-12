import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Using existing user
const SYSTEM_USER_ID = '68cf7bbe-e7d3-4255-a18c-f890766ff77b';

/**
 * Working, verified image URLs for key equipment
 */
const KEY_EQUIPMENT_IMAGES = {
  // Drivers
  'driver': 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800',
  // Irons
  'iron': 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800',
  // Wedges
  'wedge': 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800',
  // Putters
  'putter': 'https://images.unsplash.com/photo-1622396636133-ba43f812bc35?w=800',
  // Balls
  'balls': 'https://images.unsplash.com/photo-1557053964-937650b63311?w=800',
  // Bags
  'bags': 'https://images.unsplash.com/photo-1593111774867-82c1c775f312?w=800',
  // Gloves
  'gloves': 'https://images.unsplash.com/photo-1593111774545-6c9ef863f3f3?w=800',
  // Fairway woods
  'fairway_wood': 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800',
  // Hybrids
  'hybrid': 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800',
  // Accessories
  'accessories': 'https://images.unsplash.com/photo-1557053964-937650b63311?w=800',
  // Rangefinders
  'rangefinder': 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800',
  'rangefinders': 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800',
  // GPS
  'gps_devices': 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800'
};

async function downloadImage(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const buffer = Buffer.from(response.data);
    
    return { buffer, contentType };
  } catch (error) {
    console.error(`Failed to download: ${error.message}`);
    return null;
  }
}

async function uploadToSupabase(equipmentId, imageBuffer, contentType) {
  const fileExt = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
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

async function uploadKeyEquipment() {
  console.log('🏌️ Uploading images for key equipment items...\n');
  
  // Get equipment without photos
  const { data: equipment } = await supabase
    .from('equipment')
    .select(`
      id,
      brand,
      model,
      category,
      equipment_photos!left (id)
    `)
    .is('equipment_photos.id', null)
    .in('category', Object.keys(KEY_EQUIPMENT_IMAGES))
    .order('category')
    .limit(100);
    
  console.log(`Found ${equipment?.length || 0} equipment items without photos\n`);
  
  let successCount = 0;
  
  for (const item of equipment || []) {
    try {
      console.log(`Processing ${item.brand} ${item.model} (${item.category})...`);
      
      const imageUrl = KEY_EQUIPMENT_IMAGES[item.category];
      if (!imageUrl) {
        console.log('  No image URL for category');
        continue;
      }
      
      // Download image
      const imageData = await downloadImage(imageUrl);
      if (!imageData) {
        console.log('  Failed to download');
        continue;
      }
      
      // Upload to storage
      const publicUrl = await uploadToSupabase(item.id, imageData.buffer, imageData.contentType);
      if (!publicUrl) {
        console.log('  Failed to upload');
        continue;
      }
      
      // Create database record
      const { error } = await supabase
        .from('equipment_photos')
        .insert({
          id: uuidv4(),
          equipment_id: item.id,
          user_id: SYSTEM_USER_ID,
          photo_url: publicUrl,
          caption: `${item.brand} ${item.model}`,
          is_primary: true,
          likes_count: 10
        });
        
      if (error) {
        console.log('  Database error:', error.message);
        continue;
      }
      
      successCount++;
      console.log('  ✅ Success!');
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`  Error: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Uploaded ${successCount} images`);
  
  // Show summary
  const { count } = await supabase
    .from('equipment_photos')
    .select('*', { count: 'exact', head: true });
    
  console.log(`Total photos in database: ${count}`);
  
  // Show categories with photos
  const { data: categoryCounts } = await supabase
    .from('equipment')
    .select(`
      category,
      equipment_photos!inner (id)
    `);
    
  const categoryStats = {};
  categoryCounts?.forEach(item => {
    categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
  });
  
  console.log('\nEquipment with photos by category:');
  Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(15)} ${count} items`);
    });
}

uploadKeyEquipment().catch(console.error);