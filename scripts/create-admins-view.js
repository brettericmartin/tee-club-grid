#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function createAdminsView() {
  console.log('🔧 Creating compatibility view for admins table...');
  
  const sql = `
    -- Create a compatibility view so existing code stops crashing
    create or replace view public.admins
    security invoker
    as
    select id as user_id
    from public.profiles
    where coalesce(is_admin, false) = true;
  `;
  
  try {
    // Try using the direct SQL execution approach like other scripts
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Error creating admins view:', error.message);
      console.error('Full error details:', error);
      
      // Fallback: try to create via direct query
      console.log('\n🔄 Trying alternative approach...');
      const { error: fallbackError } = await supabase.from('pg_stat_user_tables').select('*').limit(1);
      
      if (fallbackError) {
        console.error('❌ Database connection issues. Please run the SQL manually:');
        console.log('\n' + sql);
        process.exit(1);
      }
      
      console.error('❌ SQL execution failed. Please run this SQL manually in Supabase dashboard:');
      console.log('\n' + sql);
      process.exit(1);
    }
    
    console.log('✅ Successfully created admins compatibility view');
    console.log('📋 The view maps:');
    console.log('   - profiles.id → admins.user_id');
    console.log('   - Only includes profiles where is_admin = true');
    console.log('   - Uses security invoker for proper RLS');
    
    // Test the view
    console.log('\n🧪 Testing the view...');
    const { data: testData, error: testError } = await supabase
      .from('admins')
      .select('user_id');
    
    if (testError) {
      console.error('❌ Error testing view:', testError.message);
    } else {
      console.log(`✅ View works! Found ${testData?.length || 0} admin users`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
createAdminsView().then(() => {
  console.log('🎉 Admins view creation complete!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});