import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugFeedPosts() {
  console.log('\n🔍 Debugging Feed Posts\n');
  console.log('======================\n');

  try {
    // 1. Check all feed posts
    console.log('1. All feed posts in database:\n');
    
    const { data: allPosts, error } = await supabase
      .from('feed_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching posts:', error);
      return;
    }

    if (!allPosts || allPosts.length === 0) {
      console.log('No feed posts found in database!');
    } else {
      console.log(`Found ${allPosts.length} posts:\n`);
      allPosts.forEach(post => {
        console.log(`ID: ${post.id}`);
        console.log(`Type: ${post.type}`);
        console.log(`User ID: ${post.user_id}`);
        console.log(`Created: ${post.created_at}`);
        console.log(`Content:`, typeof post.content === 'string' ? post.content : JSON.stringify(post.content, null, 2));
        console.log(`Media URLs:`, post.media_urls);
        console.log(`Equipment ID:`, post.equipment_id);
        console.log('---\n');
      });
    }

    // 2. Check the content column type
    console.log('2. Checking content column type:\n');
    
    const { data: columnInfo } = await supabase
      .rpc('get_column_info', {
        table_name: 'feed_posts',
        column_name: 'content'
      })
      .single();

    if (columnInfo) {
      console.log('Content column type:', columnInfo);
    }

    // 3. Try the same query the feed uses
    console.log('\n3. Testing feed query with joins:\n');
    
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
        equipment (
          id,
          brand,
          model,
          category
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (feedError) {
      console.error('Feed query error:', feedError);
      console.log('\nThis might be the issue - the join query is failing!');
    } else if (feedData) {
      console.log(`Feed query returned ${feedData.length} posts`);
      if (feedData.length > 0) {
        console.log('First post from feed query:', JSON.stringify(feedData[0], null, 2));
      }
    }

    // 4. Check if the profile relationship works
    console.log('\n4. Checking profile relationship:\n');
    
    if (allPosts && allPosts.length > 0) {
      const userId = allPosts[0].user_id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profile) {
        console.log('Profile found for user:', profile.username || profile.id);
      } else {
        console.log('No profile found for user ID:', userId);
        console.log('This could cause the feed query to fail!');
      }
    }

    console.log('\n======================\n');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Add RPC function helper if it doesn't exist
async function createColumnInfoFunction() {
  const sql = `
    CREATE OR REPLACE FUNCTION get_column_info(table_name text, column_name text)
    RETURNS json AS $$
    BEGIN
      RETURN (
        SELECT json_build_object(
          'data_type', data_type,
          'udt_name', udt_name
        )
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND information_schema.columns.table_name = get_column_info.table_name
        AND information_schema.columns.column_name = get_column_info.column_name
      );
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  console.log('Note: If column info fails, create this function in Supabase SQL editor:', sql);
}

debugFeedPosts().catch(console.error);