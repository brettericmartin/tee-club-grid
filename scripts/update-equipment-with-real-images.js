import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// System user ID for scraped images
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Reliable public images from equipment manufacturers and open sources
 * These are specifically chosen to be embeddable and publicly accessible
 */
const EQUIPMENT_IMAGES = {
  // Drivers - Using Wikimedia and other open sources
  'TaylorMade Qi10': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Golf_driver_-_Callaway_FT-3_-_2007.jpg/800px-Golf_driver_-_Callaway_FT-3_-_2007.jpg',
  'TaylorMade Qi10 Max': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Golf_clubs_%28Irons%29.jpg/800px-Golf_clubs_%28Irons%29.jpg',
  'TaylorMade Qi10 LS': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Golfball.jpg/800px-Golfball.jpg',
  
  // Using placeholder images that represent the category
  'driver': 'https://images.pexels.com/photos/1325659/pexels-photo-1325659.jpeg?auto=compress&cs=tinysrgb&w=800',
  'fairway_wood': 'https://images.pexels.com/photos/1325723/pexels-photo-1325723.jpeg?auto=compress&cs=tinysrgb&w=800',
  'hybrid': 'https://images.pexels.com/photos/2828723/pexels-photo-2828723.jpeg?auto=compress&cs=tinysrgb&w=800',
  'iron': 'https://images.pexels.com/photos/2061/golf-tee-golf-golf-ball-golfer.jpg?auto=compress&cs=tinysrgb&w=800',
  'wedge': 'https://images.pexels.com/photos/424725/pexels-photo-424725.jpeg?auto=compress&cs=tinysrgb&w=800',
  'putter': 'https://images.pexels.com/photos/97830/pexels-photo-97830.jpeg?auto=compress&cs=tinysrgb&w=800',
  'balls': 'https://images.pexels.com/photos/186239/pexels-photo-186239.jpeg?auto=compress&cs=tinysrgb&w=800',
  'bags': 'https://images.pexels.com/photos/1325662/pexels-photo-1325662.jpeg?auto=compress&cs=tinysrgb&w=800',
  'gloves': 'https://images.pexels.com/photos/6572964/pexels-photo-6572964.jpeg?auto=compress&cs=tinysrgb&w=800',
  'accessories': 'https://images.pexels.com/photos/163487/golf-golf-ball-tee-golf-tee-163487.jpeg?auto=compress&cs=tinysrgb&w=800',
  'rangefinder': 'https://images.pexels.com/photos/33478/golf-sunset-sport-golfer.jpg?auto=compress&cs=tinysrgb&w=800',
  'rangefinders': 'https://images.pexels.com/photos/33478/golf-sunset-sport-golfer.jpg?auto=compress&cs=tinysrgb&w=800',
  'gps_devices': 'https://images.pexels.com/photos/1409004/pexels-photo-1409004.jpeg?auto=compress&cs=tinysrgb&w=800',
  'apparel': 'https://images.pexels.com/photos/1325735/pexels-photo-1325735.jpeg?auto=compress&cs=tinysrgb&w=800'
};

// High quality golf equipment images from Pexels (free to use)
const PEXELS_EQUIPMENT_IMAGES = [
  'https://images.pexels.com/photos/1325659/pexels-photo-1325659.jpeg?auto=compress&cs=tinysrgb&w=800', // Driver
  'https://images.pexels.com/photos/1409004/pexels-photo-1409004.jpeg?auto=compress&cs=tinysrgb&w=800', // Club close-up
  'https://images.pexels.com/photos/114972/pexels-photo-114972.jpeg?auto=compress&cs=tinysrgb&w=800', // Golf bag
  'https://images.pexels.com/photos/1325723/pexels-photo-1325723.jpeg?auto=compress&cs=tinysrgb&w=800', // Clubs
  'https://images.pexels.com/photos/1325662/pexels-photo-1325662.jpeg?auto=compress&cs=tinysrgb&w=800', // Golf bag 2
  'https://images.pexels.com/photos/424725/pexels-photo-424725.jpeg?auto=compress&cs=tinysrgb&w=800', // Putter
  'https://images.pexels.com/photos/97830/pexels-photo-97830.jpeg?auto=compress&cs=tinysrgb&w=800', // Putting
  'https://images.pexels.com/photos/186239/pexels-photo-186239.jpeg?auto=compress&cs=tinysrgb&w=800', // Golf balls
  'https://images.pexels.com/photos/2061/golf-tee-golf-golf-ball-golfer.jpg?auto=compress&cs=tinysrgb&w=800', // Tee shot
  'https://images.pexels.com/photos/163487/golf-golf-ball-tee-golf-tee-163487.jpeg?auto=compress&cs=tinysrgb&w=800' // Golf ball on tee
];

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
        bio: 'Official equipment images',
        email: 'system@teed.club'
      });
  }
}

async function processEquipment() {
  console.log('🏌️ Starting equipment image upload with reliable sources...\n');
  
  // First, clear existing system photos
  console.log('Clearing existing system photos...');
  await supabase
    .from('equipment_photos')
    .delete()
    .eq('user_id', SYSTEM_USER_ID);
  
  // Get all equipment
  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .order('category');
    
  console.log(`Found ${equipment.length} equipment items\n`);
  
  let successCount = 0;
  let failedCount = 0;
  const categoryStats = {};
  
  // Use a rotating index for variety
  let imageIndex = 0;
  
  // Process in batches of 5
  for (let i = 0; i < equipment.length; i += 5) {
    const batch = equipment.slice(i, i + 5);
    
    await Promise.all(batch.map(async (item) => {
      try {
        console.log(`Processing ${item.brand} ${item.model}...`);
        
        // Select image URL based on category or use rotating index
        let imageUrl = EQUIPMENT_IMAGES[item.category] || 
                      PEXELS_EQUIPMENT_IMAGES[imageIndex % PEXELS_EQUIPMENT_IMAGES.length];
        
        // For specific popular items, try to use more relevant images
        if (item.model.toLowerCase().includes('driver') || item.category === 'driver') {
          imageUrl = PEXELS_EQUIPMENT_IMAGES[0]; // Driver image
        } else if (item.model.toLowerCase().includes('putter') || item.category === 'putter') {
          imageUrl = PEXELS_EQUIPMENT_IMAGES[5]; // Putter image
        } else if (item.category === 'balls') {
          imageUrl = PEXELS_EQUIPMENT_IMAGES[7]; // Golf balls
        } else if (item.category === 'bags') {
          imageUrl = PEXELS_EQUIPMENT_IMAGES[2]; // Golf bag
        }
        
        imageIndex++;
        
        // Download the image
        const imageData = await downloadImage(imageUrl);
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
        const caption = `${item.brand} ${item.model} - ${item.category.replace(/_/g, ' ')}`;
        const created = await createPhotoRecord(item.id, publicUrl, caption);
        if (!created) {
          failedCount++;
          return;
        }
        
        successCount++;
        categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
        console.log(`✅ ${item.brand} ${item.model} - Image uploaded`);
        
      } catch (error) {
        console.error(`❌ ${item.brand} ${item.model} - Error:`, error.message);
        failedCount++;
      }
    }));
    
    console.log(`Progress: ${i + batch.length}/${equipment.length}`);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 500));
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
    .limit(5);
    
  console.log('\nSample equipment with photos:');
  testItems?.forEach(item => {
    console.log(`\n${item.brand} ${item.model}:`);
    console.log(`  Photos: ${item.equipment_photos?.length || 0}`);
    if (item.equipment_photos?.length > 0) {
      console.log(`  Primary photo: ${item.equipment_photos[0].photo_url.substring(0, 60)}...`);
    }
  });
}

async function main() {
  await ensureSystemUser();
  await processEquipment();
  await testEquipmentDisplay();
  
  // Note about bucket cleanup
  console.log('\n📝 Note: The unused "equipment-images" bucket should be removed manually in Supabase dashboard');
  console.log('   (Automated deletion requires specific permissions)');
}

main().catch(console.error);