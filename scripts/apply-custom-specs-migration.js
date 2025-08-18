import { supabase } from './supabase-admin.js';

async function applyCustomSpecsMigration() {
  console.log('🔧 Applying custom_specs column migration to bag_equipment table...\n');

  try {
    // First, check if the column already exists
    console.log('1️⃣ Checking if custom_specs column already exists...');
    
    const { data: existingData, error: selectError } = await supabase
      .from('bag_equipment')
      .select('custom_specs')
      .limit(1);

    if (!selectError) {
      console.log('✅ custom_specs column already exists in bag_equipment table');
      console.log('🎉 Migration is already applied - no action needed!');
      return;
    }

    if (selectError && !selectError.message.includes('custom_specs')) {
      console.error('❌ Unexpected error checking column:', selectError);
      return;
    }

    console.log('2️⃣ custom_specs column does not exist, attempting to add it...');
    
    // Try to simulate the column addition by attempting an insert with custom_specs
    // This will help us understand if we can add the field indirectly
    console.log('3️⃣ The migration needs to be run manually in the Supabase dashboard.');
    console.log('\n📋 SQL to execute in Supabase SQL Editor:\n');
    
    const migrationSQL = `-- Add custom_specs column to bag_equipment table
-- This allows storing custom specifications like loft, shaft, grip preferences as JSON

-- Add custom_specs column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bag_equipment' 
    AND column_name = 'custom_specs'
  ) THEN
    ALTER TABLE bag_equipment 
    ADD COLUMN custom_specs jsonb DEFAULT NULL;
    
    COMMENT ON COLUMN bag_equipment.custom_specs IS 'Custom specifications for equipment like loft, shaft, grip preferences';
  END IF;
END $$;

-- Grant necessary permissions (if not already granted)
GRANT SELECT, INSERT, UPDATE, DELETE ON bag_equipment TO authenticated;`;

    console.log('='.repeat(80));
    console.log(migrationSQL);
    console.log('='.repeat(80));
    
    console.log('\n📝 Steps to apply this migration:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the SQL above');
    console.log('4. Click "Run" to execute the migration');
    console.log('5. Run this script again to verify the migration was successful\n');
    
    console.log('🔗 Supabase Dashboard: https://supabase.com/dashboard');
    console.log('💡 After running the SQL, the error "could not find the \'custom_specs\' column" should be resolved');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Export for use as a module
export { applyCustomSpecsMigration };

// Run the migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  applyCustomSpecsMigration();
}