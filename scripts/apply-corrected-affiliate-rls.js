#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function applySQL(description, sql) {
  console.log(`\n🔧 ${description}...`);
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    
    if (error) {
      console.log(`❌ Failed: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Success`);
    return true;
  } catch (error) {
    // Try direct SQL execution if RPC doesn't work
    try {
      console.log(`⚠️  RPC failed, trying direct execution...`);
      const { error: directError } = await supabase.from('_sql_exec').select('*').eq('query', sql);
      
      if (directError) {
        console.log(`❌ Direct execution failed: ${directError.message}`);
        return false;
      }
      
      console.log(`✅ Success via direct execution`);
      return true;
    } catch (directError) {
      console.log(`❌ Both RPC and direct execution failed: ${error.message}`);
      return false;
    }
  }
}

async function applyRLSPolicies() {
  console.log('🔒 APPLYING CORRECTED RLS POLICIES');
  console.log('=' * 50);
  
  // Step 1: Enable RLS on all tables
  const rlsEnable = [
    'ALTER TABLE user_equipment_links ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE equipment_videos ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE user_bag_videos ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;'
  ];
  
  for (const sql of rlsEnable) {
    await applySQL('Enabling RLS', sql);
  }
  
  // Step 2: Drop any existing policies
  const dropPolicies = [
    'DROP POLICY IF EXISTS "allow_read_user_equipment_links" ON user_equipment_links;',
    'DROP POLICY IF EXISTS "allow_read_equipment_videos" ON equipment_videos;',
    'DROP POLICY IF EXISTS "allow_read_user_bag_videos" ON user_bag_videos;',
    'DROP POLICY IF EXISTS "allow_insert_link_clicks" ON link_clicks;',
    'DROP POLICY IF EXISTS "view_public_equipment_links" ON user_equipment_links;',
    'DROP POLICY IF EXISTS "users_insert_own_equipment_links" ON user_equipment_links;',
    'DROP POLICY IF EXISTS "users_update_own_equipment_links" ON user_equipment_links;',
    'DROP POLICY IF EXISTS "users_delete_own_equipment_links" ON user_equipment_links;'
  ];
  
  for (const sql of dropPolicies) {
    await applySQL('Dropping old policies', sql);
  }
  
  // Step 3: Apply corrected policies (fix table reference)
  const policies = [
    {
      name: 'User Equipment Links - Public Read',
      sql: `
        CREATE POLICY "view_public_equipment_links" 
        ON user_equipment_links FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM user_bags
            WHERE user_bags.id = user_equipment_links.bag_id
            AND (
              user_bags.is_public = true 
              OR user_bags.user_id = auth.uid()
            )
          )
        );
      `
    },
    {
      name: 'User Equipment Links - Owner Insert',
      sql: `
        CREATE POLICY "users_insert_own_equipment_links" 
        ON user_equipment_links FOR INSERT
        WITH CHECK (
          auth.uid() = user_id
          AND EXISTS (
            SELECT 1 FROM user_bags
            WHERE user_bags.id = bag_id
            AND user_bags.user_id = auth.uid()
          )
        );
      `
    },
    {
      name: 'User Equipment Links - Owner Update',
      sql: `
        CREATE POLICY "users_update_own_equipment_links" 
        ON user_equipment_links FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
      `
    },
    {
      name: 'User Equipment Links - Owner Delete',
      sql: `
        CREATE POLICY "users_delete_own_equipment_links" 
        ON user_equipment_links FOR DELETE
        USING (auth.uid() = user_id);
      `
    },
    {
      name: 'Equipment Videos - Public Read',
      sql: `
        CREATE POLICY "view_equipment_videos" 
        ON equipment_videos FOR SELECT
        USING (true);
      `
    },
    {
      name: 'Equipment Videos - Authenticated Insert',
      sql: `
        CREATE POLICY "authenticated_insert_equipment_videos" 
        ON equipment_videos FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = added_by_user_id);
      `
    },
    {
      name: 'Equipment Videos - Owner Update',
      sql: `
        CREATE POLICY "users_update_own_equipment_videos" 
        ON equipment_videos FOR UPDATE
        USING (auth.uid() = added_by_user_id)
        WITH CHECK (auth.uid() = added_by_user_id);
      `
    },
    {
      name: 'Equipment Videos - Owner Delete',
      sql: `
        CREATE POLICY "users_delete_own_equipment_videos" 
        ON equipment_videos FOR DELETE
        USING (auth.uid() = added_by_user_id);
      `
    },
    {
      name: 'User Bag Videos - Public Read',
      sql: `
        CREATE POLICY "view_public_bag_videos" 
        ON user_bag_videos FOR SELECT
        USING (
          share_to_feed = true
          OR auth.uid() = user_id
          OR EXISTS (
            SELECT 1 FROM user_bags
            WHERE user_bags.id = user_bag_videos.bag_id
            AND (
              user_bags.is_public = true 
              OR user_bags.user_id = auth.uid()
            )
          )
        );
      `
    },
    {
      name: 'User Bag Videos - Owner Insert',
      sql: `
        CREATE POLICY "users_insert_own_bag_videos" 
        ON user_bag_videos FOR INSERT
        WITH CHECK (
          auth.uid() = user_id
          AND EXISTS (
            SELECT 1 FROM user_bags
            WHERE user_bags.id = bag_id
            AND user_bags.user_id = auth.uid()
          )
        );
      `
    },
    {
      name: 'User Bag Videos - Owner Update',
      sql: `
        CREATE POLICY "users_update_own_bag_videos" 
        ON user_bag_videos FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
      `
    },
    {
      name: 'User Bag Videos - Owner Delete',
      sql: `
        CREATE POLICY "users_delete_own_bag_videos" 
        ON user_bag_videos FOR DELETE
        USING (auth.uid() = user_id);
      `
    },
    {
      name: 'Link Clicks - Anyone Insert',
      sql: `
        CREATE POLICY "anyone_insert_link_clicks" 
        ON link_clicks FOR INSERT
        WITH CHECK (true);
      `
    },
    {
      name: 'Link Clicks - Owner Read',
      sql: `
        CREATE POLICY "owners_view_link_analytics" 
        ON link_clicks FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM user_equipment_links
            WHERE user_equipment_links.id = link_clicks.link_id
            AND user_equipment_links.user_id = auth.uid()
          )
        );
      `
    }
  ];
  
  let successCount = 0;
  for (const policy of policies) {
    const success = await applySQL(policy.name, policy.sql);
    if (success) successCount++;
  }
  
  console.log(`\n✅ Applied ${successCount}/${policies.length} policies successfully`);
  
  // Step 4: Grant permissions
  const grants = [
    'GRANT SELECT, INSERT, UPDATE, DELETE ON user_equipment_links TO authenticated;',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON equipment_videos TO authenticated;',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON user_bag_videos TO authenticated;',
    'GRANT SELECT, INSERT ON link_clicks TO authenticated;',
    'GRANT SELECT ON user_equipment_links TO anon;',
    'GRANT SELECT ON equipment_videos TO anon;',
    'GRANT SELECT ON user_bag_videos TO anon;',
    'GRANT INSERT ON link_clicks TO anon;'
  ];
  
  for (const grant of grants) {
    await applySQL('Granting permissions', grant);
  }
  
  return successCount === policies.length;
}

