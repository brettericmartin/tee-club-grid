#!/usr/bin/env node

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
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create a client to test as a regular user
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFeedLikes() {
  console.log('🧪 Testing feed_likes functionality...\n');

  try {
    // 1. Test selecting likes (should work for anyone)
    console.log('1️⃣ Testing SELECT...');
    const { data: likes, error: selectError } = await supabase
      .from('feed_likes')
      .select('*')
      .limit(5);
      
    if (selectError) {
      console.error('❌ SELECT failed:', selectError.message);
      console.error('Details:', selectError);
    } else {
      console.log(`✅ SELECT works - found ${likes?.length || 0} likes`);
    }
    
    // 2. Get current user
    console.log('\n2️⃣ Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('⚠️  No authenticated user - INSERT/DELETE tests will be skipped');
      console.log('Please sign in to test write operations');
      return;
    }
    
    console.log(`✅ Authenticated as: ${user.email} (${user.id.substring(0, 8)}...)`);
    
    // 3. Get a test post
    console.log('\n3️⃣ Finding a test post...');
    const { data: posts, error: postError } = await supabase
      .from('feed_posts')
      .select('id')
      .limit(1)
      .single();
      
    if (postError || !posts) {
      console.error('❌ Could not find a test post');
      return;
    }
    
    const testPostId = posts.id;
    console.log(`✅ Using test post: ${testPostId.substring(0, 8)}...`);
    
    // 4. Check if already liked
    console.log('\n4️⃣ Checking existing like...');
    const { data: existingLike, error: checkError } = await supabase
      .from('feed_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', testPostId)
      .maybeSingle();
      
    if (checkError) {
      console.error('❌ Check failed:', checkError.message);
      return;
    }
    
    console.log(`Existing like: ${existingLike ? 'YES' : 'NO'}`);
    
    // 5. Test INSERT or DELETE based on current state
    if (existingLike) {
      console.log('\n5️⃣ Testing DELETE (unlike)...');
      const { error: deleteError } = await supabase
        .from('feed_likes')
        .delete()
        .eq('id', existingLike.id);
        
      if (deleteError) {
        console.error('❌ DELETE failed:', deleteError.message);
        console.error('Details:', deleteError);
      } else {
        console.log('✅ DELETE successful - post unliked');
      }
    } else {
      console.log('\n5️⃣ Testing INSERT (like)...');
      const { error: insertError } = await supabase
        .from('feed_likes')
        .insert({
          user_id: user.id,
          post_id: testPostId
        });
        
      if (insertError) {
        console.error('❌ INSERT failed:', insertError.message);
        console.error('Details:', insertError);
      } else {
        console.log('✅ INSERT successful - post liked');
      }
    }
    
    // 6. Verify the change
    console.log('\n6️⃣ Verifying the change...');
    const { data: finalCheck, error: finalError } = await supabase
      .from('feed_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', testPostId)
      .maybeSingle();
      
    if (finalError) {
      console.error('❌ Final check failed:', finalError.message);
    } else {
      console.log(`✅ Final state: ${finalCheck ? 'LIKED' : 'NOT LIKED'}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

console.log('📋 IMPORTANT: This test uses the client-side Supabase client.');
console.log('If RLS policies are not set up correctly, operations may fail.\n');

testFeedLikes()
  .then(() => {
    console.log('\n✨ Test complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });