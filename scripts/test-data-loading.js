#!/usr/bin/env node
import 'dotenv/config';
import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  console.log('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create client with anon key to simulate frontend access
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🧪 TESTING DATA LOADING WITH ANON KEY');
console.log('==================================================\n');

async function testDataLoading() {
  const tests = [
    {
      name: 'Feed Posts',
      query: () => supabase
        .from('feed_posts')
        .select(`
          *,
          profile:profiles!feed_posts_user_id_fkey!left(
            username,
            display_name,
            avatar_url
          )
        `)
        .limit(5)
    },
    {
      name: 'Equipment',
      query: () => supabase
        .from('equipment')
        .select('*')
        .limit(5)
    },
    {
      name: 'User Bags',
      query: () => supabase
        .from('user_bags')
        .select(`
          *,
          profiles!left (
            username,
            display_name,
            avatar_url
          ),
          bag_equipment!left (
            equipment_id,
            equipment:equipment!left (
              brand,
              model,
              category
            )
          )
        `)
        .limit(5)
    },
    {
      name: 'Equipment Photos',
      query: () => supabase
        .from('equipment_photos')
        .select('*')
        .limit(5)
    },
    {
      name: 'Profiles',
      query: () => supabase
        .from('profiles')
        .select('*')
        .limit(5)
    },
    {
      name: 'Feed Likes (Read)',
      query: () => supabase
        .from('feed_likes')
        .select('*')
        .limit(5)
    },
    {
      name: 'User Follows (Read)',
      query: () => supabase
        .from('user_follows')
        .select('*')
        .limit(5)
    }
  ];

  console.log('📊 Testing anonymous read access:');
  console.log('----------------------------------');
  
  for (const test of tests) {
    try {
      const { data, error } = await test.query();
      
      if (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
        if (error.code) console.log(`   Error code: ${error.code}`);
      } else {
        console.log(`✅ ${test.name}: ${data?.length || 0} records loaded`);
      }
    } catch (err) {
      console.log(`❌ ${test.name}: ${err.message}`);
    }
  }

  // Test authenticated operations
  console.log('\n🔐 Testing authenticated operations:');
  console.log('-------------------------------------');
  
  // Try to sign in with test credentials if available
  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;
  
  if (testEmail && testPassword) {
    console.log('Attempting to sign in with test user...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (authError) {
      console.log(`❌ Failed to sign in: ${authError.message}`);
    } else if (authData.user) {
      console.log(`✅ Signed in as: ${authData.user.email}`);
      
      // Test authenticated operations
      const authTests = [
        {
          name: 'Feed Posts with Likes',
          query: () => supabase
            .from('feed_posts')
            .select(`
              *,
              profile:profiles!left(*),
              user_liked:feed_likes!left(id)
            `)
            .eq('user_liked.user_id', authData.user.id)
            .limit(5)
        },
        {
          name: 'My Bags',
          query: () => supabase
            .from('user_bags')
            .select('*')
            .eq('user_id', authData.user.id)
        }
      ];
      
      for (const test of authTests) {
        try {
          const { data, error } = await test.query();
          
          if (error) {
            console.log(`❌ ${test.name}: ${error.message}`);
          } else {
            console.log(`✅ ${test.name}: ${data?.length || 0} records`);
          }
        } catch (err) {
          console.log(`❌ ${test.name}: ${err.message}`);
        }
      }
      
      // Sign out
      await supabase.auth.signOut();
    }
  } else {
    console.log('ℹ️  No test credentials provided (TEST_USER_EMAIL, TEST_USER_PASSWORD)');
  }

  // Test complex joins
  console.log('\n🔗 Testing complex joins:');
  console.log('-------------------------');
  
  try {
    const { data: feedWithJoins, error: feedError } = await supabase
      .from('feed_posts')
      .select(`
        id,
        type,
        created_at,
        likes_count,
        profile:profiles!feed_posts_user_id_fkey!left(
          username,
          display_name,
          avatar_url
        ),
        equipment:equipment!feed_posts_equipment_id_fkey!left(
          brand,
          model,
          category
        ),
        bag:user_bags!feed_posts_bag_id_fkey!left(
          name,
          bag_type
        )
      `)
      .limit(3);
    
    if (feedError) {
      console.log(`❌ Feed with joins: ${feedError.message}`);
    } else {
      console.log(`✅ Feed with joins: ${feedWithJoins?.length || 0} records`);
      if (feedWithJoins && feedWithJoins.length > 0) {
        const hasProfile = feedWithJoins[0].profile !== null;
        const hasEquipment = feedWithJoins.some(p => p.equipment !== null);
        const hasBag = feedWithJoins.some(p => p.bag !== null);
        console.log(`   Profile data: ${hasProfile ? '✅' : '❌'}`);
        console.log(`   Equipment data: ${hasEquipment ? '✅' : '⚠️  No equipment posts'}`);
        console.log(`   Bag data: ${hasBag ? '✅' : '⚠️  No bag posts'}`);
      }
    }
  } catch (err) {
    console.log(`❌ Feed with joins: ${err.message}`);
  }

  console.log('\n✅ DATA LOADING TEST COMPLETE');
  console.log('\n📋 SUMMARY:');
  console.log('- If anonymous reads fail, RLS policies need fixing');
  console.log('- If joins fail but direct queries work, foreign key policies need attention');
  console.log('- If authenticated queries fail, auth context is not being passed correctly');
}

// Run the test
testDataLoading().catch(console.error);