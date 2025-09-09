#!/usr/bin/env node
import { supabase } from './supabase-admin.js';

async function checkFollowRLS() {
  console.log('🔍 Checking user_follows RLS Policies\n');
  
  try {
    // Check if RLS is enabled
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT relname, relrowsecurity 
        FROM pg_class 
        WHERE relname = 'user_follows';
      `
    });
    
    if (rlsError) {
      console.log('Error checking RLS status:', rlsError);
    } else {
      console.log('RLS Enabled:', rlsStatus?.[0]?.relrowsecurity ? 'Yes ✅' : 'No ❌');
    }
    
    // Get all policies for user_follows
    const { data: policies, error: policiesError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          polname as policy_name,
          polcmd as command,
          polpermissive as permissive,
          pg_get_expr(polqual, polrelid) as using_expression,
          pg_get_expr(polwithcheck, polrelid) as with_check_expression,
          rolname as role_name
        FROM pg_policy
        JOIN pg_class ON pg_class.oid = pg_policy.polrelid
        LEFT JOIN pg_roles ON pg_roles.oid = ANY(pg_policy.polroles)
        WHERE pg_class.relname = 'user_follows'
        ORDER BY polname;
      `
    });
    
    if (policiesError) {
      console.log('Error getting policies:', policiesError);
    } else if (!policies || policies.length === 0) {
      console.log('\n❌ No RLS policies found for user_follows table');
    } else {
      console.log('\nCurrent RLS Policies:');
      console.log('====================\n');
      
      policies.forEach((policy, index) => {
        console.log(`${index + 1}. Policy: ${policy.policy_name}`);
        console.log(`   Command: ${getCommandName(policy.command)}`);
        console.log(`   Type: ${policy.permissive ? 'PERMISSIVE' : 'RESTRICTIVE'}`);
        console.log(`   Role: ${policy.role_name || 'public'}`);
        if (policy.using_expression) {
          console.log(`   USING: ${policy.using_expression}`);
        }
        if (policy.with_check_expression) {
          console.log(`   WITH CHECK: ${policy.with_check_expression}`);
        }
        console.log('');
      });
    }
    
    // Test query to see if current policies work
    console.log('\n📊 Testing Queries:');
    console.log('==================\n');
    
    // Test SELECT
    const { data: selectTest, error: selectError } = await supabase
      .from('user_follows')
      .select('*')
      .limit(1);
    
    console.log('SELECT test:', selectError ? `❌ Error: ${selectError.message}` : '✅ Success');
    
    // Get a test user ID
    const { data: testUser } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();
    
    if (testUser) {
      // Test INSERT (without actually inserting)
      console.log('INSERT test: Would need auth context to properly test');
      console.log('DELETE test: Would need auth context to properly test');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

function getCommandName(cmd) {
  const commands = {
    'r': 'SELECT',
    'a': 'INSERT',
    'w': 'UPDATE',
    'd': 'DELETE',
    '*': 'ALL'
  };
  return commands[cmd] || cmd;
}

checkFollowRLS();