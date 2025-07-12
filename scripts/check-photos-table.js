import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkPhotosTable() {
  console.log('🔍 Checking equipment_photos table structure...\n');
  
  try {
    // Check if we can query the table
    const { data, error } = await supabase
      .from('equipment_photos')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('❌ Error querying equipment_photos:', error.message);
      
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('\n⚠️  Table equipment_photos does not exist!');
        console.log('\nCreating table...');
        
        // Create the table
        const { error: createError } = await supabase.rpc('create_equipment_photos_table');
        
        if (createError) {
          console.log('\nPlease create the table manually with this SQL:');
          console.log(`
CREATE TABLE equipment_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  is_primary BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_equipment_photos_equipment_id ON equipment_photos(equipment_id);
CREATE INDEX idx_equipment_photos_user_id ON equipment_photos(user_id);
CREATE INDEX idx_equipment_photos_likes ON equipment_photos(likes_count DESC);

-- Enable RLS
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;
`);
        }
      }
      return;
    }
    
    console.log('✅ equipment_photos table exists and is accessible');
    
    // Check table structure
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'equipment_photos' });
      
    if (!columnsError && columns) {
      console.log('\n📊 Table columns:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }
    
    // Check if metadata column exists
    const hasMetadata = columns?.some(col => col.column_name === 'metadata');
    if (!hasMetadata) {
      console.log('\n⚠️  Missing metadata column. Adding it...');
      
      const { error: alterError } = await supabase.rpc('add_metadata_column');
      
      if (alterError) {
        console.log('Add it manually with:');
        console.log('ALTER TABLE equipment_photos ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT \'{}\';');
      }
    }
    
    // Check for any existing photos
    const { count } = await supabase
      .from('equipment_photos')
      .select('*', { count: 'exact', head: true });
      
    console.log(`\n📸 Total photos in database: ${count || 0}`);
    
    // Check RLS policies
    console.log('\n🔒 Checking RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_table_policies', { table_name: 'equipment_photos' });
      
    if (!policiesError && policies) {
      console.log('RLS Policies:');
      policies.forEach(policy => {
        console.log(`  - ${policy.policyname} (${policy.cmd})`);
      });
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Add these functions to Supabase if they don't exist
const helperFunctions = `
-- Get table columns
CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
RETURNS TABLE(column_name text, data_type text) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::text,
    c.data_type::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' 
    AND c.table_name = $1
  ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql;

-- Get table policies
CREATE OR REPLACE FUNCTION get_table_policies(table_name text)
RETURNS TABLE(policyname text, cmd text) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pol.policyname::text,
    pol.cmd::text
  FROM pg_policies pol
  WHERE pol.schemaname = 'public' 
    AND pol.tablename = $1;
END;
$$ LANGUAGE plpgsql;

-- Add metadata column
CREATE OR REPLACE FUNCTION add_metadata_column()
RETURNS void AS $$
BEGIN
  ALTER TABLE equipment_photos 
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
END;
$$ LANGUAGE plpgsql;
`;

console.log('\nIf you get "function does not exist" errors, add these helper functions to Supabase:');
console.log(helperFunctions);

checkPhotosTable().catch(console.error);