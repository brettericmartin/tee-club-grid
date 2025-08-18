#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testRLSStatus() {
  console.log('🔍 Testing RLS Status for Critical Tables...\n');

  try {
    // Test basic connectivity
    console.log('1. Testing basic connectivity...');
    const { data: testData, error: testError } = await supabase
      .from('feed_posts')
      .select('id')
      .limit(1);

    if (testError) {
      console.log('❌ Basic connectivity failed:', testError.message);
      return;
    } else {
      console.log('✅ Database connection working');
    }

    // Test feed_likes table access
    console.log('\n2. Testing feed_likes table...');
    const { data: feedLikes, error: feedLikesError } = await supabase
      .from('feed_likes')
      .select('id, user_id, post_id')
      .limit(5);

    if (feedLikesError) {
      console.log('❌ feed_likes access error:', feedLikesError.message);
    } else {
      console.log(`✅ feed_likes accessible - ${feedLikes?.length || 0} records found`);
    }

    // Test user_follows table access
    console.log('\n3. Testing user_follows table...');
    const { data: userFollows, error: userFollowsError } = await supabase
      .from('user_follows')
      .select('follower_id, following_id')
      .limit(5);

    if (userFollowsError) {
      console.log('❌ user_follows access error:', userFollowsError.message);
    } else {
      console.log(`✅ user_follows accessible - ${userFollows?.length || 0} records found`);
    }

    // Test if we can access RLS information
    console.log('\n4. Testing RLS policy information...');
    
    // Try using information_schema instead
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['feed_likes', 'user_follows']);

    if (!tableError && tableInfo) {
      console.log('✅ Table information accessible:');
      tableInfo.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
    } else {
      console.log('⚠️ Cannot access table information schema');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }

  console.log('\n📋 SUMMARY:');
  console.log('- Use the SQL provided in apply-rls-manual.js');
  console.log('- Execute it in Supabase Dashboard > SQL Editor');
  console.log('- This will enable proper RLS protection for critical tables');
  console.log('- After execution, users will only be able to modify their own likes/follows');
}

testRLSStatus().catch(console.error);