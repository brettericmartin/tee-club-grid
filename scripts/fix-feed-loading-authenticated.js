#!/usr/bin/env node

/**
 * Fix feed loading issues when authenticated
 * This script applies RLS policy fixes to ensure data loads correctly
 */

import { supabase } from './supabase-admin.js';

async function fixFeedLoadingIssues() {
  console.log('🔧 Fixing feed loading issues for authenticated users...\n');
  
  const fixes = [
    {
      name: 'Fix feed_posts RLS policies',
      sql: `
        -- Enable RLS
        ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Anyone can view posts" ON public.feed_posts;
        DROP POLICY IF EXISTS "Users can create posts" ON public.feed_posts;
        DROP POLICY IF EXISTS "Users can update their posts" ON public.feed_posts;
        DROP POLICY IF EXISTS "Users can delete their posts" ON public.feed_posts;
        
        -- Create new simple SELECT policy
        CREATE POLICY "Anyone can view posts" 
        ON public.feed_posts 
        FOR SELECT 
        USING (true);
        
        -- Create INSERT policy for authenticated users
        CREATE POLICY "Users can create posts" 
        ON public.feed_posts 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
        
        -- Create UPDATE policy
        CREATE POLICY "Users can update their posts" 
        ON public.feed_posts 
        FOR UPDATE 
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
        
        -- Create DELETE policy
        CREATE POLICY "Users can delete their posts" 
        ON public.feed_posts 
        FOR DELETE 
        USING (auth.uid() = user_id);
      `
    },
    {
      name: 'Fix feed_likes RLS policies',
      sql: `
        -- Enable RLS
        ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;
        
        -- Drop ALL existing policies
        DO $$ 
        BEGIN
          DROP POLICY IF EXISTS "feed_likes_select_policy" ON public.feed_likes;
          DROP POLICY IF EXISTS "feed_likes_insert_policy" ON public.feed_likes;
          DROP POLICY IF EXISTS "feed_likes_delete_policy" ON public.feed_likes;
          DROP POLICY IF EXISTS "Anyone can view likes" ON public.feed_likes;
          DROP POLICY IF EXISTS "Authenticated users can like" ON public.feed_likes;
          DROP POLICY IF EXISTS "Users can unlike their own" ON public.feed_likes;
        EXCEPTION
          WHEN undefined_object THEN NULL;
        END $$;
        
        -- Create simple SELECT policy - anyone can view
        CREATE POLICY "Anyone can view likes" 
        ON public.feed_likes 
        FOR SELECT 
        USING (true);
        
        -- Create INSERT policy for authenticated users
        CREATE POLICY "Authenticated users can like" 
        ON public.feed_likes 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
        
        -- Create DELETE policy
        CREATE POLICY "Users can unlike their own" 
        ON public.feed_likes 
        FOR DELETE 
        USING (auth.uid() = user_id);
      `
    },
    {
      name: 'Fix profiles RLS policies',
      sql: `
        -- Enable RLS
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
        DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
        DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
        
        -- Create simple SELECT policy
        CREATE POLICY "Public profiles are viewable by everyone" 
        ON public.profiles 
        FOR SELECT 
        USING (true);
        
        -- Create INSERT policy
        CREATE POLICY "Users can insert their own profile" 
        ON public.profiles 
        FOR INSERT 
        WITH CHECK (auth.uid() = id);
        
        -- Create UPDATE policy
        CREATE POLICY "Users can update own profile" 
        ON public.profiles 
        FOR UPDATE 
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
      `
    },
    {
      name: 'Grant necessary permissions',
      sql: `
        -- Grant usage on schema
        GRANT USAGE ON SCHEMA public TO anon, authenticated;
        
        -- Grant permissions on tables
        GRANT SELECT ON public.feed_posts TO anon, authenticated;
        GRANT ALL ON public.feed_posts TO authenticated;
        
        GRANT SELECT ON public.feed_likes TO anon, authenticated;
        GRANT ALL ON public.feed_likes TO authenticated;
        
        GRANT SELECT ON public.profiles TO anon, authenticated;
        GRANT ALL ON public.profiles TO authenticated;
        
        -- Grant permissions on sequences
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
      `
    }
  ];
  
  for (const fix of fixes) {
    console.log(`📝 Applying: ${fix.name}...`);
    try {
      // Execute the SQL directly
      const { error } = await supabase.rpc('exec_sql', { sql: fix.sql })
        .catch(async () => {
          // Fallback: try to execute via raw query (won't work with service key but worth trying)
          console.log('   Using fallback method...');
          return { error: 'RPC not available - please run SQL manually' };
        });
      
      if (error) {
        console.error(`   ⚠️ Could not apply automatically: ${error}`);
        console.log('   Please run this SQL in Supabase Dashboard:');
        console.log('   ---');
        console.log(fix.sql.split('\n').map(line => '   ' + line).join('\n'));
        console.log('   ---\n');
      } else {
        console.log(`   ✅ Applied successfully`);
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
    }
  }
  
  console.log('\n📊 Verifying fixes...');
  
  // Test queries
  const tests = [
    {
      name: 'Simple feed query',
      query: supabase.from('feed_posts').select('id').limit(1)
    },
    {
      name: 'Feed with profile join',
      query: supabase.from('feed_posts').select('id, profile:profiles!feed_posts_user_id_fkey(username)').limit(1)
    },
    {
      name: 'Feed likes query',
      query: supabase.from('feed_likes').select('id').limit(1)
    }
  ];
  
  for (const test of tests) {
    const { data, error } = await test.query;
    if (error) {
      console.log(`   ❌ ${test.name}: Failed - ${error.message}`);
    } else {
      console.log(`   ✅ ${test.name}: Success`);
    }
  }
  
  console.log('\n✨ Fix process complete!');
  console.log('\n⚠️  IMPORTANT: If the automatic fixes failed, please:');
  console.log('1. Go to Supabase Dashboard > SQL Editor');
  console.log('2. Run the SQL commands shown above');
  console.log('3. Test by logging in and checking if the feed loads');
}

// Run the fix
fixFeedLoadingIssues().catch(console.error);