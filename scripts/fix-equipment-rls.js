import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixEquipmentRLS() {
  console.log('🔧 Fixing equipment table RLS policies...\n');
  
  try {
    // Drop existing policies first (if any)
    console.log('Dropping existing policies...');
    await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Equipment is viewable by everyone" ON equipment;
        DROP POLICY IF EXISTS "Users can insert equipment" ON equipment;
        DROP POLICY IF EXISTS "Users can update their own equipment" ON equipment;
      `
    }).catch(err => console.log('Note: Some policies may not exist, continuing...'));
    
    // Create new policies
    console.log('Creating new RLS policies...');
    
    // Policy for public read access
    const readPolicy = `
      CREATE POLICY "Equipment is viewable by everyone" 
      ON equipment 
      FOR SELECT 
      USING (true);
    `;
    
    // Policy for authenticated users to insert
    const insertPolicy = `
      CREATE POLICY "Users can insert equipment"
      ON equipment
      FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
    `;
    
    // Policy for users to update equipment they added
    const updatePolicy = `
      CREATE POLICY "Users can update their own equipment"
      ON equipment
      FOR UPDATE
      USING (added_by_user_id = auth.uid() OR auth.uid() IN (SELECT user_id FROM admins))
      WITH CHECK (added_by_user_id = auth.uid() OR auth.uid() IN (SELECT user_id FROM admins));
    `;
    
    // Execute policies
    await supabase.rpc('exec_sql', { sql: readPolicy });
    console.log('✅ Created public read policy');
    
    await supabase.rpc('exec_sql', { sql: insertPolicy });
    console.log('✅ Created insert policy for authenticated users');
    
    await supabase.rpc('exec_sql', { sql: updatePolicy });
    console.log('✅ Created update policy for equipment owners');
    
    // Verify the fix
    console.log('\nVerifying fix...');
    
    // Test with anon key
    const supabaseAnon = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    const { count, error } = await supabaseAnon
      .from('equipment')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error testing read access:', error);
    } else if (count > 0) {
      console.log(`✅ SUCCESS! Anonymous users can now see ${count} equipment items`);
    } else {
      console.log('⚠️  Warning: Count is still 0, policies may not have taken effect yet');
    }
    
  } catch (error) {
    console.error('Error fixing RLS:', error);
  }
}

fixEquipmentRLS().catch(console.error);