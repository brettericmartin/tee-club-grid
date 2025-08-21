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

async function testClientQueries() {
  console.log('🧪 Testing client-side queries (with RLS)...\n');

  // Test 1: Simple profiles query
  console.log('1. Testing profiles table:');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
  
  if (profilesError) {
    console.log('   ❌ Error:', profilesError.message);
  } else {
    console.log('   ✅ Success:', profiles?.length || 0, 'rows');
  }

  // Test 2: Forum threads without join
  console.log('\n2. Testing forum_threads (no join):');
  const { data: threads1, error: threads1Error } = await supabase
    .from('forum_threads')
    .select('*')
    .limit(1);
  
  if (threads1Error) {
    console.log('   ❌ Error:', threads1Error.message);
  } else {
    console.log('   ✅ Success:', threads1?.length || 0, 'rows');
  }

  // Test 3: Forum threads with profiles join (this likely causes the issue)
  console.log('\n3. Testing forum_threads with profiles join:');
  const { data: threads2, error: threads2Error } = await supabase
    .from('forum_threads')
    .select(`
      *,
      user:profiles!inner(id, username, display_name, avatar_url)
    `)
    .limit(1);
  
  if (threads2Error) {
    console.log('   ❌ Error:', threads2Error.message);
  } else {
    console.log('   ✅ Success:', threads2?.length || 0, 'rows');
  }

  // Test 4: Feed posts with profiles join
  console.log('\n4. Testing feed_posts with profiles join:');
  const { data: feed, error: feedError } = await supabase
    .from('feed_posts')
    .select(`
      *,
      user:profiles(id, username, display_name, avatar_url)
    `)
    .limit(1);
  
  if (feedError) {
    console.log('   ❌ Error:', feedError.message);
  } else {
    console.log('   ✅ Success:', feed?.length || 0, 'rows');
  }

  // Test 5: User bags
  console.log('\n5. Testing user_bags:');
  const { data: bags, error: bagsError } = await supabase
    .from('user_bags')
    .select('*')
    .limit(1);
  
  if (bagsError) {
    console.log('   ❌ Error:', bagsError.message);
  } else {
    console.log('   ✅ Success:', bags?.length || 0, 'rows');
  }

  console.log('\n🔍 Diagnosis:');
  console.log('If the joined queries fail but simple queries work,');
  console.log('the issue is likely in the RLS policies referencing each other.');
  console.log('The solution is to simplify the RLS policies to avoid circular references.');
}

// Run the tests
testClientQueries()
  .then(() => {
    console.log('\n✨ Client query tests complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });