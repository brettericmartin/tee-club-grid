import { supabase } from './supabase-admin.js';

async function fixPhotoPriorities() {
  console.log('=== FIXING PHOTO PRIORITIES AND LIKES ===\n');
  
  // 1. Remove is_primary from all scraper photos
  console.log('1. Removing is_primary flag from scraper photos...');
  const { data: scraperPhotos, error: fetchError } = await supabase
    .from('equipment_photos')
    .select('id')
    .is('user_id', null)
    .eq('is_primary', true);
    
  if (fetchError) {
    console.error('Error fetching scraper photos:', fetchError);
  } else {
    console.log(`   Found ${scraperPhotos?.length || 0} scraper photos marked as primary`);
    
    if (scraperPhotos && scraperPhotos.length > 0) {
      const { error: updateError } = await supabase
        .from('equipment_photos')
        .update({ is_primary: false })
        .is('user_id', null);
        
      if (updateError) {
        console.error('   ❌ Error updating:', updateError);
      } else {
        console.log('   ✅ Removed is_primary from all scraper photos');
      }
    }
  }
  
  // 2. Update likes_count based on equipment_photo_likes
  console.log('\n2. Updating likes_count for all photos...');
  
  // Get all likes grouped by photo_id
  const { data: likes } = await supabase
    .from('equipment_photo_likes')
    .select('photo_id');
    
  // Count likes per photo
  const likeCounts = {};
  likes?.forEach(like => {
    likeCounts[like.photo_id] = (likeCounts[like.photo_id] || 0) + 1;
  });
  
  console.log(`   Found likes for ${Object.keys(likeCounts).length} photos`);
  
  // Update each photo with its like count
  let updateCount = 0;
  for (const [photoId, count] of Object.entries(likeCounts)) {
    const { error } = await supabase
      .from('equipment_photos')
      .update({ likes_count: count })
      .eq('id', photoId);
      
    if (!error) updateCount++;
  }
  
  console.log(`   ✅ Updated ${updateCount} photos with their like counts`);
  
  // Reset photos with no likes to 0
  const { error: resetError } = await supabase
    .from('equipment_photos')
    .update({ likes_count: 0 })
    .not('id', 'in', `(${Object.keys(likeCounts).join(',')})`);
    
  if (!resetError) {
    console.log('   ✅ Reset remaining photos to 0 likes');
  }
  
  // 3. Verify TaylorMade Qi10 LS
  console.log('\n3. Verifying TaylorMade Qi10 LS photos...');
  const { data: qi10Photos } = await supabase
    .from('equipment_photos')
    .select('*')
    .eq('equipment_id', 'b7e7f6bf-72e9-45e6-8bac-21a40bce0082')
    .order('likes_count', { ascending: false });
    
  console.log(`   Found ${qi10Photos?.length || 0} photos`);
  qi10Photos?.forEach((p, i) => {
    console.log(`   ${i+1}. ${p.user_id ? 'USER' : 'SCRAPER'} - Likes: ${p.likes_count}, Primary: ${p.is_primary}`);
    console.log(`      URL: ${p.photo_url.substring(0, 60)}...`);
  });
  
  // 4. Create database triggers for auto-updating likes_count
  console.log('\n4. Database triggers needed (run in Supabase SQL Editor):');
  console.log('----------------------------------------');
  console.log(`
-- Function to update likes_count when like is added
CREATE OR REPLACE FUNCTION update_equipment_photo_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE equipment_photos 
    SET likes_count = likes_count + 1
    WHERE id = NEW.photo_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE equipment_photos 
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.photo_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_photo_likes_count ON equipment_photo_likes;
CREATE TRIGGER update_photo_likes_count
AFTER INSERT OR DELETE ON equipment_photo_likes
FOR EACH ROW
EXECUTE FUNCTION update_equipment_photo_likes_count();
  `);
  console.log('----------------------------------------');
}

fixPhotoPriorities().then(() => {
  console.log('\n✅ Photo priorities fixed');
  process.exit(0);
}).catch(console.error);