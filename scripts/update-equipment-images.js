import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function updateEquipmentImages() {
  console.log('🖼️  Updating equipment with downloaded images...\n');
  
  try {
    // Read the data with local image paths
    const dataPath = path.join(path.dirname(__dirname), 'data', 'scraped-equipment-with-images.json');
    const jsonData = await fs.readFile(dataPath, 'utf-8');
    const equipmentWithImages = JSON.parse(jsonData);
    
    // Filter items that have local image paths
    const itemsWithLocalImages = equipmentWithImages.filter(item => item.local_image_path);
    console.log(`Found ${itemsWithLocalImages.length} items with local images\n`);
    
    let updated = 0;
    
    for (const item of itemsWithLocalImages) {
      // Find the equipment in database
      const { data: existing } = await supabase
        .from('equipment')
        .select('id, image_url')
        .eq('brand', item.brand)
        .eq('model', item.model)
        .single();
        
      if (existing) {
        // Update with local image path
        const { error } = await supabase
          .from('equipment')
          .update({ image_url: item.local_image_path })
          .eq('id', existing.id);
          
        if (!error) {
          console.log(`✅ Updated: ${item.brand} ${item.model}`);
          updated++;
        } else {
          console.error(`❌ Error updating ${item.brand} ${item.model}:`, error.message);
        }
      }
    }
    
    console.log(`\n✅ Updated ${updated} equipment items with local images`);
    
    // Verify the update
    const { data: withLocalImages } = await supabase
      .from('equipment')
      .select('brand, model, image_url')
      .like('image_url', '%/images/equipment/%')
      .limit(5);
      
    console.log('\nSample equipment with local images:');
    withLocalImages?.forEach(item => {
      console.log(`  ${item.brand} ${item.model}: ${item.image_url}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

updateEquipmentImages().catch(console.error);