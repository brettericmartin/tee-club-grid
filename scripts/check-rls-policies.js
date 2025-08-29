import { supabase } from './supabase-admin.js';

async function checkRLSPolicies() {
  console.log('🔒 CHECKING ROW LEVEL SECURITY POLICIES');
  console.log('=' .repeat(80));
  
  try {
    // Get all RLS policies directly from the database
    const { data: policies, error } = await supabase.rpc('get_all_rls_policies', {});
    
    if (error) {
      // If the function doesn't exist, query the system catalog directly
      console.log('⚠️  Custom RPC not available, using direct queries...\n');
      
      // Query pg_policies view for all RLS policies
      const { data: allPolicies, error: policyError } = await supabase
        .from('pg_policies')
        .select('*');
      
      if (policyError || !allPolicies) {
        console.log('❌ Cannot access pg_policies view');
        console.log('Falling back to manual table checks...\n');
        await checkTablesManually();
        return;
      }
      
      displayPolicies(allPolicies);
    } else {
      displayPolicies(policies);
    }
    
  } catch (err) {
    console.error('Error checking RLS policies:', err);
    await checkTablesManually();
  }
}

function displayPolicies(policies) {
  if (!policies || policies.length === 0) {
    console.log('⚠️  No RLS policies found in database');
    return;
  }
  
  // Group policies by table
  const policyByTable = {};
  policies.forEach(policy => {
    const tableName = policy.tablename || policy.table_name;
    if (!policyByTable[tableName]) {
      policyByTable[tableName] = [];
    }
    policyByTable[tableName].push(policy);
  });
  
  // Display policies by table
  Object.entries(policyByTable).forEach(([table, tablePolicies]) => {
    console.log(`\n📋 Table: ${table}`);
    console.log('-'.repeat(40));
    
    tablePolicies.forEach(policy => {
      const policyName = policy.policyname || policy.policy_name;
      const cmd = policy.cmd || policy.command;
      const permissive = policy.permissive ? 'PERMISSIVE' : 'RESTRICTIVE';
      const roles = policy.roles || [];
      const qual = policy.qual || policy.check || 'None';
      const withCheck = policy.with_check || 'None';
      
      console.log(`  Policy: ${policyName}`);
      console.log(`    Command: ${cmd}`);
      console.log(`    Type: ${permissive}`);
      console.log(`    Roles: ${Array.isArray(roles) ? roles.join(', ') : roles}`);
      console.log(`    Using: ${qual}`);
      if (withCheck !== 'None') {
        console.log(`    With Check: ${withCheck}`);
      }
      console.log('');
    });
  });
}

async function checkTablesManually() {
  console.log('📊 MANUAL RLS CHECK BY TABLE\n');
  
  const criticalTables = [
    'profiles',
    'user_bags',
    'bag_equipment',
    'equipment_photos',
    'feed_posts',
    'feed_likes',
    'user_follows',
    'waitlist_applications',
    'admins',
    'beta_waitlist'
  ];
  
  for (const table of criticalTables) {
    console.log(`\nChecking ${table}...`);
    
    try {
      // Try to query without authentication to see if RLS is enabled
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('row-level security') || 
            error.message.includes('permission denied')) {
          console.log(`  ✅ RLS enabled - Access restricted`);
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log(`  ❌ Table does not exist`);
        } else {
          console.log(`  ⚠️  Unexpected error: ${error.message}`);
        }
      } else {
        // If we can read without auth, RLS might not be properly configured
        console.log(`  ⚠️  RLS may not be properly configured (readable without auth)`);
        
        // Try to check specific operations
        await checkTableOperations(table);
      }
    } catch (err) {
      console.log(`  ❌ Error checking table: ${err.message}`);
    }
  }
  
  console.log('\n\n🔍 CHECKING PROFILES TABLE SPECIFICALLY');
  console.log('-'.repeat(40));
  
  // Special check for profiles table INSERT issue
  try {
    // Check if we can select from profiles
    const { data: selectTest, error: selectError } = await supabase
      .from('profiles')
      .select('id, username, beta_access, is_admin')
      .limit(1);
    
    console.log('SELECT test:', selectError ? `❌ ${selectError.message}` : '✅ Can select');
    
    // Check available columns
    if (selectTest && selectTest.length > 0) {
      console.log('Available columns:', Object.keys(selectTest[0]).join(', '));
    }
    
    // Check if the approve function exists
    const { data: funcCheck, error: funcError } = await supabase.rpc(
      'approve_user_by_email_if_capacity',
      { user_email: 'test@example.com' }
    ).single();
    
    if (funcError) {
      console.log(`Function test: ${funcError.message}`);
      if (funcError.message.includes('does not exist')) {
        console.log('  ⚠️  The approval function may not exist');
      } else if (funcError.message.includes('row-level security')) {
        console.log('  ❌ RLS blocking INSERT on profiles table');
      }
    }
    
  } catch (err) {
    console.log('Error in profiles check:', err.message);
  }
}

async function checkTableOperations(table) {
  console.log('    Testing operations:');
  
  // Test SELECT
  const { error: selectError } = await supabase
    .from(table)
    .select('*')
    .limit(1);
  console.log(`      SELECT: ${selectError ? '❌ Blocked' : '✅ Allowed'}`);
  
  // Test INSERT (dry run - won't actually insert)
  try {
    const { error: insertError } = await supabase
      .from(table)
      .insert({ id: 'test-dry-run' })
      .select()
      .limit(0); // Don't actually insert
    console.log(`      INSERT: ${insertError ? '❌ Blocked' : '⚠️  May be allowed'}`);
  } catch {
    console.log(`      INSERT: ❌ Blocked`);
  }
  
  // Test UPDATE (dry run)
  try {
    const { error: updateError } = await supabase
      .from(table)
      .update({ id: 'test' })
      .eq('id', 'non-existent-id');
    console.log(`      UPDATE: ${updateError ? '❌ Blocked' : '⚠️  May be allowed'}`);
  } catch {
    console.log(`      UPDATE: ❌ Blocked`);
  }
  
  // Test DELETE (dry run)
  try {
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq('id', 'non-existent-id');
    console.log(`      DELETE: ${deleteError ? '❌ Blocked' : '⚠️  May be allowed'}`);
  } catch {
    console.log(`      DELETE: ❌ Blocked`);
  }
}

// Main execution
console.log('Starting RLS policy analysis...\n');

checkRLSPolicies()
  .then(async () => {
    console.log('\n\n💡 RECOMMENDED RLS FIXES');
    console.log('=' .repeat(80));
    console.log(`
The following SQL should fix the RLS issues:

-- 1. Enable RLS on all tables that need it
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- 2. Create INSERT policy for profiles (CRITICAL FIX)
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 3. Ensure admin functions work
CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 4. Basic policies for other tables
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);
    `);
    
    console.log('\n✨ Analysis complete!');
    console.log('Run the SQL above in Supabase dashboard to fix RLS issues.');
  })
  .catch(error => {
    console.error('\n❌ RLS check failed:', error);
  });
