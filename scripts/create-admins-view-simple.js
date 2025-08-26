#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function createAdminsView() {
  console.log('🔧 Creating compatibility view for admins table...');
  
  // First, test if we can access profiles with is_admin column
  console.log('📊 Checking current admin users...');
  const { data: adminProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, is_admin')
    .eq('is_admin', true);
    
  if (profilesError) {
    console.error('❌ Error querying profiles:', profilesError);
    console.log('💡 Please ensure the is_admin column exists in profiles table');
    return;
  }
  
  console.log(`✅ Found ${adminProfiles?.length || 0} admin users in profiles table`);
  if (adminProfiles && adminProfiles.length > 0) {
    adminProfiles.forEach(admin => {
      console.log(`   - ${admin.username || 'No username'} (${admin.id})`);
    });
  }
  
  // Now test if the admins view exists
  console.log('\n📋 Testing if admins view already exists...');
  const { data: existingAdmins, error: viewError } = await supabase
    .from('admins')
    .select('user_id')
    .limit(1);
    
  if (!viewError) {
    console.log('✅ admins view already exists and works!');
    
    // Get all admins from the view
    const { data: allAdmins, error: allAdminsError } = await supabase
      .from('admins')
      .select('user_id');
      
    if (!allAdminsError) {
      console.log(`📊 View contains ${allAdmins?.length || 0} admin users`);
      return;
    }
  }
  
  // View doesn't exist, provide the SQL
  console.log('❌ admins view does not exist');
  console.log('\n📝 Please create the view manually using the following SQL:');
  console.log('\n' + '='.repeat(60));
  console.log(`
-- Create a compatibility view so existing code stops crashing
create or replace view public.admins
security invoker
as
select id as user_id
from public.profiles
where coalesce(is_admin, false) = true;

-- Grant access to the view
grant select on public.admins to anon;
grant select on public.admins to authenticated;
`);
  console.log('='.repeat(60));
  
  console.log('\n🎯 Instructions:');
  console.log('1. Copy the SQL above');
  console.log('2. Go to your Supabase Dashboard');
  console.log('3. Navigate to SQL Editor');
  console.log('4. Paste and run the SQL');
  console.log('5. Run this script again to verify');
  
  return false;
}

// Run the script
createAdminsView().then((success) => {
  if (success !== false) {
    console.log('\n🎉 Admins view is ready!');
  }
  process.exit(success !== false ? 0 : 1);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});