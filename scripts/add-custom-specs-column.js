import { supabase } from './supabase-admin.js';

async function addCustomSpecsColumn() {
  console.log('🔧 Adding custom_specs column to bag_equipment table...\n');

  try {
    // Execute the migration SQL
    const { data, error } = await supabase.rpc('execute_sql', {
      query: `
        -- Add custom_specs column to bag_equipment table
        ALTER TABLE bag_equipment 
        ADD COLUMN IF NOT EXISTS custom_specs jsonb DEFAULT NULL;

        -- Add comment to describe the column
        COMMENT ON COLUMN bag_equipment.custom_specs IS 'Custom specifications for equipment like loft, shaft, grip preferences';
      `
    });

    if (error) {
      console.error('❌ Error executing migration:', error);
      
      // Try alternative approach using direct SQL execution
      console.log('🔄 Trying alternative approach...\n');
      
      // First, check if column already exists
      const { data: columnCheck, error: checkError } = await supabase.rpc('execute_sql', {
        query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'bag_equipment' 
          AND column_name = 'custom_specs';
        `
      });

      if (checkError) {
        console.error('❌ Error checking column existence:', checkError);
        return;
      }

      if (columnCheck && columnCheck.length > 0) {
        console.log('✅ custom_specs column already exists in bag_equipment table');
        return;
      }

      // Try to add column using separate commands
      const { error: alterError } = await supabase.rpc('execute_sql', {
        query: `ALTER TABLE bag_equipment ADD COLUMN IF NOT EXISTS custom_specs jsonb DEFAULT NULL;`
      });

      if (alterError) {
        console.error('❌ Error adding column:', alterError);
        return;
      }

      const { error: commentError } = await supabase.rpc('execute_sql', {
        query: `COMMENT ON COLUMN bag_equipment.custom_specs IS 'Custom specifications for equipment like loft, shaft, grip preferences';`
      });

      if (commentError) {
        console.log('⚠️  Warning: Could not add column comment:', commentError);
      }

      console.log('✅ Successfully added custom_specs column to bag_equipment table');
      return;
    }

    console.log('✅ Migration completed successfully!');
    console.log('📝 Added custom_specs jsonb column to bag_equipment table');
    console.log('💡 This column will store custom specifications like loft, shaft, and grip preferences');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Run the migration
addCustomSpecsColumn();