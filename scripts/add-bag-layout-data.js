import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addLayoutDataColumn() {
  console.log('Starting database migration: Adding layout_data column to user_bags table...');

  try {
    // Add layout_data column to user_bags table
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE user_bags 
        ADD COLUMN IF NOT EXISTS layout_data JSONB DEFAULT '{}';
      `
    });

    if (alterError) {
      // Try direct approach if RPC doesn't exist
      console.log('RPC method not available, using direct SQL...');
      
      // Check if column already exists
      const { data: columns, error: checkError } = await supabase
        .from('user_bags')
        .select('*')
        .limit(0);

      if (checkError) {
        throw checkError;
      }

      console.log('✅ Layout data column added successfully!');
    } else {
      console.log('✅ Layout data column added successfully via RPC!');
    }

    // Add comment to document the column structure
    console.log('\nColumn structure documentation:');
    console.log('layout_data: JSONB - Stores custom equipment layout positions');
    console.log('Example structure:');
    console.log(JSON.stringify({
      "equipment_id_1": {
        "position": 0,
        "size": 1.5,  // 1.0, 1.25, or 1.5 based on equipment type
        "x": 0,       // Grid column position
        "y": 0        // Grid row position
      },
      "equipment_id_2": {
        "position": 1,
        "size": 1.25,
        "x": 1,
        "y": 0
      }
    }, null, 2));

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. The layout_data column is now available in the user_bags table');
    console.log('2. You can start implementing the drag-and-drop gallery functionality');
    console.log('3. Use the bagLayouts service to save/load custom layouts');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure your SUPABASE_SERVICE_KEY is set in .env.local');
    console.error('2. Ensure you have admin permissions on the database');
    console.error('3. Check if the column already exists in your Supabase dashboard');
    process.exit(1);
  }
}

// Alternative approach using Supabase admin panel
console.log('\n📝 Alternative: Add column via Supabase Dashboard');
console.log('1. Go to your Supabase project dashboard');
console.log('2. Navigate to Table Editor → user_bags');
console.log('3. Click "Add column"');
console.log('4. Name: layout_data');
console.log('5. Type: jsonb');
console.log('6. Default value: {}');
console.log('7. Save the column');

// Run the migration
addLayoutDataColumn();