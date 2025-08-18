import { supabase } from './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testUserFollowsPolicies() {
  console.log('🧪 Testing user_follows RLS Policies Implementation\n');

  try {
    // Get two profile IDs for testing
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .limit(2);
    
    if (!profiles || profiles.length < 2) {
      console.log('❌ Need at least 2 profiles for testing');
      return;
    }

    const [profile1, profile2] = profiles;
    console.log(`📋 Test profiles: ${profile1.id} and ${profile2.id}\n`);

    // Test 1: Check current RLS status
    console.log('1. CHECKING CURRENT RLS STATUS...\n');
    
    try {
      const { data: rlsStatus, error: rlsError } = await supabase
        .rpc('exec_sql', {
          sql_query: `
            SELECT 
              schemaname,
              tablename,
              rowsecurity as rls_enabled
            FROM pg_tables 
            WHERE tablename = 'user_follows' AND schemaname = 'public';
          `
        });
      
      if (rlsError) {
        console.log('⚠️ Could not check RLS status via RPC');
      } else {
        console.log('RLS Status:', rlsStatus);
      }
    } catch (e) {
      console.log('⚠️ RLS check failed, continuing with other tests...');
    }

    // Test 2: Service role access (should always work)
    console.log('2. TESTING SERVICE ROLE ACCESS...\n');
    
    const { data: serviceData, error: serviceError } = await supabase
      .from('user_follows')
      .select('*')
      .limit(3);
    
    if (serviceError) {
      console.log('❌ Service role access failed:', serviceError.message);
    } else {
      console.log(`✅ Service role: Can read ${serviceData.length} records`);
    }

    // Test 3: Anonymous access (should work if SELECT policy allows it)
    console.log('3. TESTING ANONYMOUS ACCESS...\n');
    
    const anonSupabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    const { data: anonData, error: anonError } = await anonSupabase
      .from('user_follows')
      .select('*')
      .limit(3);
    
    if (anonError) {
      console.log('❌ Anonymous access failed:', anonError.message);
      console.log('   This means RLS is properly blocking anonymous reads');
    } else {
      console.log(`✅ Anonymous access: Can read ${anonData.length} records`);
    }

    // Test 4: Try to insert as service role (should work)
    console.log('4. TESTING SERVICE ROLE INSERT...\n');
    
    const testFollowId = `test-${Date.now()}`;
    const { data: insertData, error: insertError } = await supabase
      .from('user_follows')
      .insert({ 
        follower_id: profile1.id, 
        following_id: profile2.id 
      })
      .select()
      .single();
    
    if (insertError) {
      if (insertError.code === '23505') {
        console.log('✅ Service role insert: Relationship already exists');
      } else {
        console.log('❌ Service role insert failed:', insertError.message);
      }
    } else {
      console.log('✅ Service role insert: Success');
      
      // Clean up
      await supabase
        .from('user_follows')
        .delete()
        .eq('id', insertData.id);
      console.log('   (Test record cleaned up)');
    }

    // Test 5: Check if policies exist
    console.log('5. CHECKING EXISTING POLICIES...\n');
    
    try {
      const { data: policies, error: policyError } = await supabase
        .rpc('exec_sql', {
          sql_query: `
            SELECT 
              policyname,
              permissive,
              roles,
              cmd,
              qual,
              with_check
            FROM pg_policies 
            WHERE tablename = 'user_follows'
            ORDER BY cmd, policyname;
          `
        });
      
      if (policyError) {
        console.log('⚠️ Could not fetch policies via RPC');
      } else if (policies && policies.length > 0) {
        console.log(`Found ${policies.length} existing policies:`);
        policies.forEach(policy => {
          console.log(`  📋 ${policy.policyname} (${policy.cmd})`);
          console.log(`     Roles: ${policy.roles}`);
          console.log(`     Using: ${policy.qual || 'true'}`);
          console.log(`     With Check: ${policy.with_check || 'N/A'}\n`);
        });
      } else {
        console.log('⚠️ No policies found - this means RLS might not be properly configured');
      }
    } catch (e) {
      console.log('⚠️ Policy check failed');
    }

    // Final assessment
    console.log('6. ASSESSMENT AND RECOMMENDATIONS...\n');
    
    if (anonError) {
      console.log('✅ GOOD: Anonymous access is blocked (RLS working)');
      console.log('   The INSERT policy is likely working correctly');
    } else {
      console.log('⚠️ ISSUE: Anonymous access is allowed');
      console.log('   This suggests either:');
      console.log('   - RLS is not enabled on the table');
      console.log('   - There are overly permissive policies');
      console.log('   - No policies exist (defaults to allow for service role)');
    }

    console.log('\n📋 REQUIRED SQL TO FIX RLS POLICIES:');
    console.log('=' .repeat(80));
    console.log(`
-- Enable RLS and create proper policies for user_follows table
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view all follows" ON public.user_follows;
DROP POLICY IF EXISTS "Authenticated users can follow" ON public.user_follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.user_follows;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_follows;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_follows;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.user_follows;

-- Create SELECT policy (all users can view follows)
CREATE POLICY "Users can view all follows" 
ON public.user_follows 
FOR SELECT 
TO authenticated, anon 
USING (true);

-- Create INSERT policy (only allow users to follow as themselves)
CREATE POLICY "Authenticated users can follow" 
ON public.user_follows 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = follower_id);

-- Create DELETE policy (only allow users to unfollow as themselves)
CREATE POLICY "Users can unfollow" 
ON public.user_follows 
FOR DELETE 
TO authenticated 
USING (auth.uid() = follower_id);

-- Verify policies were created
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
WHERE tablename = 'user_follows'
ORDER BY cmd, policyname;
`);
    console.log('=' .repeat(80));

    console.log('\n🔗 Execute this SQL in Supabase Dashboard > SQL Editor');
    console.log(`📍 Dashboard: https://supabase.com/dashboard/project/${process.env.VITE_SUPABASE_URL.split('/')[2].split('.')[0]}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testUserFollowsPolicies();