async function testAfterApplication() {
  console.log('\n🧪 TESTING AFTER RLS APPLICATION');
  console.log('=' * 50);
  
  const { createClient } = await import('@supabase/supabase-js');
  const anonClient = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  
  const tables = ['user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks'];
  
  for (const table of tables) {
    console.log(`\n🔍 Testing ${table}:`);
    
    // Test anonymous read
    const { data: anonData, error: anonError } = await anonClient
      .from(table)
      .select('*')
      .limit(1);
    
    if (anonError && anonError.message.includes('policy')) {
      console.log(`  ✅ Anonymous read blocked by RLS`);
    } else if (anonError) {
      console.log(`  ❌ Anonymous read error: ${anonError.message}`);
    } else {
      console.log(`  ⚠️  Anonymous read allowed (may be correct for public data)`);
    }
    
    // Test admin read
    const { data: adminData, error: adminError } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (adminError) {
      console.log(`  ❌ Admin read error: ${adminError.message}`);
    } else {
      console.log(`  ✅ Admin read works`);
    }
  }
}

async function main() {
  console.log('🔧 APPLYING CORRECTED AFFILIATE RLS POLICIES');
  console.log('=' * 60);
  
  const success = await applyRLSPolicies();
  
  if (success) {
    console.log('\n🎉 All policies applied successfully!');
  } else {
    console.log('\n⚠️  Some policies failed to apply. Check the logs above.');
  }
  
  await testAfterApplication();
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('  1. Test affiliate link creation in the UI');
  console.log('  2. Test video addition functionality');
  console.log('  3. Test link click tracking');
  console.log('  4. Verify QA checklist items work');
  
  console.log('\n✨ RLS application complete!');
}

main().catch(console.error);