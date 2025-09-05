import { supabase } from './supabase-admin.js';

async function checkPhotoLikes() {
  console.log('=== CHECKING EQUIPMENT PHOTO LIKES SYSTEM ===\n');
  
  // 1. Check if equipment_photo_likes table exists
  console.log('1. Checking equipment_photo_likes table...');
  const { data: likes, error } = await supabase
    .from('equipment_photo_likes')
    .select('*')
    .limit(5);

  if (error) {
    console.log('   ❌ Table error:', error.message);
  } else {
    console.log('   ✅ Table exists');
    console.log('   Sample likes:', likes?.length || 0, 'rows');
    if (likes && likes.length > 0) {
      console.log('   Columns:', Object.keys(likes[0]));
    }
  }
  
  // 2. Check equipment_photos likes_count column
  console.log('\n2. Checking equipment_photos.likes_count...');
  const { data: photos } = await supabase
    .from('equipment_photos')
    .select('id, likes_count, is_primary')
    .order('likes_count', { ascending: false, nullsFirst: false })
    .limit(5);

  console.log('   Has likes_count column:', photos?.[0]?.likes_count !== undefined);
  console.log('   Top 5 by likes:');
  photos?.forEach(p => {
    console.log(`   - Photo ${p.id.substring(0, 8)}... likes: ${p.likes_count}, primary: ${p.is_primary}`);
  });
  
  // 3. Check current main photo logic
  console.log('\n3. Checking TaylorMade Qi10 LS photo selection...');
  const { data: qi10Photos } = await supabase
    .from('equipment_photos')
    .select('*')
    .eq('equipment_id', 'b7e7f6bf-72e9-45e6-8bac-21a40bce0082')
    .order('likes_count', { ascending: false, nullsFirst: false });
    
  console.log('   Total photos:', qi10Photos?.length || 0);
  if (qi10Photos && qi10Photos.length > 0) {
    console.log('   Photos by likes:');
    qi10Photos.forEach((p, i) => {
      console.log(`   ${i+1}. Likes: ${p.likes_count}, Primary: ${p.is_primary}, User: ${p.user_id ? 'Yes' : 'No'}`);
      console.log(`      URL: ${p.photo_url.substring(0, 60)}...`);
    });
  }
  
  // 4. Check how main photo is selected in equipment service
  console.log('\n4. Current photo selection logic:');
  console.log('   The equipment service currently uses:');
  console.log('   1. Primary photo (is_primary = true)');
  console.log('   2. Most liked photo (highest likes_count)');
  console.log('   3. Any photo');
  console.log('   4. Fallback to equipment.image_url');
}

checkPhotoLikes().then(() => {
  console.log('\n✅ Analysis complete');
  process.exit(0);
}).catch(console.error);