#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Create a client like the app does
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testAppEndpoints() {
  console.log('🧪 Testing app functionality after RLS fix...\n');
  
  let allPassed = true;

  // Test 1: Forum threads (main issue reported)
  console.log('1. FORUM - Fetching threads:');
  try {
    const { data: threads, error } = await supabase
      .from('forum_threads')
      .select(`
        *,
        category:forum_categories!inner(id, name, slug, icon),
        user:profiles!inner(id, username, display_name, avatar_url)
      `)
      .limit(5);
    
    if (error) throw error;
    console.log(`   ✅ SUCCESS: Fetched ${threads?.length || 0} forum threads`);
    if (threads && threads.length > 0) {
      console.log(`      Latest thread: "${threads[0].title}" by ${threads[0].user?.username}`);
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    allPassed = false;
  }

  // Test 2: Feed posts
  console.log('\n2. FEED - Fetching posts:');
  try {
    const { data: posts, error } = await supabase
      .from('feed_posts')
      .select(`
        *,
        user:profiles(id, username, display_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    console.log(`   ✅ SUCCESS: Fetched ${posts?.length || 0} feed posts`);
    if (posts && posts.length > 0) {
      console.log(`      Latest post type: ${posts[0].type} by ${posts[0].user?.username}`);
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    allPassed = false;
  }

  // Test 3: User bags
  console.log('\n3. BAGS - Fetching user bags:');
  try {
    const { data: bags, error } = await supabase
      .from('user_bags')
      .select(`
        *,
        user:profiles(id, username, display_name),
        bag_equipment(
          *,
          equipment(*)
        )
      `)
      .limit(5);
    
    if (error) throw error;
    console.log(`   ✅ SUCCESS: Fetched ${bags?.length || 0} bags`);
    if (bags && bags.length > 0) {
      const totalEquipment = bags.reduce((sum, bag) => sum + (bag.bag_equipment?.length || 0), 0);
      console.log(`      Total equipment across bags: ${totalEquipment} items`);
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    allPassed = false;
  }

  // Test 4: Forum posts with replies
  console.log('\n4. FORUM POSTS - Fetching posts with replies:');
  try {
    const { data: posts, error } = await supabase
      .from('forum_posts')
      .select(`
        *,
        user:profiles(id, username, display_name, avatar_url)
      `)
      .limit(10);
    
    if (error) throw error;
    console.log(`   ✅ SUCCESS: Fetched ${posts?.length || 0} forum posts`);
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    allPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('🎉 PERFECT! All features are working correctly!');
    console.log('\nYour app should now be fully functional:');
    console.log('  ✅ Forum threads loading');
    console.log('  ✅ Feed posts displaying');
    console.log('  ✅ User bags accessible');
    console.log('  ✅ No more infinite recursion errors!');
  } else {
    console.log('⚠️  Some features may still have issues');
  }
}

// Run the tests
testAppEndpoints()
  .then(() => {
    console.log('\n✨ App functionality test complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });