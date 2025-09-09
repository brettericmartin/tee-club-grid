#!/usr/bin/env node
import { supabase as adminSupabase } from './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

async function testFollowUnfollow() {
  console.log('🔍 Testing Follow/Unfollow Functionality\n');
  
  try {
    // Get two test users
    const { data: users, error: usersError } = await adminSupabase
      .from('profiles')
      .select('id, username')
      .limit(2);
    
    if (usersError || !users || users.length < 2) {
      console.log('❌ Need at least 2 users to test. Error:', usersError);
      return;
    }
    
    const [user1, user2] = users;
    console.log(`Test users: ${user1.username} (${user1.id}) and ${user2.username} (${user2.id})\n`);
    
    // Check current follow status
    console.log('1️⃣ Checking initial follow status...');
    const { data: initialFollow, error: checkError } = await adminSupabase
      .from('user_follows')
      .select('*')
      .eq('follower_id', user1.id)
      .eq('following_id', user2.id)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.log('Error checking:', checkError);
    }
    
    console.log('Initial status:', initialFollow ? 'Following' : 'Not following');
    
    // Clean up any existing follow
    if (initialFollow) {
      console.log('\n2️⃣ Cleaning up existing follow...');
      const { error: cleanupError } = await adminSupabase
        .from('user_follows')
        .delete()
        .eq('id', initialFollow.id);
      
      if (cleanupError) {
        console.log('❌ Cleanup error:', cleanupError);
      } else {
        console.log('✅ Cleaned up existing follow');
      }
    }
    
    // Test FOLLOW
    console.log('\n3️⃣ Testing FOLLOW operation...');
    const { data: followData, error: followError } = await adminSupabase
      .from('user_follows')
      .insert({
        follower_id: user1.id,
        following_id: user2.id
      })
      .select();
    
    if (followError) {
      console.log('❌ Follow error:', followError);
    } else {
      console.log('✅ Follow successful:', followData);
    }
    
    // Verify follow was created
    const { data: verifyFollow, error: verifyError } = await adminSupabase
      .from('user_follows')
      .select('*')
      .eq('follower_id', user1.id)
      .eq('following_id', user2.id)
      .single();
    
    if (verifyError) {
      console.log('❌ Verify error:', verifyError);
    } else {
      console.log('✅ Follow verified:', verifyFollow);
    }
    
    // Test UNFOLLOW
    console.log('\n4️⃣ Testing UNFOLLOW operation...');
    if (verifyFollow) {
      const { error: unfollowError } = await adminSupabase
        .from('user_follows')
        .delete()
        .eq('id', verifyFollow.id);
      
      if (unfollowError) {
        console.log('❌ Unfollow error:', unfollowError);
      } else {
        console.log('✅ Unfollow successful');
      }
      
      // Verify unfollow
      const { data: verifyUnfollow, error: verifyUnfollowError } = await adminSupabase
        .from('user_follows')
        .select('*')
        .eq('follower_id', user1.id)
        .eq('following_id', user2.id)
        .single();
      
      if (verifyUnfollowError && verifyUnfollowError.code === 'PGRST116') {
        console.log('✅ Unfollow verified: No record found');
      } else if (verifyUnfollowError) {
        console.log('❌ Verify unfollow error:', verifyUnfollowError);
      } else {
        console.log('❌ Record still exists after unfollow:', verifyUnfollow);
      }
    }
    
    // Check RLS policies
    console.log('\n5️⃣ Checking RLS Policies...');
    const { data: policies, error: policiesError } = await adminSupabase
      .rpc('get_policies_for_table', { table_name: 'user_follows' });
    
    if (policiesError) {
      console.log('Error getting policies:', policiesError);
    } else {
      console.log('\nCurrent RLS policies for user_follows:');
      policies?.forEach(p => {
        console.log(`  - ${p.policyname}: ${p.cmd} (${p.permissive ? 'PERMISSIVE' : 'RESTRICTIVE'})`);
      });
    }
    
    // Test with user context (anon key) - only if we have anon key
    if (supabase) {
      console.log('\n6️⃣ Testing with user context (anon key)...');
      console.log('⚠️ Skipping user context test - would need real credentials');
    } else {
      console.log('\n6️⃣ Anon key not available, skipping user context test');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testFollowUnfollow();