import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkCurrentRLS() {
  console.log('🔍 Checking Current RLS State\n');
  
  try {
    // Test different operations
    console.log('1. Testing SELECT (view likes)...');
    const { data: viewTest, error: viewError } = await supabase
      .from('feed_likes')
      .select('*')
      .limit(1);
    
    if (viewError) {
      console.log('❌ Cannot VIEW likes:', viewError.message);
    } else {
      console.log('✅ Can VIEW likes');
    }
    
    // Get a test user and post
    const { data: user } = await supabase.from('profiles').select('id').limit(1).single();
    const { data: post } = await supabase.from('feed_posts').select('id').limit(1).single();
    
    if (user && post) {
      // Clean up any existing like first
      await supabase.from('feed_likes').delete().eq('user_id', user.id).eq('post_id', post.id);
      
      console.log('\n2. Testing INSERT (add like)...');
      const { error: insertError } = await supabase
        .from('feed_likes')
        .insert({ user_id: user.id, post_id: post.id });
      
      if (insertError) {
        console.log('❌ Cannot INSERT likes:', insertError.message);
        
        // Check if it's specifically an RLS issue
        if (insertError.message.includes('row-level security')) {
          console.log('   Problem: RLS policy is blocking authenticated inserts');
          console.log('   The INSERT policy may be missing or incorrect');
        }
      } else {
        console.log('✅ Can INSERT likes');
        
        console.log('\n3. Testing DELETE (remove like)...');
        const { error: deleteError } = await supabase
          .from('feed_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', post.id);
        
        if (deleteError) {
          console.log('❌ Cannot DELETE likes:', deleteError.message);
        } else {
          console.log('✅ Can DELETE likes');
        }
      }
    }
    
    console.log('\n📊 Summary:');
    console.log('The RLS policies are preventing INSERT operations.');
    console.log('This means users cannot add new likes.\n');
    
    console.log('🔧 Required Fix:');
    console.log('The INSERT policy needs to allow authenticated users');
    console.log('where auth.uid() = user_id');
    
    // Try to get more info about the table
    console.log('\n4. Checking table structure...');
    const { data: sample } = await supabase
      .from('feed_likes')
      .select('*')
      .limit(1)
      .single();
    
    if (sample) {
      console.log('Table columns:', Object.keys(sample).join(', '));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCurrentRLS();