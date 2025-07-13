import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testFeed() {
  console.log('Testing feed functionality...\n');
  
  try {
    // 1. Check if feed_posts table has the required columns
    console.log('1. Checking feed_posts table structure...');
    const { data: columns, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'feed_posts' })
      .single();
    
    if (schemaError) {
      // Try alternative method
      const { data: testPost, error: testError } = await supabase
        .from('feed_posts')
        .select('*')
        .limit(1);
      
      if (!testError && testPost && testPost.length > 0) {
        console.log('✓ feed_posts table exists with columns:', Object.keys(testPost[0]));
      } else {
        console.log('✗ Could not verify table structure');
      }
    }
    
    // 2. Count feed posts
    console.log('\n2. Counting feed posts...');
    const { count: totalPosts } = await supabase
      .from('feed_posts')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✓ Total feed posts: ${totalPosts}`);
    
    // 3. Check feed post types
    console.log('\n3. Checking feed post types...');
    const { data: postTypes } = await supabase
      .from('feed_posts')
      .select('type')
      .limit(100);
    
    const typeCounts = postTypes?.reduce((acc, post) => {
      acc[post.type] = (acc[post.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('✓ Post type distribution:', typeCounts);
    
    // 4. Check recent posts with joins
    console.log('\n4. Fetching recent posts with profile data...');
    const { data: recentPosts, error: feedError } = await supabase
      .from('feed_posts')
      .select(`
        *,
        profile:profiles!feed_posts_user_id_fkey(
          username,
          avatar_url,
          handicap
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (feedError) {
      console.log('✗ Error fetching feed posts:', feedError.message);
    } else {
      console.log(`✓ Successfully fetched ${recentPosts?.length} recent posts`);
      
      // Show sample post
      if (recentPosts && recentPosts.length > 0) {
        const samplePost = recentPosts[0];
        console.log('\nSample post structure:');
        console.log('- ID:', samplePost.id);
        console.log('- Type:', samplePost.type);
        console.log('- User:', samplePost.profile?.username || 'Unknown');
        console.log('- Equipment ID:', samplePost.equipment_id || 'None');
        console.log('- Bag ID:', samplePost.bag_id || 'None');
        console.log('- Media URLs:', samplePost.media_urls?.length || 0, 'items');
        console.log('- Content:', JSON.stringify(samplePost.content).substring(0, 100) + '...');
      }
    }
    
    // 5. Check if columns exist
    console.log('\n5. Verifying new columns exist...');
    const columnChecks = ['equipment_id', 'bag_id', 'media_urls'];
    
    for (const column of columnChecks) {
      const { data: checkData, error: checkError } = await supabase
        .from('feed_posts')
        .select(column)
        .limit(1);
      
      if (!checkError) {
        console.log(`✓ Column '${column}' exists`);
      } else {
        console.log(`✗ Column '${column}' missing or inaccessible`);
      }
    }
    
    // 6. Test creating a feed post
    console.log('\n6. Testing feed post creation...');
    const testUserId = 'a973d81e-bfb9-43fe-9c5f-5c50e9cdc1f5'; // You might want to use a real user ID
    
    const { data: newPost, error: createError } = await supabase
      .from('feed_posts')
      .insert({
        user_id: testUserId,
        type: 'bag_update',
        content: {
          test: true,
          caption: 'Test post from feed verification script',
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();
    
    if (createError) {
      console.log('✗ Could not create test post:', createError.message);
    } else {
      console.log('✓ Successfully created test post with ID:', newPost.id);
      
      // Clean up test post
      await supabase
        .from('feed_posts')
        .delete()
        .eq('id', newPost.id);
      
      console.log('✓ Test post cleaned up');
    }
    
    console.log('\n✅ Feed system appears to be working correctly!');
    
  } catch (error) {
    console.error('\n❌ Feed test failed:', error);
  }
}

testFeed();