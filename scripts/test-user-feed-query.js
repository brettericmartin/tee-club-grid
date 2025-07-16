import './supabase-admin.mjs';
import { transformFeedPost } from '../src/utils/feedTransformer.js';

async function testUserFeedQuery() {
  const userId = '38c167c1-d10a-406d-9b9d-c86292739ccd'; // brettmartinplay
  
  console.log('Testing feed query for user:', userId);
  
  try {
    // Test the exact query from getUserFeedPosts
    const { data, error, count } = await supabase
      .from('feed_posts')
      .select(`
        *,
        profile:profiles!feed_posts_user_id_fkey(
          username,
          avatar_url,
          handicap
        ),
        equipment:equipment(
          id,
          brand,
          model,
          category,
          image_url
        ),
        bag:user_bags(
          id,
          name,
          description,
          background
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('Query error:', error);
      return;
    }
    
    console.log(`Query returned ${data?.length || 0} posts, total count: ${count}`);
    
    if (data && data.length > 0) {
      console.log('\nFirst post raw data:');
      console.log(JSON.stringify(data[0], null, 2));
      
      // Try to transform the first post
      console.log('\nTrying to transform first post...');
      try {
        const transformed = transformFeedPost({ ...data[0], isFollowed: false });
        console.log('Transformed successfully:');
        console.log(JSON.stringify(transformed, null, 2));
      } catch (transformError) {
        console.error('Transform error:', transformError);
      }
    }
  } catch (err) {
    console.error('Test error:', err);
  }
}

testUserFeedQuery();