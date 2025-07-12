import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Using the first existing user for system uploads
const SYSTEM_USER_ID = '68cf7bbe-e7d3-4255-a18c-f890766ff77b';

/**
 * High quality golf equipment images from Pexels (free to use)
 * These are categorized by equipment type
 */
const CATEGORY_IMAGES = {
  driver: [
    'https://images.pexels.com/photos/1325659/pexels-photo-1325659.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1325661/pexels-photo-1325661.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/3683096/pexels-photo-3683096.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ],
  fairway_wood: [
    'https://images.pexels.com/photos/1325723/pexels-photo-1325723.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/3760778/pexels-photo-3760778.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ],
  hybrid: [
    'https://images.pexels.com/photos/2828723/pexels-photo-2828723.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/3683107/pexels-photo-3683107.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ],
  iron: [
    'https://images.pexels.com/photos/2061/golf-tee-golf-golf-ball-golfer.jpg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1409004/pexels-photo-1409004.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/164251/pexels-photo-164251.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ],
  wedge: [
    'https://images.pexels.com/photos/424725/pexels-photo-424725.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/3763967/pexels-photo-3763967.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ],
  putter: [
    'https://images.pexels.com/photos/97830/pexels-photo-97830.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1325734/pexels-photo-1325734.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/3763972/pexels-photo-3763972.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ],
  balls: [
    'https://images.pexels.com/photos/186239/pexels-photo-186239.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/163487/golf-golf-ball-tee-golf-tee-163487.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/54123/pexels-photo-54123.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ],
  bags: [
    'https://images.pexels.com/photos/1325662/pexels-photo-1325662.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/114972/pexels-photo-114972.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1325665/pexels-photo-1325665.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ],
  gloves: [
    'https://images.pexels.com/photos/6572964/pexels-photo-6572964.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1325667/pexels-photo-1325667.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ],
  accessories: [
    'https://images.pexels.com/photos/163487/golf-golf-ball-tee-golf-tee-163487.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/33478/golf-sunset-sport-golfer.jpg?auto=compress&cs=tinysrgb&w=1200'
  ],
  rangefinder: [
    'https://images.pexels.com/photos/33478/golf-sunset-sport-golfer.jpg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1325735/pexels-photo-1325735.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ],
  rangefinders: [
    'https://images.pexels.com/photos/33478/golf-sunset-sport-golfer.jpg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1325735/pexels-photo-1325735.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ],
  gps_devices: [
    'https://images.pexels.com/photos/1409004/pexels-photo-1409004.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/914682/pexels-photo-914682.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ]
};

// Default fallback image
const DEFAULT_IMAGE = 'https://images.pexels.com/photos/1325659/pexels-photo-1325659.jpeg?auto=compress&cs=tinysrgb&w=1200';

async function downloadImage(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*'
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

async function createPhotoRecord(equipmentId, photoUrl, caption = 'Product image') {
  const { error } = await supabase
    .from('equipment_photos')
    .insert({
      id: uuidv4(),
      equipment_id: equipmentId,
      user_id: SYSTEM_USER_ID,
      photo_url: photoUrl,
      caption: caption,
      is_primary: true,
      likes_count: 10 // Give official images some initial likes
    });
    
  if (error) {
    console.error('Database insert error:', error);
    return false;
  }
  
  return true;
}

async function processEquipment() {
  console.log('🏌️ Starting equipment image upload...\n');
  
  // First, clear existing photos for this user
  console.log('Clearing existing photos...');
  const { error: deleteError } = await supabase
    .from('equipment_photos')
    .delete()
    .eq('user_id', SYSTEM_USER_ID);
    
  if (deleteError) {
    console.log('Delete error (continuing anyway):', deleteError.message);
  }
  
  // Get all equipment
  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .order('category');
    
  console.log(`Found ${equipment.length} equipment items\n`);
  
  let successCount = 0;
  let failedCount = 0;
  const categoryStats = {};
  const categoryIndexes = {}; // Track which image to use for each category
  
  // Process in batches of 3 to avoid rate limiting
  for (let i = 0; i < equipment.length; i += 3) {
    const batch = equipment.slice(i, i + 3);
    
    for (const item of batch) {
      try {
        console.log(`Processing ${item.brand} ${item.model}...`);
        
        // Get appropriate image for category
        const categoryImages = CATEGORY_IMAGES[item.category] || [DEFAULT_IMAGE];
        const currentIndex = categoryIndexes[item.category] || 0;
        const imageUrl = categoryImages[currentIndex % categoryImages.length];
        
        // Update index for next item in this category
        categoryIndexes[item.category] = currentIndex + 1;
        
        // Download the image
        const imageData = await downloadImage(imageUrl);
        if (!imageData) {
          console.log(`❌ Failed to download image`);
          failedCount++;
          continue;
        }
        
        // Upload to Supabase Storage
        const publicUrl = await uploadToSupabase(item.id, imageData.buffer, imageData.contentType);
        if (!publicUrl) {
          console.log(`❌ Failed to upload to storage`);
          failedCount++;
          continue;
        }
        
        // Create database record
        const caption = `${item.brand} ${item.model}`;
        const created = await createPhotoRecord(item.id, publicUrl, caption);
        if (!created) {
          console.log(`❌ Failed to create database record`);
          failedCount++;
          continue;
        }
        
        successCount++;
        categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
        console.log(`✅ Success - Image uploaded and linked`);
        
      } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        failedCount++;
      }
    }
    
    console.log(`Progress: ${Math.min(i + 3, equipment.length)}/${equipment.length}`);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ Upload complete!');
  console.log(`Successfully uploaded: ${successCount} images`);
  console.log(`Failed: ${failedCount} images`);
  
  console.log('\n📊 Uploads by category:');
  Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(15)} ${count} items`);
    });
}

async function testEquipmentDisplay() {
  console.log('\n🧪 Testing equipment display...');
  
  // Get a few equipment items with their photos
  const { data: testItems } = await supabase
    .from('equipment')
    .select(`
      id,
      brand,
      model,
      category,
      equipment_photos (
        photo_url,
        likes_count
      )
    `)
    .limit(10);
    
  console.log('\nSample equipment with photos:');
  testItems?.forEach(item => {
    console.log(`${item.brand} ${item.model}: ${item.equipment_photos?.length || 0} photos`);
  });
  
  // Count total photos
  const { count } = await supabase
    .from('equipment_photos')
    .select('*', { count: 'exact', head: true });
    
  console.log(`\nTotal photos in database: ${count}`);
}

async function main() {
  await processEquipment();
  await testEquipmentDisplay();
}

main().catch(console.error);