import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugFeedComplete() {
  console.log('\n🔍 Complete Feed Debug\n');
  console.log('=====================\n');

  try {
    // 1. Check raw feed_posts table
    console.log('1. Raw feed_posts table:\n');
    
    const { data: rawPosts, error: rawError } = await supabase
      .from('feed_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (rawError) {
      console.error('Error fetching raw posts:', rawError);
    } else {
      console.log(`Found ${rawPosts?.length || 0} posts in feed_posts table`);
      rawPosts?.forEach(post => {
        console.log('\nPost:', {
          id: post.id,
          type: post.type,
          user_id: post.user_id,
          created_at: post.created_at,
          content_type: typeof post.content,
          content: post.content
        });
      });
    }

    // 2. Test the exact query from feedServiceEnhanced
    console.log('\n\n2. Testing feed service query:\n');
    
    const { data: feedData, error: feedError } = await supabase
      .from('feed_posts')
      .select(`
        *,
        profiles!user_id (
          id,
          username,
          display_name,
          avatar_url,
          handicap
        ),
        user_bags (
          *,
          bag_equipment (
            *,
            equipment (*)
          )
        ),
        equipment (
          id,
          brand,
          model,
          category
        ),
        feed_likes (
          user_id
        ),
        parent_post:parent_post_id (
          *,
          user_bags (*)
        )
      `)
      .order('created_at', { ascending: false });

    if (feedError) {
      console.error('Feed query error:', feedError);
      console.log('\nThis is likely the issue - the complex join is failing!');
      
      // Try simpler queries to isolate the issue
      console.log('\n3. Testing simpler queries:\n');
      
      // Test profiles join
      const { data: withProfiles, error: profileError } = await supabase
        .from('feed_posts')
        .select(`
          *,
          profiles!user_id (*)
        `);
      
      if (profileError) {
        console.error('Profile join failed:', profileError);
        console.log('The issue is with the profiles relationship!');
      } else {
        console.log('✅ Profile join works');
      }
      
      // Test user_bags join
      const { data: withBags, error: bagError } = await supabase
        .from('feed_posts')
        .select(`
          *,
          user_bags (*)
        `);
      
      if (bagError) {
        console.error('User bags join failed:', bagError);
      } else {
        console.log('✅ User bags join works');
      }
      
    } else {
      console.log(`✅ Feed query returned ${feedData?.length || 0} posts`);
      if (feedData && feedData.length > 0) {
        console.log('\nFirst post structure:', JSON.stringify(feedData[0], null, 2));
      }
    }

    // 4. Check if photo uploads are creating posts
    console.log('\n\n4. Testing photo upload post creation:\n');
    
    // Get the most recent user
    const { data: recentUser } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();
    
    if (recentUser) {
      // Try creating a test post like the unified upload dialog would
      const testPost = {
        user_id: recentUser.id,
        type: 'new_equipment',
        content: {
          photo_url: 'https://example.com/test.jpg',
          caption: 'Test photo post',
          is_photo: true
        }
      };
      
      console.log('Attempting to create test post:', testPost);
      
      const { data: created, error: createError } = await supabase
        .from('feed_posts')
        .insert(testPost)
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Failed to create test post:', createError);
        console.log('\nThis might be due to:');
        console.log('- Type constraint (need to run SQL migration)');
        console.log('- Content column type issue');
        console.log('- Row Level Security policies');
      } else {
        console.log('✅ Test post created successfully:', created.id);
        
        // Clean up
        await supabase
          .from('feed_posts')
          .delete()
          .eq('id', created.id);
      }
    }

    console.log('\n=====================\n');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

debugFeedComplete().catch(console.error);