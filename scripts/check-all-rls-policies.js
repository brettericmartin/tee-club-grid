import { getSupabaseAdmin } from './supabase-admin.js';

const supabase = getSupabaseAdmin();

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS policies for all tables...\n');

  const criticalTables = [
    'feed_posts',
    'profiles', 
    'equipment',
    'equipment_photos',
    'user_bags',
    'bag_equipment',
    'feed_likes',
    'user_follows'
  ];

  // Check RLS status for each table
  for (const table of criticalTables) {
    console.log(`\n📊 Table: ${table}`);
    console.log('=' .repeat(60));
    
    try {
      // Query to check RLS status
      const { data: rlsStatus, error: rlsError } = await supabase
        .rpc('check_table_rls_status', { table_name: table })
        .single();
      
      if (rlsStatus) {
        console.log(`  RLS Enabled: ${rlsStatus.rls_enabled ? '✅ YES' : '❌ NO'}`);
      }
    } catch (err) {
      // If RPC doesn't exist, try alternative method
    }
    
    // Get all policies for this table
    const { data: policies, error: policyError } = await supabase
      .rpc('get_policies_for_table', { table_name: table });
    
    if (policies && policies.length > 0) {
      console.log(`  Found ${policies.length} policies:`);
      
      policies.forEach(policy => {
        console.log(`\n  📝 Policy: ${policy.policyname}`);
        console.log(`     Command: ${policy.cmd}`);
        console.log(`     Permissive: ${policy.permissive ? 'YES' : 'NO'}`);
        console.log(`     Roles: ${policy.roles?.join(', ') || 'N/A'}`);
        
        // Parse and display the policy expression
        if (policy.qual) {
          console.log(`     Using Expression:`);
          console.log(`       ${policy.qual}`);
        }
        if (policy.with_check) {
          console.log(`     With Check:`);
          console.log(`       ${policy.with_check}`);
        }
      });
    } else {
      console.log('  ⚠️ No policies found for this table');
    }
    
    // Test anonymous access
    console.log(`\n  🧪 Testing anonymous SELECT access...`);
    
    // Create an anonymous client for testing
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (anonKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const anonSupabase = createClient(process.env.VITE_SUPABASE_URL, anonKey);
      
      const { data, error } = await anonSupabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`     ❌ Anonymous SELECT blocked: ${error.message}`);
        if (error.code === 'PGRST301') {
          console.log(`        (JWT role lacks permission)`);
        }
      } else {
        console.log(`     ✅ Anonymous SELECT allowed (returned ${data?.length || 0} rows)`);
      }
    }
  }
  
  console.log('\n\n🔍 Checking specific failing queries...\n');
  
  // Test the exact failing query from Puppeteer
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (anonKey) {
    const { createClient } = await import('@supabase/supabase-js');
    const anonSupabase = createClient(process.env.VITE_SUPABASE_URL, anonKey);
    
    console.log('Testing user_bags with nested selects (as anonymous):');
    const { data, error } = await anonSupabase
      .from('user_bags')
      .select(`
        id,
        name,
        description,
        background_image,
        bag_equipment(
          equipment(
            brand,
            model,
            category,
            msrp
          )
        )
      `)
      .eq('id', '6edbfb80-662a-441c-8555-1cba6e0ba882')
      .single();
    
    if (error) {
      console.log(`  ❌ Failed: ${error.message}`);
      console.log(`     Code: ${error.code}`);
      console.log(`     Details: ${error.details}`);
      console.log(`     Hint: ${error.hint}`);
    } else {
      console.log(`  ✅ Success!`);
      console.log(`     Bag: ${data?.name}`);
    }
  }
}

// Alternative function to get policies using SQL
async function getPoliciesSQL() {
  console.log('\n\n📋 Getting policies via direct SQL query...\n');
  
  const { data: policies, error } = await supabase.rpc('get_all_policies');
  
  if (error) {
    // Try direct query
    const query = `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;
    
    const { data, error: queryError } = await supabase.rpc('execute_sql', { query });
    
    if (queryError) {
      console.log('Could not fetch policies:', queryError.message);
    } else {
      console.log('Policies found:', data);
    }
  } else {
    const tableGroups = {};
    policies.forEach(p => {
      if (!tableGroups[p.tablename]) {
        tableGroups[p.tablename] = [];
      }
      tableGroups[p.tablename].push(p);
    });
    
    Object.keys(tableGroups).forEach(table => {
      console.log(`\n📊 ${table}:`);
      tableGroups[table].forEach(p => {
        console.log(`  - ${p.policyname} (${p.cmd}): ${p.permissive ? 'PERMISSIVE' : 'RESTRICTIVE'}`);
      });
    });
  }
}

// Run the checks
checkRLSPolicies()
  .then(() => getPoliciesSQL())
  .catch(console.error);