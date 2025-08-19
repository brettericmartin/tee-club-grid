#!/usr/bin/env node

/**
 * Test feed loading with authentication
 * Tests the issue where feed items don't load when logged in
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFeedLoading() {
  console.log('🔍 Testing feed loading with different auth states...\n');

  // Test 1: Anonymous query (no auth)
  console.log('1️⃣ Testing anonymous feed query...');
  try {
    const { data: anonPosts, error: anonError } = await supabase
      .from('feed_posts')
      .select(`
        *,
        profile:profiles!feed_posts_user_id_fkey!left(
          username,
          display_name,
          avatar_url,
          handicap,
          title
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (anonError) {
      console.error('❌ Anonymous query failed:', anonError);
    } else {
      console.log(`✅ Anonymous query successful: ${anonPosts?.length || 0} posts loaded`);
      if (anonPosts && anonPosts.length > 0) {
        console.log('   Sample post ID:', anonPosts[0].id);
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error in anonymous query:', error);
  }

  // Test 2: Login and test authenticated query
  console.log('\n2️⃣ Testing authenticated feed query...');
  
  // Use test credentials (you'll need to update these)
  const testEmail = 'test@example.com'; // Update with a test account
  const testPassword = 'testpassword123'; // Update with test password
  
  console.log('   Attempting login...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (authError) {
    console.log('⚠️  Could not login with test account:', authError.message);
    console.log('   Skipping authenticated tests. Please update test credentials.');
  } else {
    console.log('✅ Logged in as:', authData.user.email);
    
    // Test authenticated query
    try {
      const { data: authPosts, error: authPostsError } = await supabase
        .from('feed_posts')
        .select(`
          *,
          profile:profiles!feed_posts_user_id_fkey!left(
            username,
            display_name,
            avatar_url,
            handicap,
            title
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (authPostsError) {
        console.error('❌ Authenticated query failed:', authPostsError);
        console.error('   Error details:', JSON.stringify(authPostsError, null, 2));
      } else {
        console.log(`✅ Authenticated query successful: ${authPosts?.length || 0} posts loaded`);
      }
    } catch (error) {
      console.error('❌ Unexpected error in authenticated query:', error);
    }

    // Test 3: Check if we can fetch user likes
    console.log('\n3️⃣ Testing user likes query...');
    try {
      const { data: likes, error: likesError } = await supabase
        .from('feed_likes')
        .select('*')
        .eq('user_id', authData.user.id)
        .limit(5);

      if (likesError) {
        console.error('❌ Likes query failed:', likesError);
      } else {
        console.log(`✅ Likes query successful: ${likes?.length || 0} likes found`);
      }
    } catch (error) {
      console.error('❌ Unexpected error in likes query:', error);
    }

    // Sign out
    await supabase.auth.signOut();
    console.log('\n✅ Signed out');
  }

  // Test 4: Verify RLS policies
  console.log('\n4️⃣ Checking RLS policies...');
  try {
    const { data: policies, error: policyError } = await supabase
      .rpc('get_policies_for_table', { table_name: 'feed_posts' })
      .single();

    if (policyError) {
      console.log('⚠️  Could not fetch RLS policies (function may not exist)');
    } else {
      console.log('✅ RLS policies fetched successfully');
    }
  } catch (error) {
    // This is expected if the function doesn't exist
    console.log('ℹ️  RLS policy check skipped (custom function not available)');
  }

  console.log('\n✨ Feed loading test complete!');
}

// Run the test
testFeedLoading().catch(console.error);