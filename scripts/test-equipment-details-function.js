import { createClient } from '@supabase/supabase-js';
import './supabase-admin.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Replicate getEquipmentDetails function
async function getEquipmentDetails(equipmentId) {
  console.log('Fetching equipment details for:', equipmentId);
  
  // Start with basic equipment data
  const { data: equipment, error: equipmentError } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', equipmentId)
    .single();

  if (equipmentError) {
    console.error('Error fetching equipment:', equipmentError);
    throw equipmentError;
  }

  console.log('Basic equipment data:', {
    brand: equipment.brand,
    model: equipment.model,
    image_url: equipment.image_url
  });

  // Try to fetch related data
  let reviews = { data: [] };
  let photos = { data: [] };
  
  try {
    [reviews, photos] = await Promise.all([
      supabase
        .from('equipment_reviews')
        .select('*')
        .eq('equipment_id', equipmentId),
      supabase
        .from('equipment_photos')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('likes_count', { ascending: false })
    ]);
  } catch (err) {
    console.warn('Error fetching related data:', err);
  }

  console.log('Photos fetched:', photos.data?.length || 0);
  if (photos.data && photos.data.length > 0) {
    console.log('First photo URL:', photos.data[0].photo_url.substring(0, 100) + '...');
  }

  // Get the most liked photo as primaryPhoto
  const mostLikedPhoto = photos.data && photos.data.length > 0 
    ? photos.data[0].photo_url 
    : null;

  console.log('mostLikedPhoto:', mostLikedPhoto ? mostLikedPhoto.substring(0, 100) + '...' : 'null');

  // Combine the data
  const data = {
    ...equipment,
    equipment_reviews: reviews.data || [],
    equipment_photos: photos.data || [],
    primaryPhoto: mostLikedPhoto,
    most_liked_photo: mostLikedPhoto
  };
  
  return {
    ...data,
    reviewCount: data.equipment_reviews?.length || 0,
    photoCount: data.equipment_photos?.length || 0,
    primaryPhoto: mostLikedPhoto || equipment.image_url
  };
}

async function test() {
  const equipmentId = 'c750ace3-da4d-466a-8f70-6a98a2e4b8ba';
  console.log('=== TESTING getEquipmentDetails FUNCTION ===\n');
  
  const result = await getEquipmentDetails(equipmentId);
  
  console.log('\n=== FINAL RESULT ===');
  console.log('primaryPhoto:', result.primaryPhoto ? result.primaryPhoto.substring(0, 100) + '...' : 'null/empty');
  console.log('most_liked_photo:', result.most_liked_photo ? result.most_liked_photo.substring(0, 100) + '...' : 'null/empty');
  console.log('image_url:', result.image_url ? result.image_url.substring(0, 100) + '...' : 'null/empty');
  console.log('photoCount:', result.photoCount);
  console.log('equipment_photos array length:', result.equipment_photos?.length || 0);
  
  console.log('\n=== WHAT THE UI SHOULD SHOW ===');
  if (result.most_liked_photo || result.primaryPhoto || result.image_url) {
    console.log('✅ Main image should display:', (result.most_liked_photo || result.primaryPhoto || result.image_url).substring(0, 100) + '...');
  } else {
    console.log('❌ No image available - will show brand initials fallback');
  }
  
  if (result.equipment_photos && result.equipment_photos.length > 0) {
    console.log('✅ Photos tab should show', result.equipment_photos.length, 'photo(s)');
  } else {
    console.log('❌ Photos tab will show "No photos yet"');
  }
}

test().catch(console.error);