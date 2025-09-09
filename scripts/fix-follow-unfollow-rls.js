#!/usr/bin/env node
import { supabase } from './supabase-admin.js';

async function fixFollowUnfollowRLS() {
  console.log('🔧 Fixing Follow/Unfollow RLS Policies\n');
  
  const policies = [
    // Enable RLS
    `ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;`,
    
    // Drop existing policies
    `DROP POLICY IF EXISTS "Users can view all follows" ON user_follows;`,
    `DROP POLICY IF EXISTS "Users can follow others" ON user_follows;`,
    `DROP POLICY IF EXISTS "Users can unfollow" ON user_follows;`,
    `DROP POLICY IF EXISTS "user_follows_select_policy" ON user_follows;`,
    `DROP POLICY IF EXISTS "user_follows_insert_policy" ON user_follows;`,
    `DROP POLICY IF EXISTS "user_follows_delete_policy" ON user_follows;`,
    
    // SELECT: Anyone can view follows
    `CREATE POLICY "user_follows_select_policy" 
     ON user_follows 
     FOR SELECT 
     USING (true);`,
    
    // INSERT: Users can only create follows where they are the follower
    `CREATE POLICY "user_follows_insert_policy" 
     ON user_follows 
     FOR INSERT 
     WITH CHECK (auth.uid() = follower_id);`,
    
    // DELETE: Users can only delete their own follows (where they are the follower)
    `CREATE POLICY "user_follows_delete_policy" 
     ON user_follows 
     FOR DELETE 
     USING (auth.uid() = follower_id);`
  ];
  
  try {
    console.log('Executing RLS fixes...\n');
    
    for (const sql of policies) {
      const cleanSql = sql.trim();
      const policyName = cleanSql.match(/POLICY\s+"([^"]+)"/)?.[1] || 
                        cleanSql.match(/ALTER TABLE (\w+)/)?.[1] ||
                        'Operation';
      
      console.log(`Executing: ${policyName}...`);
      
      // Since we can't execute raw SQL directly through Supabase JS client,
      // we'll just output the SQL for execution
      console.log(`📝 SQL generated`)
    }
    
    console.log('\n📝 Summary of SQL to execute:\n');
    console.log('```sql');
    policies.forEach(sql => console.log(sql));
    console.log('```');
    
    console.log('\n✅ RLS policies have been prepared for user_follows table');
    console.log('\nThe policies enable:');
    console.log('  - Anyone can view follows (SELECT)');
    console.log('  - Users can follow others (INSERT where follower_id = auth.uid())');
    console.log('  - Users can unfollow (DELETE where follower_id = auth.uid())');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixFollowUnfollowRLS();