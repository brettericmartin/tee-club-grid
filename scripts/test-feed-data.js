import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFeedData() {
  console.log('🔍 Testing feed data retrieval...\n');
  
  // Test the exact query from feedService
  const selectQuery = `
    *,
    profile:profiles!feed_posts_user_id_fkey(
      username,
      display_name,
      avatar_url
    )
  `;
  
  console.log('Running query with select:', selectQuery);
  
  const { data, error } = await supabase
    .from('feed_posts')
    .select(selectQuery)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('❌ Query failed:', error);
    return;
  }
  
  console.log('✅ Query successful!');
  console.log('Returned', data?.length || 0, 'posts\n');
  
  if (data && data.length > 0) {
    console.log('Sample post structure:');
    const samplePost = data[0];
    console.log({
      id: samplePost.id,
      type: samplePost.type,
      user_id: samplePost.user_id,
      created_at: samplePost.created_at,
      hasProfile: !!samplePost.profile,
      profileData: samplePost.profile,
      content: samplePost.content ? Object.keys(samplePost.content) : null,
      media_urls: samplePost.media_urls?.length || 0,
      likes_count: samplePost.likes_count
    });
    
    // Check if all posts have profiles
    const postsWithoutProfiles = data.filter(p => !p.profile);
    if (postsWithoutProfiles.length > 0) {
      console.log('\n⚠️ Posts without profiles:', postsWithoutProfiles.length);
      console.log('User IDs without profiles:', postsWithoutProfiles.map(p => p.user_id));
    } else {
      console.log('\n✅ All posts have profile data');
    }
  }
  
  // Now test transformation
  console.log('\n🔄 Testing transformation...');
  
  // Import the transformer
  const { transformFeedPost } = await import('../src/utils/feedTransformer.js');
  
  if (data && data.length > 0) {
    try {
      const transformed = transformFeedPost({ ...data[0], isFollowed: false });
      console.log('\n✅ Transformation successful!');
      console.log('Transformed post:', {
        postId: transformed.postId,
        postType: transformed.postType,
        userName: transformed.userName,
        userAvatar: transformed.userAvatar,
        hasMediaUrls: !!transformed.mediaUrls,
        mediaUrlCount: transformed.mediaUrls?.length || 0
      });
    } catch (err) {
      console.error('❌ Transformation failed:', err);
    }
  }
}

testFeedData().catch(console.error);