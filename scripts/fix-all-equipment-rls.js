import './supabase-admin.js';
import { supabase } from './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

async function fixAllEquipmentRLS() {
  console.log('🔧 COMPREHENSIVE RLS FIX FOR EQUIPMENT SYSTEM\n');
  console.log('=' .repeat(60));
  
  if (!DATABASE_URL) {
    console.error('❌ Missing DATABASE_URL in .env.local');
    console.log('\n📋 Please run this SQL in your Supabase Dashboard instead:');
    console.log('   (Dashboard > SQL Editor > New Query)\n');
    
    displaySQLFix();
    return;
  }

  const client = new pg.Client({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();

    // Step 1: Enable RLS on all tables
    console.log('\n📊 Step 1: Enabling RLS on tables...');
    const tables = ['equipment', 'bag_equipment', 'user_bags'];
    
    for (const table of tables) {
      await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      console.log(`  ✅ RLS enabled on ${table}`);
    }

    // Step 2: Fix EQUIPMENT table policies
    console.log('\n🛠️ Step 2: Fixing equipment table policies...');
    
    // Drop existing policies
    const equipmentPolicies = [
      'Equipment is viewable by everyone',
      'Public read access',
      'Enable read access for all users',
      'equipment_select_policy',
      'Users can insert equipment',
      'Users can update their own equipment',
      'Authenticated users can insert equipment',
      'Authenticated users can update equipment'
    ];
    
    for (const policy of equipmentPolicies) {
      await client.query(`DROP POLICY IF EXISTS "${policy}" ON equipment`).catch(() => {});
    }
    
    // Create new comprehensive policies
    await client.query(`
      CREATE POLICY "Anyone can view equipment" 
      ON equipment FOR SELECT 
      USING (true)
    `);
    console.log('  ✅ Created public SELECT policy');
    
    await client.query(`
      CREATE POLICY "Authenticated users can add equipment"
      ON equipment FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL)
    `);
    console.log('  ✅ Created INSERT policy for authenticated users');
    
    await client.query(`
      CREATE POLICY "Users can update equipment they added"
      ON equipment FOR UPDATE
      USING (
        auth.uid() IS NOT NULL AND (
          added_by_user_id = auth.uid() OR
          added_by_user_id IS NULL
        )
      )
      WITH CHECK (
        auth.uid() IS NOT NULL AND (
          added_by_user_id = auth.uid() OR
          added_by_user_id IS NULL
        )
      )
    `);
    console.log('  ✅ Created UPDATE policy');
    
    // Step 3: Fix BAG_EQUIPMENT table policies
    console.log('\n🎒 Step 3: Fixing bag_equipment table policies...');
    
    // Drop existing policies
    const bagEquipmentPolicies = [
      'Public can view bag equipment',
      'Users can manage own bag equipment',
      'Anyone can view equipment',
      'Users manage own equipment',
      'Users can add equipment to their bags',
      'Users can update equipment in their bags',
      'Users can delete equipment from their bags'
    ];
    
    for (const policy of bagEquipmentPolicies) {
      await client.query(`DROP POLICY IF EXISTS "${policy}" ON bag_equipment`).catch(() => {});
    }
    
    // Create new policies
    await client.query(`
      CREATE POLICY "Anyone can view bag equipment" 
      ON bag_equipment FOR SELECT 
      USING (true)
    `);
    console.log('  ✅ Created public SELECT policy');
    
    await client.query(`
      CREATE POLICY "Users can add equipment to their bags"
      ON bag_equipment FOR INSERT
      WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM user_bags
          WHERE user_bags.id = bag_equipment.bag_id
          AND user_bags.user_id = auth.uid()
        )
      )
    `);
    console.log('  ✅ Created INSERT policy');
    
    await client.query(`
      CREATE POLICY "Users can update equipment in their bags"
      ON bag_equipment FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM user_bags
          WHERE user_bags.id = bag_equipment.bag_id
          AND user_bags.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_bags
          WHERE user_bags.id = bag_equipment.bag_id
          AND user_bags.user_id = auth.uid()
        )
      )
    `);
    console.log('  ✅ Created UPDATE policy');
    
    await client.query(`
      CREATE POLICY "Users can delete equipment from their bags"
      ON bag_equipment FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM user_bags
          WHERE user_bags.id = bag_equipment.bag_id
          AND user_bags.user_id = auth.uid()
        )
      )
    `);
    console.log('  ✅ Created DELETE policy');
    
    // Step 4: Fix USER_BAGS table policies
    console.log('\n👜 Step 4: Fixing user_bags table policies...');
    
    // Drop existing policies
    const userBagsPolicies = [
      'Public can view bags',
      'Users can manage own bags',
      'Anyone can view bags',
      'Users manage own bags',
      'Users can create their own bags',
      'Users can update their own bags',
      'Users can delete their own bags'
    ];
    
    for (const policy of userBagsPolicies) {
      await client.query(`DROP POLICY IF EXISTS "${policy}" ON user_bags`).catch(() => {});
    }
    
    // Create new policies
    await client.query(`
      CREATE POLICY "Anyone can view public bags" 
      ON user_bags FOR SELECT 
      USING (is_public = true OR user_id = auth.uid())
    `);
    console.log('  ✅ Created SELECT policy');
    
    await client.query(`
      CREATE POLICY "Users can create their own bags"
      ON user_bags FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid())
    `);
    console.log('  ✅ Created INSERT policy');
    
    await client.query(`
      CREATE POLICY "Users can update their own bags"
      ON user_bags FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid())
    `);
    console.log('  ✅ Created UPDATE policy');
    
    await client.query(`
      CREATE POLICY "Users can delete their own bags"
      ON user_bags FOR DELETE
      USING (user_id = auth.uid())
    `);
    console.log('  ✅ Created DELETE policy');
    
    // Step 5: Grant permissions
    console.log('\n🔑 Step 5: Granting permissions...');
    
    // Equipment table
    await client.query('GRANT SELECT ON equipment TO anon, authenticated');
    await client.query('GRANT INSERT, UPDATE, DELETE ON equipment TO authenticated');
    await client.query('GRANT USAGE, SELECT ON SEQUENCE equipment_id_seq TO authenticated').catch(() => {});
    console.log('  ✅ Granted equipment permissions');
    
    // Bag equipment table
    await client.query('GRANT SELECT ON bag_equipment TO anon, authenticated');
    await client.query('GRANT INSERT, UPDATE, DELETE ON bag_equipment TO authenticated');
    await client.query('GRANT USAGE, SELECT ON SEQUENCE bag_equipment_id_seq TO authenticated').catch(() => {});
    console.log('  ✅ Granted bag_equipment permissions');
    
    // User bags table
    await client.query('GRANT SELECT ON user_bags TO anon, authenticated');
    await client.query('GRANT INSERT, UPDATE, DELETE ON user_bags TO authenticated');
    await client.query('GRANT USAGE, SELECT ON SEQUENCE user_bags_id_seq TO authenticated').catch(() => {});
    console.log('  ✅ Granted user_bags permissions');
    
    // Step 6: Verify the fix
    console.log('\n🔍 Step 6: Verifying the fix...');
    
    // Test with anon key
    const supabaseAnon = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    // Check equipment access
    const { count: equipmentCount, error: equipmentError } = await supabaseAnon
      .from('equipment')
      .select('*', { count: 'exact', head: true });
    
    if (!equipmentError && equipmentCount > 0) {
      console.log(`  ✅ Equipment table: ${equipmentCount} items accessible`);
    } else {
      console.log(`  ⚠️ Equipment table: ${equipmentError?.message || 'No items'}`);
    }
    
    // Check bag_equipment access
    const { count: bagEquipmentCount, error: bagEquipmentError } = await supabaseAnon
      .from('bag_equipment')
      .select('*', { count: 'exact', head: true });
    
    if (!bagEquipmentError) {
      console.log(`  ✅ Bag equipment table: ${bagEquipmentCount} items accessible`);
    } else {
      console.log(`  ⚠️ Bag equipment table: ${bagEquipmentError?.message}`);
    }
    
    // Check user_bags access
    const { count: bagsCount, error: bagsError } = await supabaseAnon
      .from('user_bags')
      .select('*', { count: 'exact', head: true });
    
    if (!bagsError) {
      console.log(`  ✅ User bags table: ${bagsCount} public bags accessible`);
    } else {
      console.log(`  ⚠️ User bags table: ${bagsError?.message}`);
    }
    
    console.log('\n✅ RLS FIX COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    console.log('\nUsers should now be able to:');
    console.log('  • View all equipment');
    console.log('  • Add new equipment to the platform');
    console.log('  • Add equipment to their bags');
    console.log('  • Manage their bag contents');
    
  } catch (error) {
    console.error('\n❌ Error applying RLS fix:', error);
    console.log('\n📋 Please run this SQL manually in your Supabase Dashboard:');
    displaySQLFix();
  } finally {
    await client.end();
  }
}

function displaySQLFix() {
  const sql = `-- ====================================================================
-- COMPREHENSIVE RLS FIX FOR EQUIPMENT SYSTEM
-- ====================================================================
-- Run this in Supabase SQL Editor to fix all equipment-related RLS issues
-- ====================================================================

-- Step 1: Enable RLS on all tables
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;

-- Step 2: Fix EQUIPMENT table policies
-- Drop all existing policies
DROP POLICY IF EXISTS "Equipment is viewable by everyone" ON equipment;
DROP POLICY IF EXISTS "Public read access" ON equipment;
DROP POLICY IF EXISTS "Enable read access for all users" ON equipment;
DROP POLICY IF EXISTS "equipment_select_policy" ON equipment;
DROP POLICY IF EXISTS "Users can insert equipment" ON equipment;
DROP POLICY IF EXISTS "Users can update their own equipment" ON equipment;
DROP POLICY IF EXISTS "Authenticated users can insert equipment" ON equipment;
DROP POLICY IF EXISTS "Authenticated users can update equipment" ON equipment;

-- Create new comprehensive policies
CREATE POLICY "Anyone can view equipment" 
ON equipment FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can add equipment"
ON equipment FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update equipment they added"
ON equipment FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    added_by_user_id = auth.uid() OR
    added_by_user_id IS NULL
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    added_by_user_id = auth.uid() OR
    added_by_user_id IS NULL
  )
);

-- Step 3: Fix BAG_EQUIPMENT table policies
-- Drop all existing policies
DROP POLICY IF EXISTS "Public can view bag equipment" ON bag_equipment;
DROP POLICY IF EXISTS "Users can manage own bag equipment" ON bag_equipment;
DROP POLICY IF EXISTS "Anyone can view equipment" ON bag_equipment;
DROP POLICY IF EXISTS "Users manage own equipment" ON bag_equipment;
DROP POLICY IF EXISTS "Users can add equipment to their bags" ON bag_equipment;
DROP POLICY IF EXISTS "Users can update equipment in their bags" ON bag_equipment;
DROP POLICY IF EXISTS "Users can delete equipment from their bags" ON bag_equipment;

-- Create new policies
CREATE POLICY "Anyone can view bag equipment" 
ON bag_equipment FOR SELECT 
USING (true);

CREATE POLICY "Users can add equipment to their bags"
ON bag_equipment FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_bags
    WHERE user_bags.id = bag_equipment.bag_id
    AND user_bags.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update equipment in their bags"
ON bag_equipment FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_bags
    WHERE user_bags.id = bag_equipment.bag_id
    AND user_bags.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_bags
    WHERE user_bags.id = bag_equipment.bag_id
    AND user_bags.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete equipment from their bags"
ON bag_equipment FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_bags
    WHERE user_bags.id = bag_equipment.bag_id
    AND user_bags.user_id = auth.uid()
  )
);

-- Step 4: Fix USER_BAGS table policies
-- Drop all existing policies
DROP POLICY IF EXISTS "Public can view bags" ON user_bags;
DROP POLICY IF EXISTS "Users can manage own bags" ON user_bags;
DROP POLICY IF EXISTS "Anyone can view bags" ON user_bags;
DROP POLICY IF EXISTS "Users manage own bags" ON user_bags;
DROP POLICY IF EXISTS "Users can create their own bags" ON user_bags;
DROP POLICY IF EXISTS "Users can update their own bags" ON user_bags;
DROP POLICY IF EXISTS "Users can delete their own bags" ON user_bags;

-- Create new policies
CREATE POLICY "Anyone can view public bags" 
ON user_bags FOR SELECT 
USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can create their own bags"
ON user_bags FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can update their own bags"
ON user_bags FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own bags"
ON user_bags FOR DELETE
USING (user_id = auth.uid());

-- Step 5: Grant necessary permissions
-- Equipment table
GRANT SELECT ON equipment TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON equipment TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE equipment_id_seq TO authenticated;

-- Bag equipment table
GRANT SELECT ON bag_equipment TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON bag_equipment TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE bag_equipment_id_seq TO authenticated;

-- User bags table
GRANT SELECT ON user_bags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON user_bags TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE user_bags_id_seq TO authenticated;

-- Step 6: Verify the policies
SELECT tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE tablename IN ('equipment', 'bag_equipment', 'user_bags')
ORDER BY tablename, policyname;`;
  
  console.log(sql);
  
  console.log('\n📍 Direct link to SQL editor:');
  const projectRef = process.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];
  if (projectRef) {
    console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  }
}

// Run the fix
fixAllEquipmentRLS().catch(console.error);