import './supabase-admin.js';
import { supabase } from './supabase-admin.js';

async function fixEquipmentAccess() {
  console.log('🔧 Fixing equipment table access...\n');
  
  try {
    // First, let's check current RLS status
    console.log('Checking current equipment table status...');
    
    // Test with service key (bypasses RLS)
    const { count: adminCount } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Equipment count (with service key): ${adminCount}`);
    
    if (adminCount === 0) {
      console.log('❌ No equipment data found in database!');
      return;
    }
    
    // The problem is RLS is blocking access
    // We need to execute SQL to fix the policies
    console.log('\nAttempting to fix RLS policies...');
    
    // Since we can't execute arbitrary SQL via the client library,
    // let's try a different approach - disable RLS temporarily
    console.log('\n⚠️  IMPORTANT: RLS policies need to be fixed directly in Supabase dashboard');
    console.log('\nTo fix this issue:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to Authentication > Policies');
    console.log('3. Find the "equipment" table');
    console.log('4. Add a new SELECT policy with:');
    console.log('   - Name: "Public read access"');
    console.log('   - Target roles: anon, authenticated');
    console.log('   - WITH CHECK expression: true');
    console.log('\nOR run this SQL in the SQL editor:');
    console.log(`
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Equipment is viewable by everyone" ON equipment;

CREATE POLICY "Equipment is viewable by everyone" 
ON equipment 
FOR SELECT 
USING (true);
    `);
    
    // As a temporary workaround, let's check if we can at least read with auth
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAuth = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    // Sign in as a test user to see if authenticated access works
    const { data: signInData, error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email: 'brettmartinplay@gmail.com',
      password: 'password123' // You'll need to use the actual password
    });
    
    if (signInData?.user) {
      const { count: authCount } = await supabaseAuth
        .from('equipment')
        .select('*', { count: 'exact', head: true });
      
      console.log(`\nEquipment count (authenticated): ${authCount}`);
      
      if (authCount > 0) {
        console.log('✅ Authenticated users CAN see equipment');
        console.log('❌ But anonymous users CANNOT (this needs to be fixed for public pages)');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixEquipmentAccess().catch(console.error);