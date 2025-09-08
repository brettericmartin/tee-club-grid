import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updateGoodGoodChannel() {
  try {
    console.log('🎥 Updating Good Good Video Channel Name\n');
    console.log('='.repeat(50));
    
    // Update the feed post to include channel name
    const { data: feedPost, error: feedError } = await supabase
      .from('feed_posts')
      .select('*')
      .eq('type', 'bag_video')
      .single();
    
    if (feedError) {
      console.error('Error fetching video post:', feedError);
      return;
    }
    
    if (feedPost) {
      console.log('Found video post:', feedPost.content?.title);
      
      // Update content to include channel_name
      const updatedContent = {
        ...feedPost.content,
        channel_name: 'Good Good'
      };
      
      const { error: updateError } = await supabase
        .from('feed_posts')
        .update({ content: updatedContent })
        .eq('id', feedPost.id);
      
      if (updateError) {
        console.error('Error updating feed post:', updateError);
      } else {
        console.log('✅ Updated feed post with channel name: Good Good');
      }
    }
    
    // Also update the user_bag_videos table
    const { data: bagVideo, error: bagError } = await supabase
      .from('user_bag_videos')
      .select('*')
      .eq('provider', 'youtube')
      .single();
    
    if (bagError) {
      console.error('Error fetching bag video:', bagError);
    } else if (bagVideo) {
      console.log('\nFound bag video:', bagVideo.title);
      
      const { error: updateBagError } = await supabase
        .from('user_bag_videos')
        .update({ channel_name: 'Good Good' })
        .eq('id', bagVideo.id);
      
      if (updateBagError) {
        console.error('Error updating bag video:', updateBagError);
      } else {
        console.log('✅ Updated bag video with channel name: Good Good');
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n✅ Channel name has been added to the Good Good video');
    console.log('   The feed should now show "Good Good" instead of "YouTube Video"');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

updateGoodGoodChannel();