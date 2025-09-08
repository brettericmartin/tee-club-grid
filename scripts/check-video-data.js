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

async function checkVideoData() {
  try {
    console.log('🎥 Checking Video Feed Posts\n');
    console.log('='.repeat(50));
    
    // Get video feed posts
    const { data: videoPosts, error } = await supabase
      .from('feed_posts')
      .select('*')
      .eq('type', 'bag_video')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('Error fetching video posts:', error);
      return;
    }
    
    console.log(`Found ${videoPosts?.length || 0} video posts\n`);
    
    videoPosts?.forEach((post, index) => {
      console.log(`\n📹 Video Post ${index + 1}:`);
      console.log('-'.repeat(40));
      
      const content = post.content || {};
      
      console.log('Title:', content.title || 'No title');
      console.log('URL:', content.url || 'No URL');
      console.log('Provider:', content.provider || 'Unknown');
      console.log('Video ID:', content.video_provider_id || content.video_id || 'No ID');
      console.log('Thumbnail:', content.thumbnail_url ? 'Yes' : 'No');
      console.log('Channel Name:', content.channel_name || 'Not stored');
      console.log('Notes:', content.notes || 'None');
      
      // Check if title contains channel info
      if (content.title) {
        console.log('\n🔍 Analyzing title for channel info:');
        console.log(`   "${content.title}"`);
        
        // Try to extract channel from common patterns
        const patterns = [
          { regex: / - (.+)$/, desc: 'Title - Channel' },
          { regex: / by (.+)$/i, desc: 'Title by Channel' },
          { regex: / \| (.+)$/, desc: 'Title | Channel' },
          { regex: / from (.+)$/i, desc: 'Title from Channel' },
        ];
        
        let foundChannel = false;
        for (const pattern of patterns) {
          const match = content.title.match(pattern.regex);
          if (match) {
            console.log(`   ✅ Found pattern "${pattern.desc}": ${match[1]}`);
            foundChannel = true;
            break;
          }
        }
        
        if (!foundChannel) {
          console.log('   ❌ No channel pattern found in title');
        }
      }
    });
    
    // Check user_bag_videos table too
    console.log('\n\n🎬 Checking User Bag Videos Table:');
    console.log('='.repeat(50));
    
    const { data: bagVideos, error: bagError } = await supabase
      .from('user_bag_videos')
      .select('*')
      .limit(5);
    
    if (bagError) {
      console.error('Error fetching bag videos:', bagError);
    } else {
      console.log(`Found ${bagVideos?.length || 0} bag videos\n`);
      
      bagVideos?.forEach((video, index) => {
        console.log(`\nBag Video ${index + 1}:`);
        console.log('Title:', video.title || 'No title');
        console.log('Channel Name:', video.channel_name || 'Not stored');
        console.log('Provider:', video.provider);
        console.log('URL:', video.url);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n💡 Suggestions:');
    console.log('1. Channel names are not being stored in the database');
    console.log('2. Titles often don\'t contain channel information');
    console.log('3. We need to fetch channel info from YouTube API or scraping');
    console.log('4. Or allow users to manually enter channel name when adding videos');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkVideoData();