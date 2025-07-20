import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addShaftGripColumns() {
  console.log('Adding shaft_id and grip_id columns to bag_equipment table...');

  try {
    // First check if columns already exist
    const { data: columns } = await supabase
      .rpc('get_table_columns', {
        table_name: 'bag_equipment',
        schema_name: 'public'
      })
      .select('column_name');

    const columnNames = columns?.map(c => c.column_name) || [];
    
    if (columnNames.includes('shaft_id') && columnNames.includes('grip_id')) {
      console.log('Columns already exist, skipping...');
      return;
    }

    // Add shaft_id column if it doesn't exist
    if (!columnNames.includes('shaft_id')) {
      const { error: shaftError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE bag_equipment 
          ADD COLUMN shaft_id UUID REFERENCES equipment(id) ON DELETE SET NULL;
        `
      });

      if (shaftError) {
        console.error('Error adding shaft_id column:', shaftError);
        throw shaftError;
      }
      console.log('✅ Added shaft_id column');
    }

    // Add grip_id column if it doesn't exist
    if (!columnNames.includes('grip_id')) {
      const { error: gripError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE bag_equipment 
          ADD COLUMN grip_id UUID REFERENCES equipment(id) ON DELETE SET NULL;
        `
      });

      if (gripError) {
        console.error('Error adding grip_id column:', gripError);
        throw gripError;
      }
      console.log('✅ Added grip_id column');
    }

    // Create indexes for performance
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_bag_equipment_shaft ON bag_equipment(shaft_id);
        CREATE INDEX IF NOT EXISTS idx_bag_equipment_grip ON bag_equipment(grip_id);
      `
    });

    if (indexError) {
      console.error('Error creating indexes:', indexError);
      throw indexError;
    }

    console.log('✅ Created indexes for shaft_id and grip_id');
    console.log('✅ Successfully updated bag_equipment table schema');

  } catch (error) {
    console.error('Failed to update schema:', error);
    process.exit(1);
  }
}

// Check if the RPC functions exist, if not use direct SQL
async function checkAndCreateRPCFunctions() {
  // First, let's try a simpler approach using the SQL editor API
  console.log('Checking database schema...');
  
  // For now, we'll create a migration file instead
  const migrationSQL = `
-- Add shaft_id and grip_id columns to bag_equipment table
DO $$
BEGIN
  -- Add shaft_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bag_equipment' 
    AND column_name = 'shaft_id'
  ) THEN
    ALTER TABLE bag_equipment 
    ADD COLUMN shaft_id UUID REFERENCES equipment(id) ON DELETE SET NULL;
  END IF;

  -- Add grip_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bag_equipment' 
    AND column_name = 'grip_id'
  ) THEN
    ALTER TABLE bag_equipment 
    ADD COLUMN grip_id UUID REFERENCES equipment(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bag_equipment_shaft ON bag_equipment(shaft_id);
CREATE INDEX IF NOT EXISTS idx_bag_equipment_grip ON bag_equipment(grip_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON bag_equipment TO authenticated;
`;

  console.log('Migration SQL created. Please run this in Supabase SQL editor:');
  console.log('---');
  console.log(migrationSQL);
  console.log('---');
}

// Run the migration
checkAndCreateRPCFunctions();