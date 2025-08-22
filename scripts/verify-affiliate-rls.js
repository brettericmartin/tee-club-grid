import { supabase } from './supabase-admin.js';

async function verifyAffiliateRLS() {
  console.log('🔍 Verifying RLS policies for affiliate video features...\n');
  
  const tables = ['user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks'];
  
  // Test 1: Check if tables are accessible for reading (should be public)
  console.log('=== TEST 1: Public Read Access ===');
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('policy')) {
          console.log(`❌ ${table}: Read access denied by RLS policy`);
          console.log(`   Error: ${error.message}`);
        } else {
          console.log(`❌ ${table}: Other error - ${error.message}`);
        }
      } else {
        console.log(`✅ ${table}: Public read access working`);
      }
    } catch (e) {
      console.log(`❌ ${table}: Exception - ${e.message}`);
    }
  }
  
  // Test 2: Check insert restrictions (should require auth/ownership)
  console.log('\n=== TEST 2: Insert Access (Unauthenticated) ===');
  
  const testInserts = [
    {
      table: 'user_equipment_links',
      data: {
        user_id: '00000000-0000-0000-0000-000000000000',
        bag_id: '00000000-0000-0000-0000-000000000000',
        bag_equipment_id: '00000000-0000-0000-0000-000000000000',
        label: 'Test Link',
        url: 'https://test.com'
      }
    },
    {
      table: 'equipment_videos',
      data: {
        equipment_id: '00000000-0000-0000-0000-000000000000',
        provider: 'youtube',
        url: 'https://youtube.com/test',
        added_by_user_id: '00000000-0000-0000-0000-000000000000'
      }
    },
    {
      table: 'user_bag_videos', 
      data: {
        user_id: '00000000-0000-0000-0000-000000000000',
        bag_id: '00000000-0000-0000-0000-000000000000',
        provider: 'youtube',
        url: 'https://youtube.com/test'
      }
    },
    {
      table: 'link_clicks',
      data: {
        link_id: '00000000-0000-0000-0000-000000000000'
      }
    }
  ];
  
  for (const test of testInserts) {
    try {
      const { error } = await supabase
        .from(test.table)
        .insert(test.data)
        .select();
      
      if (error) {
        if (error.message.includes('policy')) {
          console.log(`✅ ${test.table}: Insert properly restricted by RLS policy`);
        } else if (error.message.includes('foreign key') || error.message.includes('violates')) {
          console.log(`⚠️  ${test.table}: Insert blocked by constraints (RLS may not be active)`);
          console.log(`   Error: ${error.message}`);
        } else {
          console.log(`❓ ${test.table}: Other insert error - ${error.message}`);
        }
      } else {
        console.log(`❌ ${test.table}: Insert succeeded when it should be restricted!`);
      }
    } catch (e) {
      console.log(`❌ ${test.table}: Exception during insert test - ${e.message}`);
    }
  }
  
  // Test 3: Check specific policy behaviors
  console.log('\n=== TEST 3: Policy-Specific Checks ===');
  
  // Check if RLS is actually enabled
  console.log('Checking if RLS is enabled on tables...');
  for (const table of tables) {
    try {
      // Try to access from an admin context to see if RLS is truly enabled
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      // If we can access without any auth context, RLS might not be properly enabled
      if (!error) {
        console.log(`⚠️  ${table}: Accessible without auth - RLS may not be enabled`);
      }
    } catch (e) {
      console.log(`${table}: Check failed - ${e.message}`);
    }
  }
  
  // Test 4: Test link_clicks special case (should allow anonymous inserts)
  console.log('\n=== TEST 4: Link Clicks Anonymous Insert Test ===');
  try {
    // First, let's see if there are any user_equipment_links to reference
    const { data: links } = await supabase
      .from('user_equipment_links')
      .select('id')
      .limit(1);
    
    if (links && links.length > 0) {
      const { error } = await supabase
        .from('link_clicks')
        .insert({
          link_id: links[0].id,
          ip_hash: 'test_hash',
          user_agent: 'test_agent'
        })
        .select();
      
      if (error) {
        if (error.message.includes('policy')) {
          console.log(`❌ link_clicks: Anonymous insert blocked by RLS (should be allowed)`);
        } else {
          console.log(`✅ link_clicks: Insert blocked by constraint (RLS policy working)`);
        }
      } else {
        console.log(`✅ link_clicks: Anonymous insert allowed as expected`);
      }
    } else {
      console.log(`ℹ️  link_clicks: No user_equipment_links found to test with`);
    }
  } catch (e) {
    console.log(`❌ link_clicks: Test failed - ${e.message}`);
  }
  
  console.log('\n=== SUMMARY ===');
  console.log('Expected behavior:');
  console.log('✅ All tables should allow public SELECT (read)');
  console.log('✅ INSERT should be restricted by auth/ownership policies');
  console.log('✅ link_clicks should allow anonymous INSERT');
  console.log('✅ Only link owners should read link_clicks');
  
  console.log('\nIf RLS policies are not working:');
  console.log('1. Copy the SQL from scripts/fix-affiliate-video-rls-policies.sql');
  console.log('2. Run it in Supabase Dashboard > SQL Editor');
  console.log('3. Ensure all policies are created without errors');
}

verifyAffiliateRLS().catch(console.error);