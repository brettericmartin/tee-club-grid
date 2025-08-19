import './supabase-admin.js';
import { supabase as adminSupabase } from './supabase-admin.js';

async function fixPublicReadAccess() {
  console.log('\n🔧 Fixing public read access for all tables...\n');

  const tables = [
    'feed_posts',
    'equipment', 
    'user_bags',
    'bag_equipment',
    'profiles',
    'equipment_photos',
    'feed_likes',
    'feed_comments',
    'bag_likes',
    'bag_tees',
    'equipment_tees',
    'user_follows'
  ];

  for (const table of tables) {
    console.log(`\n📋 Fixing RLS for ${table}...`);
    
    try {
      // Drop existing select policies for anonymous users
      const dropResult = await adminSupabase.rpc('exec_sql', {
        sql: `
          DO $$
          DECLARE
            pol RECORD;
          BEGIN
            FOR pol IN 
              SELECT policyname 
              FROM pg_policies 
              WHERE tablename = '${table}' 
              AND policyname LIKE '%public%read%' 
              OR policyname LIKE '%anon%select%'
              OR policyname LIKE '%view%'
            LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, '${table}');
            END LOOP;
          END $$;
        `
      });

      // Create new public read policy
      const createResult = await adminSupabase.rpc('exec_sql', {
        sql: `
          CREATE POLICY "public_read_${table}" ON "${table}"
          FOR SELECT
          TO anon, authenticated
          USING (true);
        `
      });

      console.log(`✅ Created public read policy for ${table}`);

      // Show current policies
      const { data: policies } = await adminSupabase.rpc('exec_sql', {
        sql: `
          SELECT policyname, cmd, roles 
          FROM pg_policies 
          WHERE tablename = '${table}'
          ORDER BY policyname;
        `
      });

      if (policies) {
        console.log(`Current policies for ${table}:`);
        const parsed = typeof policies === 'string' ? JSON.parse(policies) : policies;
        parsed.forEach(p => {
          console.log(`  - ${p.policyname}: ${p.cmd} for ${p.roles}`);
        });
      }

    } catch (error) {
      console.error(`❌ Error fixing ${table}:`, error.message);
      
      // Try alternative approach - modify existing policies
      try {
        console.log(`  Trying alternative approach for ${table}...`);
        
        const altResult = await adminSupabase.rpc('exec_sql', {
          sql: `
            -- Enable RLS but make everything public readable
            ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;
            
            -- Drop all SELECT policies
            DO $$
            DECLARE
              pol RECORD;
            BEGIN
              FOR pol IN 
                SELECT policyname 
                FROM pg_policies 
                WHERE tablename = '${table}' 
                AND cmd = 'SELECT'
              LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, '${table}');
              END LOOP;
            END $$;
            
            -- Create simple public read policy
            CREATE POLICY "allow_public_read" ON "${table}"
            FOR SELECT
            USING (true);
          `
        });
        
        console.log(`  ✅ Applied alternative fix for ${table}`);
      } catch (altError) {
        console.error(`  ❌ Alternative approach also failed:`, altError.message);
      }
    }
  }

  // Special handling for nested queries
  console.log('\n🔗 Ensuring foreign key relationships are accessible...');
  
  try {
    const fkResult = await adminSupabase.rpc('exec_sql', {
      sql: `
        -- Ensure profiles can be read when joining
        DROP POLICY IF EXISTS "public_profiles_read" ON profiles;
        CREATE POLICY "public_profiles_read" ON profiles
        FOR SELECT USING (true);
        
        -- Ensure equipment can be read when joining  
        DROP POLICY IF EXISTS "public_equipment_read" ON equipment;
        CREATE POLICY "public_equipment_read" ON equipment
        FOR SELECT USING (true);
        
        -- Ensure user_bags can be read when joining
        DROP POLICY IF EXISTS "public_bags_read" ON user_bags;
        CREATE POLICY "public_bags_read" ON user_bags
        FOR SELECT USING (true);
        
        -- Ensure bag_equipment can be read when joining
        DROP POLICY IF EXISTS "public_bag_equipment_read" ON bag_equipment;
        CREATE POLICY "public_bag_equipment_read" ON bag_equipment
        FOR SELECT USING (true);
      `
    });
    
    console.log('✅ Foreign key relationships fixed');
  } catch (error) {
    console.error('❌ Error fixing foreign keys:', error.message);
  }

  console.log('\n✨ Public read access configuration complete!\n');
  
  // Test the access
  console.log('🧪 Testing anonymous access...');
  
  try {
    // Create an anonymous client
    const { createClient } = await import('@supabase/supabase-js');
    const anonClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    // Test each table
    for (const table of ['feed_posts', 'equipment', 'user_bags']) {
      const { data, error } = await anonClient
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`  ❌ ${table}: Failed - ${error.message}`);
      } else {
        console.log(`  ✅ ${table}: Success - Can read ${data?.length || 0} rows`);
      }
    }
  } catch (error) {
    console.error('Error testing access:', error);
  }
}

fixPublicReadAccess().catch(console.error);