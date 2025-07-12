import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEquipmentSavesRLS() {
  console.log('🔍 Checking equipment_saves table and RLS policies...\n');

  try {
    // Check if table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('equipment_saves')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Table check failed:', tableError.message);
      
      // If table doesn't exist, we need to create it
      if (tableError.message.includes('relation') && tableError.message.includes('does not exist')) {
        console.log('\n📝 Table does not exist. Here\'s the SQL to create it:\n');
        console.log(`
-- Create equipment_saves table
CREATE TABLE IF NOT EXISTS equipment_saves (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, equipment_id)
);

-- Enable RLS
ALTER TABLE equipment_saves ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can see all saves
CREATE POLICY "Anyone can view equipment saves" ON equipment_saves
  FOR SELECT USING (true);

-- Users can only manage their own saves
CREATE POLICY "Users can manage own saves" ON equipment_saves
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_equipment_saves_user_equipment ON equipment_saves(user_id, equipment_id);
CREATE INDEX idx_equipment_saves_equipment ON equipment_saves(equipment_id);
        `);
      }
    } else {
      console.log('✅ equipment_saves table exists');
      console.log(`   Found ${tableCheck?.length || 0} records\n`);
    }

    // Check RLS status using raw SQL
    const { data: rlsCheck, error: rlsError } = await supabase.rpc('get_table_rls_status', {
      table_name: 'equipment_saves'
    }).single();

    if (!rlsError && rlsCheck) {
      console.log('📊 RLS Status:', rlsCheck.rls_enabled ? '✅ Enabled' : '❌ Disabled');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n🔍 Checking equipment_photo_likes RLS...\n');

  try {
    // Check equipment_photo_likes
    const { data: photoLikesCheck, error: photoLikesError } = await supabase
      .from('equipment_photo_likes')
      .select('*')
      .limit(1);

    if (photoLikesError) {
      console.error('❌ equipment_photo_likes check failed:', photoLikesError.message);
    } else {
      console.log('✅ equipment_photo_likes table exists');
      console.log(`   Found ${photoLikesCheck?.length || 0} records`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Create RPC function to check RLS status (run this SQL in Supabase dashboard first)
const createRLSCheckFunction = `
-- Create function to check RLS status
CREATE OR REPLACE FUNCTION get_table_rls_status(table_name text)
RETURNS TABLE(rls_enabled boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT relrowsecurity
  FROM pg_class
  WHERE relname = table_name
  AND relnamespace = 'public'::regnamespace;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

console.log('\n💡 Note: If RLS check fails, run this SQL in Supabase dashboard first:\n');
console.log(createRLSCheckFunction);

checkEquipmentSavesRLS().catch(console.error);