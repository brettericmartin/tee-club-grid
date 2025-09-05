import { supabase } from './supabase-admin.js';

async function fixTaylorMadePhoto() {
  const equipmentId = 'b7e7f6bf-72e9-45e6-8bac-21a40bce0082';
  
  // Check existing photos
  const { data: existingPhotos } = await supabase
    .from('equipment_photos')
    .select('*')
    .eq('equipment_id', equipmentId);
    
  console.log('Existing photos for TaylorMade Qi10 LS:', existingPhotos?.length || 0);
  
  if (!existingPhotos || existingPhotos.length === 0) {
    // Get the equipment record
    const { data: equipment } = await supabase
      .from('equipment')
      .select('image_url')
      .eq('id', equipmentId)
      .single();
      
    if (equipment?.image_url) {
      console.log('Adding image_url as equipment_photo:', equipment.image_url);
      
      const { data, error } = await supabase
        .from('equipment_photos')
        .insert({
          equipment_id: equipmentId,
          photo_url: equipment.image_url,
          is_primary: true,
          likes_count: 0
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error adding photo:', error);
      } else {
        console.log('Successfully added equipment photo:', data);
      }
    }
  } else {
    console.log('Photos already exist, no action needed');
  }
}

fixTaylorMadePhoto().then(() => process.exit(0));