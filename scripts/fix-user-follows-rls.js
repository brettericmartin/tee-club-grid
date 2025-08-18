import { supabase } from './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkAndFixUserFollowsRLS() {
  console.log('🔧 Checking and Fixing user_follows RLS Policies\n');

  try {
    // Step 1: Check current table structure and data
    console.log('1. CHECKING TABLE STRUCTURE...\n');
    
    const { data: tableData, error: tableError } = await supabase
      .from('user_follows')
      .select('*')
      .limit(3);
    
    if (tableError) {
      console.log('❌ Could not access user_follows table:', tableError.message);
      return;
    }
    
    console.log(`✅ Table accessible. Found ${tableData.length} records.`);
    if (tableData.length > 0) {
      console.log('Sample record:', tableData[0]);
    }

    // Step 2: Print the SQL commands that need to be run
    console.log('\n2. SQL COMMANDS TO FIX RLS POLICIES:\n');
    console.log('Copy and paste the following SQL into Supabase SQL Editor:\n');
    
    const sqlScript = `
-- Enable RLS on user_follows table
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
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

-- Create INSERT policy (allow authenticated users to follow where they are the follower)
CREATE POLICY "Authenticated users can follow" 
ON public.user_follows 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = follower_id);

-- Create DELETE policy (allow authenticated users to unfollow where they are the follower)
CREATE POLICY "Users can unfollow" 
ON public.user_follows 
FOR DELETE 
TO authenticated 
USING (auth.uid() = follower_id);

-- Verify the policies were created
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

    // Step 3: Test current permissions
    console.log('\n3. TESTING CURRENT PERMISSIONS...\n');
    
    // Test SELECT with anon key
    const anonSupabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    const { data: selectTest, error: selectError } = await anonSupabase
      .from('user_follows')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.log('❌ SELECT test (anon key) failed:', selectError.message);
      console.log('   This suggests RLS is blocking anonymous reads');
    } else {
      console.log('✅ SELECT test (anon key) passed');
    }

    // Get some user IDs for testing
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(2);
    
    if (profilesError) {
      console.log('⚠️ Could not get profile IDs for testing:', profilesError.message);
    } else if (profiles && profiles.length >= 2) {
      console.log(`✅ Found ${profiles.length} profiles for testing`);
      
      // Check if there are any existing follow relationships
      const { data: existingFollows, error: followsError } = await supabase
        .from('user_follows')
        .select('*')
        .eq('follower_id', profiles[0].id)
        .eq('following_id', profiles[1].id);
      
      if (followsError) {
        console.log('❌ Could not check existing follows:', followsError.message);
      } else {
        console.log(`✅ Existing follow relationship check: ${existingFollows.length} found`);
      }
    }

    console.log('\n4. NEXT STEPS:\n');
    console.log('1. Copy the SQL commands above');
    console.log('2. Go to your Supabase dashboard');
    console.log('3. Navigate to SQL Editor');
    console.log('4. Paste and run the SQL');
    console.log('5. Run this script again to verify the changes\n');

    console.log('🌐 Supabase Dashboard URL:');
    console.log(`https://supabase.com/dashboard/project/${process.env.VITE_SUPABASE_URL.split('/')[2].split('.')[0]}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkAndFixUserFollowsRLS();