import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixUnsplashImages() {
  console.log('\n=== FINDING EQUIPMENT WITH UNSPLASH IMAGES ===\n');
  
  // Find all equipment with Unsplash URLs
  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('id, brand, model, category, image_url')
    .or('image_url.ilike.%unsplash.com%,image_url.ilike.%images.unsplash%');
  
  if (error) {
    console.error('Error fetching equipment:', error);
    return;
  }
  
  console.log(`Found ${equipment?.length || 0} equipment items with Unsplash URLs\n`);
  
  if (equipment && equipment.length > 0) {
    console.log('=== EQUIPMENT WITH UNSPLASH IMAGES ===');
    
    for (const item of equipment) {
      console.log(`\n${item.brand} ${item.model} (${item.category})`);
      console.log(`  ID: ${item.id}`);
      console.log(`  Current URL: ${item.image_url?.substring(0, 50)}...`);
      
      // Check if this equipment has any user-uploaded photos
      const { data: photos, error: photoError } = await supabase
        .from('equipment_photos')
        .select('id, photo_url, likes_count')
        .eq('equipment_id', item.id)
        .order('likes_count', { ascending: false })
        .limit(1);
      
      if (photos && photos.length > 0) {
        console.log(`  ✓ Has ${photos.length} user photo(s), top one with ${photos[0].likes_count || 0} likes`);
        console.log(`  → Will use: ${photos[0].photo_url.substring(0, 50)}...`);
        
        // Update the equipment to use the user photo instead
        const { error: updateError } = await supabase
          .from('equipment')
          .update({ image_url: photos[0].photo_url })
          .eq('id', item.id);
        
        if (updateError) {
          console.error(`  ✗ Failed to update: ${updateError.message}`);
        } else {
          console.log(`  ✓ Updated to use user photo`);
        }
      } else {
        console.log(`  ⚠ No user photos available`);
        
        // Set to null or a placeholder
        const { error: updateError } = await supabase
          .from('equipment')
          .update({ image_url: null })
          .eq('id', item.id);
        
        if (updateError) {
          console.error(`  ✗ Failed to nullify: ${updateError.message}`);
        } else {
          console.log(`  ✓ Set image_url to null (will use fallback)`);
        }
      }
    }
  }
  
  // Also check bag_equipment for custom_photo_url with Unsplash
  console.log('\n\n=== CHECKING BAG_EQUIPMENT CUSTOM PHOTOS ===\n');
  
  const { data: bagEquipment, error: bagError } = await supabase
    .from('bag_equipment')
    .select('id, bag_id, equipment_id, custom_photo_url')
    .or('custom_photo_url.ilike.%unsplash.com%,custom_photo_url.ilike.%images.unsplash%');
  
  if (bagError) {
    console.error('Error fetching bag_equipment:', bagError);
  } else {
    console.log(`Found ${bagEquipment?.length || 0} bag_equipment items with Unsplash custom photos`);
    
    if (bagEquipment && bagEquipment.length > 0) {
      for (const item of bagEquipment) {
        console.log(`\nBag equipment ${item.id}`);
        console.log(`  Removing Unsplash URL: ${item.custom_photo_url?.substring(0, 50)}...`);
        
        // Remove the Unsplash custom photo
        const { error: updateError } = await supabase
          .from('bag_equipment')
          .update({ custom_photo_url: null })
          .eq('id', item.id);
        
        if (updateError) {
          console.error(`  ✗ Failed to remove: ${updateError.message}`);
        } else {
          console.log(`  ✓ Removed custom Unsplash photo`);
        }
      }
    }
  }
  
  console.log('\n=== DONE ===\n');
}

fixUnsplashImages().catch(console.error);