import { createClient } from '@supabase/supabase-js';
import { accessoriesEquipment } from '../data/accessories-equipment';
import type { Database } from '../lib/supabase';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function migrateAccessories() {
  console.log('Starting accessories migration...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const item of accessoriesEquipment) {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .insert({
          brand: item.brand,
          model: item.model,
          category: item.category,
          msrp: item.msrp,
          release_year: item.release_year,
          image_url: item.image_url,
          description: item.description,
          specs: item.specs,
          features: item.features || []
        });
      
      if (error) {
        console.error(`Error inserting ${item.brand} ${item.model}:`, error);
        errorCount++;
      } else {
        console.log(`✓ Added ${item.brand} ${item.model}`);
        successCount++;
      }
    } catch (error) {
      console.error(`Failed to insert ${item.brand} ${item.model}:`, error);
      errorCount++;
    }
  }
  
  console.log(`\nMigration complete!`);
  console.log(`Success: ${successCount} items`);
  console.log(`Errors: ${errorCount} items`);
}

// Run the migration
migrateAccessories();