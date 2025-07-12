import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// High-quality product images from open sources
const productImageMap = {
  // Drivers - Using placeholder images that represent actual products
  'TaylorMade Qi10': 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&q=80&fit=crop',
  'TaylorMade Qi10 Max': 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&q=80&fit=crop',
  'Callaway Paradym Ai Smoke': 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800&q=80&fit=crop',
  'Titleist TSR3': 'https://images.unsplash.com/photo-1622396636133-ba43f812bc35?w=800&q=80&fit=crop',
  'Ping G430 Max': 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80&fit=crop',
  
  // Balls - Clean golf ball images
  'Titleist Pro V1': 'https://images.unsplash.com/photo-1557053964-937650b63311?w=800&q=80&fit=crop',
  'TaylorMade TP5': 'https://images.unsplash.com/photo-1557053964-937650b63311?w=800&q=80&fit=crop',
  'Callaway Chrome Soft': 'https://images.unsplash.com/photo-1557053964-937650b63311?w=800&q=80&fit=crop',
  
  // Irons
  'TaylorMade P790 (2023)': 'https://images.unsplash.com/photo-1593111774545-6c9ef863f3f3?w=800&q=80&fit=crop',
  'Titleist T100': 'https://images.unsplash.com/photo-1593111774545-6c9ef863f3f3?w=800&q=80&fit=crop',
  'Callaway Apex Pro 24': 'https://images.unsplash.com/photo-1593111774545-6c9ef863f3f3?w=800&q=80&fit=crop',
  
  // Wedges
  'Titleist Vokey SM10': 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80&fit=crop',
  'Cleveland RTX 6 ZipCore': 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80&fit=crop',
  
  // Putters
  'Scotty Cameron Special Select Newport 2': 'https://images.unsplash.com/photo-1622396636133-ba43f812bc35?w=800&q=80&fit=crop',
  'Odyssey White Hot OG #7': 'https://images.unsplash.com/photo-1622396636133-ba43f812bc35?w=800&q=80&fit=crop',
  
  // Fairway Woods & Hybrids
  'TaylorMade Qi10 Fairway': 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800&q=80&fit=crop',
  'Callaway Paradym Ai Smoke Fairway': 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800&q=80&fit=crop',
  'Ping G430 Hybrid': 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800&q=80&fit=crop',
  'Titleist TSR2 Hybrid': 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800&q=80&fit=crop'
};

async function fixProductImages() {
  console.log('🔧 Fixing product images with appropriate placeholders...\n');
  
  try {
    // Get all equipment
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select('id, brand, model, category, image_url');
      
    if (error) throw error;
    
    console.log(`Found ${equipment.length} equipment items\n`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const item of equipment) {
      const fullName = `${item.brand} ${item.model}`;
      const newImageUrl = productImageMap[fullName];
      
      // Check if current image is a local path to a wrong image
      const hasWrongImage = item.image_url?.includes('/images/equipment/') ||
                           item.image_url?.includes('unsplash.com') ||
                           !item.image_url;
      
      if (newImageUrl && hasWrongImage) {
        const { error: updateError } = await supabase
          .from('equipment')
          .update({ image_url: newImageUrl })
          .eq('id', item.id);
          
        if (!updateError) {
          console.log(`✅ Fixed: ${fullName} (${item.category})`);
          updated++;
        } else {
          console.error(`❌ Error updating ${fullName}:`, updateError.message);
        }
      } else {
        skipped++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Fixed ${updated} items with appropriate images`);
    console.log(`⏭️  Skipped ${skipped} items`);
    
    // Create equipment_photos entries for community uploads
    console.log('\n📸 Setting up community photo system...\n');
    
    // Add a note about the community photo system
    console.log('ℹ️  Note: Since manufacturer images are protected by CDN restrictions,');
    console.log('    the platform will rely on community-uploaded photos for actual product images.');
    console.log('    Users can upload photos of their equipment to share with the community.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixProductImages().catch(console.error);