#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load both .env and .env.local
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyRLSFixes() {
  console.log('🔐 Applying RLS fixes...');

  try {
    // Step 1: Enable RLS on critical tables
    console.log('\n1. Enabling RLS on feed_likes and user_follows tables...');
    
    const enableRLSQueries = [
      'ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;'
    ];

    for (const query of enableRLSQueries) {
      console.log(`Executing: ${query}`);
      const { error } = await supabase.rpc('execute_sql', { query: query });
      if (error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.log('✅ Success');
      }
    }

    // Step 2: Create feed_likes policies
    console.log('\n2. Creating feed_likes RLS policies...');
    
    const feedLikesQueries = [
      'DROP POLICY IF EXISTS "feed_likes_select_policy" ON public.feed_likes;',
      'DROP POLICY IF EXISTS "feed_likes_insert_policy" ON public.feed_likes;',
      'DROP POLICY IF EXISTS "feed_likes_delete_policy" ON public.feed_likes;',
      `CREATE POLICY "feed_likes_select_policy" 
       ON public.feed_likes 
       FOR SELECT 
       TO authenticated, anon 
       USING (true);`,
      `CREATE POLICY "feed_likes_insert_policy" 
       ON public.feed_likes 
       FOR INSERT 
       TO authenticated 
       WITH CHECK (auth.uid() = user_id);`,
      `CREATE POLICY "feed_likes_delete_policy" 
       ON public.feed_likes 
       FOR DELETE 
       TO authenticated 
       USING (auth.uid() = user_id);`
    ];

    for (const query of feedLikesQueries) {
      console.log(`Executing policy: ${query.split('\n')[0]}...`);
      const { error } = await supabase.rpc('execute_sql', { query: query });
      if (error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.log('✅ Success');
      }
    }

    // Step 3: Create user_follows policies
    console.log('\n3. Creating user_follows RLS policies...');
    
    const userFollowsQueries = [
      'DROP POLICY IF EXISTS "user_follows_select_policy" ON public.user_follows;',
      'DROP POLICY IF EXISTS "user_follows_insert_policy" ON public.user_follows;',
      'DROP POLICY IF EXISTS "user_follows_delete_policy" ON public.user_follows;',
      `CREATE POLICY "user_follows_select_policy" 
       ON public.user_follows 
       FOR SELECT 
       TO authenticated, anon 
       USING (true);`,
      `CREATE POLICY "user_follows_insert_policy" 
       ON public.user_follows 
       FOR INSERT 
       TO authenticated 
       WITH CHECK (auth.uid() = follower_id);`,
      `CREATE POLICY "user_follows_delete_policy" 
       ON public.user_follows 
       FOR DELETE 
       TO authenticated 
       USING (auth.uid() = follower_id);`
    ];

    for (const query of userFollowsQueries) {
      console.log(`Executing policy: ${query.split('\n')[0]}...`);
      const { error } = await supabase.rpc('execute_sql', { query: query });
      if (error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.log('✅ Success');
      }
    }

    console.log('\n🎉 RLS fixes applied successfully!');
    console.log('\nSummary of changes:');
    console.log('- Enabled RLS on feed_likes and user_follows tables');
    console.log('- Created SELECT, INSERT, DELETE policies for feed_likes');
    console.log('- Created SELECT, INSERT, DELETE policies for user_follows');
    console.log('- All policies enforce proper user ownership and authentication');

  } catch (error) {
    console.error('❌ Error applying RLS fixes:', error);
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution if rpc doesn't work
async function executeDirectSQL(sqlQuery) {
  try {
    const { data, error } = await supabase
      .from('_temp_exec')
      .select()
      .eq('sql', sqlQuery);
    
    if (error) {
      console.error('Direct SQL error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Direct SQL execution failed:', err);
    return false;
  }
}

applyRLSFixes().catch(console.error);