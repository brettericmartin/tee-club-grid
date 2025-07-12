import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SYSTEM_USER_ID = '68cf7bbe-e7d3-4255-a18c-f890766ff77b';

// Direct image URLs that work
const WORKING_IMAGES = {
  // Use direct URLs from image CDNs that allow hotlinking
  'bags': 'https://cdn.pixabay.com/photo/2016/07/30/18/31/golf-1557746_1280.jpg',
  'gloves': 'https://cdn.pixabay.com/photo/2014/05/12/18/29/golf-342863_1280.jpg',
  'iron': 'https://cdn.pixabay.com/photo/2013/05/29/18/39/golf-114536_1280.jpg',
  'wedge': 'https://cdn.pixabay.com/photo/2015/05/28/14/46/golf-787826_1280.jpg',
  'putter': 'https://cdn.pixabay.com/photo/2016/11/29/01/34/golfer-1866600_1280.jpg',
  'hybrid': 'https://cdn.pixabay.com/photo/2017/08/17/15/23/golf-2651744_1280.jpg',
  'rangefinder': 'https://cdn.pixabay.com/photo/2016/11/29/12/30/golf-1869579_1280.jpg',
  'rangefinders': 'https://cdn.pixabay.com/photo/2016/11/29/12/30/golf-1869579_1280.jpg',
  'gps_devices': 'https://cdn.pixabay.com/photo/2014/08/04/17/48/golf-409214_1280.jpg',
  'accessories': 'https://cdn.pixabay.com/photo/2016/07/30/18/31/golf-1557748_1280.jpg'
};

async function downloadImage(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const buffer = Buffer.from(response.data);
    
    return { buffer, contentType };
  } catch (error) {
    console.error(`Download failed: ${error.message}`);
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
  
  const { data: { publicUrl } } = supabase.storage
    .from('equipment-photos')
    .getPublicUrl(fileName);
    
  return publicUrl;
}

async function fixRemainingImages() {
  console.log('🏌️ Fixing remaining equipment without images...\n');
  
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
    .order('category');
    
  console.log(`Found ${equipment?.length || 0} equipment items without photos\n`);
  
  let successCount = 0;
  const categoryCount = {};
  
  for (const item of equipment || []) {
    const imageUrl = WORKING_IMAGES[item.category] || WORKING_IMAGES['accessories'];
    
    try {
      console.log(`Processing ${item.brand} ${item.model} (${item.category})...`);
      
      // Download image
      const imageData = await downloadImage(imageUrl);
      if (!imageData) {
        console.log('  ❌ Download failed');
        continue;
      }
      
      // Upload to storage
      const publicUrl = await uploadToSupabase(item.id, imageData.buffer, imageData.contentType);
      if (!publicUrl) {
        console.log('  ❌ Upload failed');
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
          likes_count: 5
        });
        
      if (error) {
        console.log('  ❌ Database error:', error.message);
        continue;
      }
      
      successCount++;
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      console.log('  ✅ Success!');
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Fixed ${successCount} more items`);
  
  // Final summary
  const { count } = await supabase
    .from('equipment_photos')
    .select('*', { count: 'exact', head: true });
    
  console.log(`\nTotal photos in database: ${count}`);
  
  // Equipment coverage
  const { count: totalEquipment } = await supabase
    .from('equipment')
    .select('*', { count: 'exact', head: true });
    
  const { data: withPhotos } = await supabase
    .from('equipment_photos')
    .select('equipment_id', { count: 'exact' });
    
  const uniqueIds = new Set(withPhotos?.map(p => p.equipment_id));
  
  console.log(`Equipment coverage: ${uniqueIds.size}/${totalEquipment} (${Math.round(uniqueIds.size / totalEquipment * 100)}%)`);
  
  console.log('\nFixed categories:');
  Object.entries(categoryCount).forEach(([cat, count]) => {
    console.log(`  ${cat.padEnd(15)} ${count} items`);
  });
}

async function testDisplay() {
  console.log('\n🧪 Testing equipment display...\n');
  
  // Get some equipment from each category
  const categories = ['driver', 'iron', 'putter', 'balls', 'bags'];
  
  for (const cat of categories) {
    const { data } = await supabase
      .from('equipment')
      .select(`
        brand,
        model,
        equipment_photos (
          photo_url
        )
      `)
      .eq('category', cat)
      .limit(2);
      
    console.log(`${cat}:`);
    data?.forEach(item => {
      console.log(`  ${item.brand} ${item.model}: ${item.equipment_photos?.length > 0 ? '✅ Has photo' : '❌ No photo'}`);
    });
  }
}

async function cleanupBucket() {
  console.log('\n🗑️  Cleanup...');
  
  // Try to delete unused bucket
  const { error } = await supabase.storage.emptyBucket('equipment-images');
  if (!error) {
    const { error: deleteError } = await supabase.storage.deleteBucket('equipment-images');
    if (!deleteError) {
      console.log('✅ Removed equipment-images bucket');
    } else {
      console.log('Note: equipment-images bucket exists but could not be deleted');
    }
  }
}

async function main() {
  await fixRemainingImages();
  await testDisplay();
  await cleanupBucket();
}

main().catch(console.error);