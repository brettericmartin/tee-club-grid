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

async function importScrapedEquipment() {
  console.log('📥 Importing scraped equipment to Supabase...\n');
  
  try {
    // Read scraped data
    const dataPath = path.join(path.dirname(__dirname), 'data', 'scraped-equipment.json');
    const jsonData = await fs.readFile(dataPath, 'utf-8');
    const scrapedEquipment = JSON.parse(jsonData);
    
    console.log(`Found ${scrapedEquipment.length} scraped items\n`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process each item
    for (const item of scrapedEquipment) {
      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from('equipment')
          .select('id')
          .eq('brand', item.brand)
          .eq('model', item.model)
          .single();
          
        if (existing) {
          console.log(`⏭️  Skipping ${item.brand} ${item.model} - already exists`);
          skipped++;
          continue;
        }
        
        // Prepare data for insertion
        const equipmentData = {
          brand: item.brand,
          model: item.model,
          category: item.category.replace(/ /g, '_'), // Convert spaces to underscores
          msrp: item.msrp || item.current_price,
          image_url: item.local_image_path || item.image_url || null,
          specifications: item.specifications || {}
        };
        
        // Add year to specifications if available
        if (item.release_year) {
          equipmentData.specifications.year = item.release_year;
        }
        
        // Insert into database
        const { error } = await supabase
          .from('equipment')
          .insert(equipmentData);
          
        if (error) {
          console.error(`❌ Error importing ${item.brand} ${item.model}:`, error.message);
          errors++;
        } else {
          console.log(`✅ Imported: ${item.brand} ${item.model}`);
          imported++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${item.brand} ${item.model}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`✅ Imported: ${imported} items`);
    console.log(`⏭️  Skipped: ${skipped} items (already exist)`);
    console.log(`❌ Errors: ${errors}`);
    
  } catch (error) {
    console.error('Fatal error:', error.message);
  }
}

// Run the import
importScrapedEquipment().catch(console.error);