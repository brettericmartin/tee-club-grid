import { supabase } from './supabase-admin.js';

async function fixRLS() {
  console.log('=== FIXING EQUIPMENT_PHOTOS RLS ===\n');
  
  // Create a public read policy for equipment_photos
  const policies = [
    `DROP POLICY IF EXISTS "Public can view all equipment photos" ON equipment_photos;`,
    `CREATE POLICY "Public can view all equipment photos" ON equipment_photos FOR SELECT USING (true);`,
    `DROP POLICY IF EXISTS "Anyone can view equipment photos" ON equipment_photos;`,
    `CREATE POLICY "Anyone can view equipment photos" ON equipment_photos FOR SELECT TO anon, authenticated USING (true);`
  ];
  
  console.log('Creating public read policies for equipment_photos...\n');
  
  // Note: We can't directly execute these through the service role
  // They need to be run in Supabase SQL Editor
  console.log('Please run the following SQL in your Supabase SQL Editor:\n');
  console.log('----------------------------------------');
  console.log('-- Enable RLS (if not already enabled)');
  console.log('ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;\n');
  console.log('-- Drop any restrictive policies');
  policies.forEach(policy => {
    console.log(policy);
  });
  console.log('----------------------------------------\n');
  
  // Test if photos are accessible
  console.log('Testing current access...\n');
  
  const { data: testWithService } = await supabase
    .from('equipment_photos')
    .select('id')
    .limit(1);
    
  console.log('✅ Service role can access:', testWithService?.length || 0, 'photos');
  
  // Test with anon key
  const { createClient } = await import('@supabase/supabase-js');
  const anonSupabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  
  const { data: testWithAnon } = await anonSupabase
    .from('equipment_photos')
    .select('id')
    .limit(1);
    
  if (testWithAnon && testWithAnon.length > 0) {
    console.log('✅ Public CAN access equipment photos!');
  } else {
    console.log('❌ Public CANNOT access equipment photos - RLS is blocking');
    console.log('\nRun the SQL above in Supabase Dashboard to fix this.');
  }
}

fixRLS().then(() => process.exit(0)).catch(console.error);