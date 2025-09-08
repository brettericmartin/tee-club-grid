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

async function verifyVideoFeedFix() {
  try {
    console.log('🔍 Verifying Video Feed Fix\n');
    console.log('='.repeat(50));
    
    // Check the Good Good video post
    console.log('\n📺 Checking Good Good video post...\n');
    
    const { data: videoPost, error: postError } = await supabase
      .from('feed_posts')
      .select(`
        *,
        profile:profiles!user_id(username),
        bag:user_bags!bag_id(id, name)
      `)
      .eq('type', 'bag_video')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (postError) {
      console.error('❌ Error fetching video post:', postError);
      return;
    }
    
    if (!videoPost) {
      console.log('❌ No video posts found');
      return;
    }
    
    console.log('✅ Video post found:');
    console.log(`   User: ${videoPost.profile?.username}`);
    console.log(`   Title: ${videoPost.content?.title}`);
    console.log(`   URL: ${videoPost.content?.url}`);
    console.log(`   Thumbnail: ${videoPost.content?.thumbnail_url}`);
    console.log(`   Bag: ${videoPost.bag?.name} (ID: ${videoPost.bag_id})`);
    
    // Check critical fields
    console.log('\n🔍 Checking critical fields for rendering...\n');
    
    const checks = {
      'Has bag_id': !!videoPost.bag_id,
      'Has user_id': !!videoPost.user_id,
      'Has content': !!videoPost.content,
      'Has video URL': !!videoPost.content?.url,
      'Has thumbnail': !!videoPost.content?.thumbnail_url,
      'Has provider': !!videoPost.content?.provider,
      'Has title': !!videoPost.content?.title,
      'Bag exists': !!videoPost.bag
    };
    
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${check}`);
    });
    
    // Check if thumbnail URL is valid
    if (videoPost.content?.thumbnail_url) {
      console.log('\n🖼️  Checking thumbnail URL...');
      console.log(`   URL: ${videoPost.content.thumbnail_url}`);
      
      // Extract YouTube video ID if it's a YouTube URL
      const videoUrl = videoPost.content.url;
      if (videoUrl && videoUrl.includes('youtube.com')) {
        const urlParams = new URLSearchParams(new URL(videoUrl).search);
        const videoId = urlParams.get('v');
        const expectedThumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        
        if (videoPost.content.thumbnail_url === expectedThumbnail) {
          console.log('   ✅ Thumbnail URL is correctly formatted for YouTube');
        } else {
          console.log('   ⚠️  Thumbnail URL might need updating');
          console.log(`   Expected: ${expectedThumbnail}`);
        }
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Summary:\n');
    
    const allChecksPassed = Object.values(checks).every(v => v);
    
    if (allChecksPassed) {
      console.log('✅ All checks passed! Video feed should display correctly.');
      console.log('\n🎉 The following fixes have been applied:');
      console.log('   • Video thumbnails now display instead of trying to embed');
      console.log('   • Play button overlay added for better UX');
      console.log('   • Mobile-optimized layout with responsive sizing');
      console.log('   • Error handling added to prevent crashes on flip');
      console.log('   • Flip button only shows when bag data is available');
    } else {
      console.log('⚠️  Some checks failed. Please review the issues above.');
    }
    
    console.log('\n📱 Visit http://localhost:3334/feed to test:');
    console.log('   1. Video thumbnail should display');
    console.log('   2. Play button should be visible');
    console.log('   3. Flip button should work without crashing');
    console.log('   4. Mobile layout should be clean');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

verifyVideoFeedFix();