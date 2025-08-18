import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Need service role key for RLS management
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  SUPABASE_SERVICE_KEY
);

async function fixFollowRLS() {
  console.log('🔧 Fixing Follow System RLS Policies\n');

  try {
    // First, let's check if we're using anon key (limited permissions)
    if (SUPABASE_SERVICE_KEY === process.env.VITE_SUPABASE_ANON_KEY) {
      console.log('⚠️ Using anonymous key - limited permissions');
      console.log('   RLS policies need to be fixed in Supabase dashboard\n');
      
      console.log('📝 Required RLS Policies for user_follows table:\n');
      console.log('1. SELECT Policy (view all follows):');
      console.log('   Name: "Users can view all follows"');
      console.log('   Operation: SELECT');
      console.log('   Target roles: authenticated, anon');
      console.log('   Check expression: true\n');
      
      console.log('2. INSERT Policy (users can follow):');
      console.log('   Name: "Authenticated users can follow"');
      console.log('   Operation: INSERT');
      console.log('   Target roles: authenticated');
      console.log('   With check expression: auth.uid() = follower_id\n');
      
      console.log('3. DELETE Policy (users can unfollow):');
      console.log('   Name: "Users can unfollow"');
      console.log('   Operation: DELETE');
      console.log('   Target roles: authenticated');
      console.log('   Using expression: auth.uid() = follower_id\n');
      
      console.log('🌐 Go to Supabase Dashboard:');
      console.log('   1. Navigate to Authentication > Policies');
      console.log('   2. Find the user_follows table');
      console.log('   3. Update or create the policies above');
      console.log('   4. Make sure RLS is enabled for the table\n');
      
      // Test current permissions
      console.log('Testing current permissions...\n');
      
      // Test SELECT
      const { data: selectTest, error: selectError } = await supabase
        .from('user_follows')
        .select('*')
        .limit(1);
      
      if (selectError) {
        console.log('❌ SELECT permission: Failed');
        console.log('   Error:', selectError.message);
      } else {
        console.log('✅ SELECT permission: Working');
      }
      
      // Get a test user to test INSERT/DELETE
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .limit(2);
      
      if (profiles && profiles.length >= 2) {
        // Test if we can check for existing follow
        const { data: existing } = await supabase
          .from('user_follows')
          .select('*')
          .eq('follower_id', profiles[0].id)
          .eq('following_id', profiles[1].id)
          .maybeSingle();
        
        if (existing) {
          console.log('✅ Follow relationship exists between test users');
        } else {
          console.log('⚠️ No follow relationship between test users');
        }
      }
      
      return;
    }

    // If we have service role key, we can fix the policies
    console.log('✅ Using service role key - can update policies');
    
    // This would require direct SQL execution which isn't available via client library
    // So we'll provide the SQL to run in Supabase SQL editor
    
    console.log('📝 Run this SQL in Supabase SQL Editor:\n');
    console.log(`
-- Enable RLS on user_follows table
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all follows" ON public.user_follows;
DROP POLICY IF EXISTS "Authenticated users can follow" ON public.user_follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.user_follows;

-- Create new policies
CREATE POLICY "Users can view all follows" 
ON public.user_follows 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Authenticated users can follow" 
ON public.user_follows 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" 
ON public.user_follows 
FOR DELETE 
TO authenticated 
USING (auth.uid() = follower_id);

-- Verify policies
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
WHERE tablename = 'user_follows';
    `);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixFollowRLS();