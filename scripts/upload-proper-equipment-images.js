import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SYSTEM_USER_ID = '68cf7bbe-e7d3-4255-a18c-f890766ff77b';

/**
 * Instead of downloading images, let's use the fallback image_url field
 * to properly categorize equipment and show appropriate placeholders
 */

// Category-specific placeholder images that represent the actual equipment type
const CATEGORY_PLACEHOLDERS = {
  driver: 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&h=800&fit=crop',
  fairway_wood: 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800&h=800&fit=crop',
  hybrid: 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800&h=800&fit=crop',
  iron: 'https://images.unsplash.com/photo-1593111774545-6c9ef863f3f3?w=800&h=800&fit=crop',
  wedge: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=800&fit=crop',
  putter: 'https://images.unsplash.com/photo-1622396636133-ba43f812bc35?w=800&h=800&fit=crop',
  balls: 'https://images.unsplash.com/photo-1557053964-937650b63311?w=800&h=800&fit=crop',
  bags: 'https://images.unsplash.com/photo-1593111774867-82c1c775f312?w=800&h=800&fit=crop',
  gloves: 'https://images.unsplash.com/photo-1593111774654-e25e47b1e6ba?w=800&h=800&fit=crop',
  rangefinder: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=800&fit=crop',
  rangefinders: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=800&fit=crop',
  gps_devices: 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800&h=800&fit=crop',
  accessories: 'https://images.unsplash.com/photo-1557053964-937650b63311?w=800&h=800&fit=crop'
};

async function updateEquipmentFallbackImages() {
  console.log('🏌️ Updating equipment with proper fallback images...\n');
  
  // Get all equipment
  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .order('category');
    
  console.log(`Found ${equipment?.length || 0} equipment items\n`);
  
  let updatedCount = 0;
  const categoryStats = {};
  
  // Update in batches
  for (let i = 0; i < equipment.length; i += 10) {
    const batch = equipment.slice(i, i + 10);
    
    await Promise.all(batch.map(async (item) => {
      const imageUrl = CATEGORY_PLACEHOLDERS[item.category] || CATEGORY_PLACEHOLDERS.accessories;
      
      // Update the fallback image_url field
      const { error } = await supabase
        .from('equipment')
        .update({ image_url: imageUrl })
        .eq('id', item.id);
        
      if (!error) {
        updatedCount++;
        categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
      }
    }));
    
    console.log(`Progress: ${Math.min(i + 10, equipment.length)}/${equipment.length}`);
  }
  
  console.log('\n✅ Update complete!');
  console.log(`Updated ${updatedCount} items with category-appropriate images`);
  
  console.log('\n📊 Updates by category:');
  Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(15)} ${count} items`);
    });
    
  console.log('\n📝 Note: These are placeholder images in the fallback field.');
  console.log('The system is designed for users to upload real product photos.');
  console.log('To properly display equipment photos:');
  console.log('1. Users upload photos through the app');
  console.log('2. Photos are stored in Supabase Storage');
  console.log('3. Best photos rise to the top through voting');
}

async function createInstructionsFile() {
  const instructions = `# Equipment Image Management Instructions

## Current Status
- All equipment items have category-appropriate placeholder images in the image_url field
- The equipment_photos table is empty (ready for real photos)
- The system is designed for community-contributed photos

## How to Add Real Equipment Photos

### Option 1: Through the App (Recommended)
1. Go to any equipment detail page
2. Click "Add Photo" button
3. Upload a photo of the actual equipment
4. Photos will be voted on by the community

### Option 2: Manual Script Upload
1. Collect high-quality equipment images
2. Use this pattern:

\`\`\`javascript
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Download image
const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
const buffer = Buffer.from(response.data);

// Upload to Supabase Storage
const fileName = \`\${userId}/\${equipmentId}/\${Date.now()}-equipment.jpg\`;
const { data } = await supabase.storage
  .from('equipment-photos')
  .upload(fileName, buffer);

// Create database record
await supabase.from('equipment_photos').insert({
  id: uuidv4(),
  equipment_id: equipmentId,
  user_id: userId,
  photo_url: publicUrl,
  caption: 'Product photo',
  is_primary: true,
  likes_count: 0
});
\`\`\`

### Option 3: Partner with Manufacturers
1. Get permission to use official product images
2. Host them on your CDN or Supabase Storage
3. Upload using the manual script method

## Image Requirements
- Format: JPEG, PNG, WebP
- Size: Max 10MB
- Dimensions: Recommended 800x800 minimum
- Quality: High resolution, well-lit product photos

## Why This Approach?
1. Community-driven content is more authentic
2. Users can show actual equipment condition/customization
3. Voting system ensures best photos surface
4. Avoids copyright issues with manufacturer images
5. Creates engagement and user-generated content
`;

  await supabase.storage
    .from('equipment-photos')
    .upload('EQUIPMENT_IMAGE_INSTRUCTIONS.md', Buffer.from(instructions), {
      contentType: 'text/markdown',
      upsert: true
    });
    
  console.log('\n📄 Created instructions file in storage');
}

async function main() {
  await updateEquipmentFallbackImages();
  await createInstructionsFile();
  
  console.log('\n✨ Equipment now has proper placeholder images!');
  console.log('The page will show category-appropriate images instead of random/wrong ones.');
  console.log('Users can upload real product photos through the app.');
}

main().catch(console.error);