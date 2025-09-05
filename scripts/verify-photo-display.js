import { supabase } from './supabase-admin.js';

async function verifyPhotoDisplay() {
  console.log('=== VERIFYING PHOTO DISPLAY FOR ALL EQUIPMENT ===\n');
  
  // Get all equipment with their photos
  const { data: allEquipment } = await supabase
    .from('equipment')
    .select(`
      id,
      brand,
      model,
      category,
      image_url,
      equipment_photos (
        id,
        photo_url,
        likes_count,
        is_primary
      )
    `)
    .order('brand')
    .order('model');
    
  let stats = {
    total: 0,
    withImageUrl: 0,
    withEquipmentPhotos: 0,
    withBoth: 0,
    withNeither: 0,
    willDisplay: 0,
    problematic: []
  };
  
  for (const eq of allEquipment || []) {
    stats.total++;
    
    const hasImageUrl = !!eq.image_url;
    const hasPhotos = eq.equipment_photos && eq.equipment_photos.length > 0;
    
    if (hasImageUrl) stats.withImageUrl++;
    if (hasPhotos) stats.withEquipmentPhotos++;
    if (hasImageUrl && hasPhotos) stats.withBoth++;
    if (!hasImageUrl && !hasPhotos) {
      stats.withNeither++;
      stats.problematic.push(eq);
    }
    
    // Apply our photo logic
    const photos = eq.equipment_photos || [];
    const primaryMarkedPhoto = photos.find(p => p.is_primary)?.photo_url;
    const mostLikedPhoto = photos.length > 0 
      ? photos.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))[0].photo_url
      : null;
    const anyPhoto = photos.length > 0 ? photos[0].photo_url : null;
    const bestPhoto = primaryMarkedPhoto || mostLikedPhoto || anyPhoto || eq.image_url;
    
    if (bestPhoto) stats.willDisplay++;
  }
  
  console.log('📊 STATISTICS:');
  console.log('==============');
  console.log(`Total equipment: ${stats.total}`);
  console.log(`With image_url: ${stats.withImageUrl} (${(stats.withImageUrl/stats.total*100).toFixed(1)}%)`);
  console.log(`With equipment_photos: ${stats.withEquipmentPhotos} (${(stats.withEquipmentPhotos/stats.total*100).toFixed(1)}%)`);
  console.log(`With both: ${stats.withBoth} (${(stats.withBoth/stats.total*100).toFixed(1)}%)`);
  console.log(`With neither: ${stats.withNeither} (${(stats.withNeither/stats.total*100).toFixed(1)}%)`);
  console.log('');
  console.log(`✅ Will display a photo: ${stats.willDisplay} (${(stats.willDisplay/stats.total*100).toFixed(1)}%)`);
  console.log(`❌ Won't display a photo: ${stats.total - stats.willDisplay} (${((stats.total - stats.willDisplay)/stats.total*100).toFixed(1)}%)`);
  
  if (stats.problematic.length > 0) {
    console.log('\n⚠️  EQUIPMENT WITH NO PHOTOS:');
    console.log('==============================');
    for (const eq of stats.problematic.slice(0, 10)) {
      console.log(`${eq.brand} ${eq.model} (${eq.category})`);
    }
    if (stats.problematic.length > 10) {
      console.log(`... and ${stats.problematic.length - 10} more`);
    }
  }
  
  // Check specifically for popular equipment
  console.log('\n🏌️ POPULAR EQUIPMENT CHECK:');
  console.log('============================');
  const popularBrands = ['Titleist', 'Callaway', 'TaylorMade', 'Ping', 'Odyssey'];
  
  for (const brand of popularBrands) {
    const { data: brandEquipment } = await supabase
      .from('equipment')
      .select(`
        id,
        model,
        image_url,
        equipment_photos (id)
      `)
      .eq('brand', brand)
      .limit(5);
      
    const withPhotos = brandEquipment?.filter(eq => 
      eq.image_url || (eq.equipment_photos && eq.equipment_photos.length > 0)
    ).length || 0;
    
    console.log(`${brand}: ${withPhotos}/${brandEquipment?.length || 0} have photos`);
  }
  
  process.exit(0);
}

verifyPhotoDisplay().catch(console.error);