import './supabase-admin.js';
import { supabase } from './supabase-admin.js';

async function checkBagEquipmentSchema() {
  console.log('🔍 Checking bag_equipment table schema...\n');

  try {
    // Try to select with custom_specs
    const { data, error } = await supabase
      .from('bag_equipment')
      .select('id, bag_id, equipment_id, position, is_featured, custom_specs')
      .limit(1);

    if (error) {
      if (error.message.includes('custom_specs')) {
        console.log('❌ custom_specs column does NOT exist in bag_equipment table');
        console.log('Error message:', error.message);
        console.log('\n📝 Creating migration to add custom_specs column...');
        
        // Create the migration
        await createMigration();
      } else {
        console.error('Other error:', error);
      }
    } else {
      console.log('✅ custom_specs column exists in bag_equipment table');
      if (data && data.length > 0) {
        console.log('Sample data:', data[0]);
      }
    }

    // Try without custom_specs to see what columns exist
    const { data: columns, error: colError } = await supabase
      .from('bag_equipment')
      .select('*')
      .limit(1);

    if (!colError && columns && columns.length > 0) {
      console.log('\n📊 Current columns in bag_equipment:');
      Object.keys(columns[0]).forEach(col => {
        console.log(`  - ${col}`);
      });
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

async function createMigration() {
  const migrationSQL = `
-- Add custom_specs column to bag_equipment table
ALTER TABLE bag_equipment 
ADD COLUMN IF NOT EXISTS custom_specs jsonb DEFAULT NULL;

-- Add comment to describe the column
COMMENT ON COLUMN bag_equipment.custom_specs IS 'Custom specifications for equipment like loft, shaft, grip preferences';

-- Update RLS policies if needed (they should already allow this column)
`;

  console.log('Migration SQL created:');
  console.log(migrationSQL);
  
  console.log('\n🔧 Applying migration...');
  
  // Apply the migration
  const { error } = await supabase.rpc('exec_sql', { 
    sql_query: migrationSQL 
  }).catch(err => {
    // If exec_sql doesn't exist, try direct query
    console.log('Trying alternate approach...');
    return { error: err };
  });

  if (error) {
    console.log('\n⚠️  Could not apply migration automatically.');
    console.log('Please run this SQL in Supabase dashboard:');
    console.log('```sql');
    console.log(migrationSQL);
    console.log('```');
  } else {
    console.log('✅ Migration applied successfully!');
  }
}

checkBagEquipmentSchema();