import { supabase } from './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';

async function checkRLS() {
  const equipmentId = 'b7e7f6bf-72e9-45e6-8bac-21a40bce0082';
  
  console.log('Testing equipment_photos query for TaylorMade Qi10 LS...\n');
  
  // Query as service role (bypasses RLS)
  const { data: serviceData, error: serviceError } = await supabase
    .from('equipment_photos')
    .select('*')
    .eq('equipment_id', equipmentId);
    
  console.log('Service role query (bypasses RLS):');
  console.log('  Found:', serviceData?.length || 0, 'photos');
  if (serviceError) console.log('  Error:', serviceError);
  if (serviceData && serviceData.length > 0) {
    console.log('  First photo:', serviceData[0].photo_url?.substring(0, 60) + '...');
  }
  
  // Now test with anon key to check RLS
  const anonSupabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  
  const { data: anonData, error: anonError } = await anonSupabase
    .from('equipment_photos')
    .select('*')
    .eq('equipment_id', equipmentId);
    
  console.log('\nAnon key query (with RLS):');
  console.log('  Found:', anonData?.length || 0, 'photos');
  if (anonError) console.log('  Error:', anonError);
  
  if (serviceData?.length > 0 && (!anonData || anonData.length === 0)) {
    console.log('\n⚠️  RLS IS BLOCKING THE QUERY!');
    console.log('Photos exist but RLS policies prevent reading them.');
    console.log('\nNeed to fix RLS policy for equipment_photos table.');
  } else if (serviceData?.length > 0 && anonData?.length > 0) {
    console.log('\n✅ RLS is NOT blocking - photos are accessible');
  } else {
    console.log('\n❌ No photos found even with service role');
  }
  
  // Also check what the actual RLS policy is
  console.log('\n=== Checking RLS Policies ===');
  const { data: policies } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'equipment_photos');
    
  if (policies && policies.length > 0) {
    console.log('Found', policies.length, 'RLS policies on equipment_photos table');
    policies.forEach(p => {
      console.log(`  - ${p.policyname}: ${p.cmd} (${p.permissive ? 'PERMISSIVE' : 'RESTRICTIVE'})`);
    });
  } else {
    console.log('No specific RLS policies found - using default (might be restrictive)');
  }
}

checkRLS().then(() => process.exit(0)).catch(console.error);