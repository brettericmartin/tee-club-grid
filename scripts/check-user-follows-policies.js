import { supabase } from './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkUserFollowsPolicies() {
  console.log('🔍 Checking user_follows RLS Policies\n');

  try {
    // Check table accessibility with service role
    console.log('1. CHECKING TABLE ACCESS WITH SERVICE ROLE...\n');
    const { data: serviceData, error: serviceError } = await supabase
      .from('user_follows')
      .select('*')
      .limit(3);
    
    if (serviceError) {
      console.log('❌ Service role access failed:', serviceError.message);
    } else {
      console.log(`✅ Service role access: ${serviceData.length} records found`);
      if (serviceData.length > 0) {
        console.log('Sample record:', serviceData[0]);
      }
    }

    // Check table accessibility with anon key
    console.log('\n2. CHECKING TABLE ACCESS WITH ANON KEY...\n');
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
      console.log('   This suggests RLS is blocking reads');
    } else {
      console.log(`✅ Anonymous access: ${anonData.length} records found`);
    }

    // Try to get current policies (this might not work without proper RPC functions)
    console.log('\n3. ATTEMPTING TO CHECK CURRENT POLICIES...\n');
    
    try {
      const { data: policies, error: policyError } = await supabase
        .from('pg_policies')
        .select('policyname, permissive, roles, cmd, qual, with_check')
        .eq('tablename', 'user_follows');
      
      if (policyError) {
        console.log('❌ Could not fetch policies:', policyError.message);
      } else {
        console.log(`Found ${policies.length} policies:`);
        policies.forEach(policy => {
          console.log(`  - ${policy.policyname} (${policy.cmd})`);
          console.log(`    Roles: ${policy.roles}`);
          console.log(`    Using: ${policy.qual || 'true'}`);
          console.log(`    With Check: ${policy.with_check || 'N/A'}\n`);
        });
      }
    } catch (e) {
      console.log('❌ Could not access pg_policies:', e.message);
    }

    // Test INSERT capability (this will fail without auth context)
    console.log('4. TESTING INSERT CAPABILITY...\n');
    
    // Get two profile IDs for testing
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .limit(2);
    
    if (profiles && profiles.length >= 2) {
      const [profile1, profile2] = profiles;
      
      // Try to insert with service role (this should work)
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
          console.log('✅ INSERT test: Relationship already exists (this is expected)');
        } else {
          console.log('❌ INSERT test failed:', insertError.message);
        }
      } else {
        console.log('✅ INSERT test: Success (new relationship created)');
        
        // Clean up - delete the test record
        await supabase
          .from('user_follows')
          .delete()
          .eq('id', insertData.id);
        console.log('   (Test record cleaned up)');
      }
    }

    console.log('\n5. REQUIRED RLS FIXES:\n');
    console.log('📋 The following SQL needs to be executed in Supabase SQL Editor:');
    console.log('=' .repeat(60));
    
    const sqlScript = `
-- Enable RLS on user_follows table
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Users can view all follows" ON public.user_follows;
DROP POLICY IF EXISTS "Authenticated users can follow" ON public.user_follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.user_follows;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_follows;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_follows;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.user_follows;

-- Create SELECT policy (allow all users to view follows)
CREATE POLICY "Users can view all follows" 
ON public.user_follows 
FOR SELECT 
TO authenticated, anon 
USING (true);

-- Create INSERT policy (allow authenticated users to follow)
CREATE POLICY "Authenticated users can follow" 
ON public.user_follows 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = follower_id);

-- Create DELETE policy (allow authenticated users to unfollow)
CREATE POLICY "Users can unfollow" 
ON public.user_follows 
FOR DELETE 
TO authenticated 
USING (auth.uid() = follower_id);

-- Verify the new policies
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
`;

    console.log(sqlScript);
    console.log('=' .repeat(60));

    console.log('\n6. NEXT STEPS:\n');
    console.log('1. 📋 Copy the SQL above');
    console.log('2. 🌐 Go to Supabase Dashboard > SQL Editor');
    console.log('3. 📝 Paste and execute the SQL');
    console.log('4. 🔄 Run this script again to verify');
    console.log('\n🔗 Dashboard URL:');
    console.log(`https://supabase.com/dashboard/project/${process.env.VITE_SUPABASE_URL.split('/')[2].split('.')[0]}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkUserFollowsPolicies();