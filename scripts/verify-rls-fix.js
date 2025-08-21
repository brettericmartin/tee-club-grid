#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Create a client like the app does (not using service role)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verifyRLSFix() {
  console.log('🧪 Verifying RLS fixes are working...\n');
  
  let allPassed = true;

  // Test 1: Profiles table
  console.log('1. Testing profiles table:');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
  
  if (profilesError) {
    console.log('   ❌ FAILED:', profilesError.message);
    allPassed = false;
  } else {
    console.log('   ✅ PASSED: Can read profiles');
  }

  // Test 2: Forum threads with profiles join (the problematic query)
  console.log('\n2. Testing forum_threads with profiles join:');
  const { data: threads, error: threadsError } = await supabase
    .from('forum_threads')
    .select(`
      *,
      category:forum_categories!inner(id, name, slug, icon),
      user:profiles!inner(id, username, display_name, avatar_url)
    `)
    .limit(1);
  
  if (threadsError) {
    console.log('   ❌ FAILED:', threadsError.message);
    allPassed = false;
  } else {
    console.log('   ✅ PASSED: Can fetch forum threads with user data');
  }

  // Test 3: Feed posts with profiles join
  console.log('\n3. Testing feed_posts with profiles join:');
  const { data: feed, error: feedError } = await supabase
    .from('feed_posts')
    .select(`
      *,
      user:profiles(id, username, display_name, avatar_url)
    `)
    .limit(1);
  
  if (feedError) {
    console.log('   ❌ FAILED:', feedError.message);
    allPassed = false;
  } else {
    console.log('   ✅ PASSED: Can fetch feed posts with user data');
  }

  // Test 4: User bags with equipment
  console.log('\n4. Testing user_bags with equipment:');
  const { data: bags, error: bagsError } = await supabase
    .from('user_bags')
    .select(`
      *,
      bag_equipment(
        *,
        equipment(*)
      )
    `)
    .limit(1);
  
  if (bagsError) {
    console.log('   ❌ FAILED:', bagsError.message);
    allPassed = false;
  } else {
    console.log('   ✅ PASSED: Can fetch bags with equipment');
  }

  // Test 5: Forum posts
  console.log('\n5. Testing forum_posts:');
  const { data: posts, error: postsError } = await supabase
    .from('forum_posts')
    .select(`
      *,
      user:profiles!forum_posts_user_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .limit(1);
  
  if (postsError) {
    console.log('   ❌ FAILED:', postsError.message);
    allPassed = false;
  } else {
    console.log('   ✅ PASSED: Can fetch forum posts with user data');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✨ ALL TESTS PASSED! The RLS issues are fixed!');
    console.log('\n🎉 Your forum, feed, and bags should now be working!');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('\n🔧 Please run the SQL scripts in this order:');
    console.log('1. First run: scripts/simple-rls-fix.sql');
    console.log('2. Then run: scripts/proper-rls-policies.sql');
    console.log('\nRun these in your Supabase SQL Editor.');
  }
}

// Run the verification
verifyRLSFix()
  .then(() => {
    console.log('\n✨ Verification complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });