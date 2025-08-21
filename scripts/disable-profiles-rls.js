#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function disableProfilesRLS() {
  console.log('🔧 Temporarily disabling RLS on profiles to fix recursion...\n');

  // Create a SQL script to fix the issue
  const sqlStatements = [
    // First, disable RLS on profiles to break the cycle
    `ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;`,
    
    // Grant permissions
    `GRANT ALL ON profiles TO authenticated;`,
    `GRANT SELECT ON profiles TO anon;`,
    
    // Also ensure other tables don't have RLS issues
    `ALTER TABLE forum_threads DISABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE forum_posts DISABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE feed_posts DISABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE user_bags DISABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE bag_equipment DISABLE ROW LEVEL SECURITY;`,
    
    // Grant permissions for all tables
    `GRANT ALL ON forum_threads TO authenticated;`,
    `GRANT SELECT ON forum_threads TO anon;`,
    `GRANT ALL ON forum_posts TO authenticated;`,
    `GRANT SELECT ON forum_posts TO anon;`,
    `GRANT ALL ON feed_posts TO authenticated;`,
    `GRANT SELECT ON feed_posts TO anon;`,
    `GRANT ALL ON user_bags TO authenticated;`,
    `GRANT SELECT ON user_bags TO anon;`,
    `GRANT ALL ON bag_equipment TO authenticated;`,
    `GRANT SELECT ON bag_equipment TO anon;`
  ];

  console.log('⚠️  IMPORTANT: This will TEMPORARILY disable RLS on key tables.');
  console.log('   This is safe for development but should be fixed before production.\n');

  // Try to execute each statement
  for (const sql of sqlStatements) {
    console.log(`Executing: ${sql.substring(0, 50)}...`);
    
    // Try using the Supabase client directly (this might work for some operations)
    try {
      // For RLS operations, we need to use raw SQL
      // Since we can't execute these directly, let's output them for manual execution
      console.log('   ⚠️  Cannot execute directly. Add to SQL script.');
    } catch (err) {
      console.log('   ❌ Error:', err.message);
    }
  }

  console.log('\n📝 Creating SQL script file...');
  
  // Write the SQL to a file
  const fs = await import('fs');
  const sqlContent = `-- Emergency fix for RLS infinite recursion
-- Run this in Supabase SQL Editor

BEGIN;

-- Disable RLS on affected tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags DISABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;
GRANT ALL ON forum_threads TO authenticated;
GRANT SELECT ON forum_threads TO anon;
GRANT ALL ON forum_posts TO authenticated;
GRANT SELECT ON forum_posts TO anon;
GRANT ALL ON feed_posts TO authenticated;
GRANT SELECT ON feed_posts TO anon;
GRANT ALL ON user_bags TO authenticated;
GRANT SELECT ON user_bags TO anon;
GRANT ALL ON bag_equipment TO authenticated;
GRANT SELECT ON bag_equipment TO anon;

COMMIT;

-- Verify the changes
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'forum_threads', 'forum_posts', 'feed_posts', 'user_bags', 'bag_equipment');
`;

  fs.writeFileSync('./scripts/emergency-disable-rls.sql', sqlContent);
  console.log('✅ SQL script created: scripts/emergency-disable-rls.sql');
  
  console.log('\n🚨 ACTION REQUIRED:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste the contents of scripts/emergency-disable-rls.sql');
  console.log('4. Click "Run" to execute');
  console.log('\nThis will temporarily disable RLS to fix the infinite recursion.');
  console.log('After this, we can create proper RLS policies without circular dependencies.');
}

// Run the fix
disableProfilesRLS()
  .then(() => {
    console.log('\n✨ Script generation complete!');
  })
  .catch(error => {
    console.error('\n❌ Failed:', error);
  });