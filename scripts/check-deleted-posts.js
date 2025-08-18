import './supabase-admin.js';
import { supabase } from './supabase-admin.js';

async function checkDeletedPosts() {
  console.log('🔍 Investigating post deletion issue...\n');

  try {
    // Get all current posts
    const { data: currentPosts, error } = await supabase
      .from('feed_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      return;
    }

    console.log(`Current posts in database: ${currentPosts.length}`);

    // Analyze posts by their media content
    let hasMediaUrls = 0;
    let hasPhotoInContent = 0;
    let hasNoPhotos = 0;
    let problematicPosts = [];

    currentPosts.forEach(post => {
      const hasMedia = post.media_urls && post.media_urls.length > 0;
      const hasContentPhoto = post.content?.photo_url || post.content?.photos?.length > 0;
      
      if (hasMedia) {
        hasMediaUrls++;
      }
      
      if (hasContentPhoto && !hasMedia) {
        hasPhotoInContent++;
        problematicPosts.push({
          id: post.id,
          type: post.type,
          created: new Date(post.created_at).toLocaleDateString(),
          media_urls: post.media_urls,
          content_photos: post.content?.photos || [],
          content_photo_url: post.content?.photo_url
        });
      }
      
      if (!hasMedia && !hasContentPhoto) {
        hasNoPhotos++;
      }
    });

    console.log('\n📊 Post Analysis:');
    console.log(`- Posts with media_urls: ${hasMediaUrls}`);
    console.log(`- Posts with photos in content but not media_urls: ${hasPhotoInContent}`);
    console.log(`- Posts with no photos at all: ${hasNoPhotos}`);

    if (problematicPosts.length > 0) {
      console.log('\n⚠️  Found posts with photos in content but empty media_urls:');
      console.log('These posts might have been incorrectly identified as having no pictures!');
      problematicPosts.slice(0, 5).forEach(post => {
        console.log(`\n  Post ID: ${post.id}`);
        console.log(`  Type: ${post.type}`);
        console.log(`  Created: ${post.created}`);
        console.log(`  media_urls: ${JSON.stringify(post.media_urls)}`);
        console.log(`  content.photo_url: ${post.content_photo_url}`);
        console.log(`  content.photos: ${JSON.stringify(post.content_photos)}`);
      });
    }

    // Check for equipment_photo type posts without media_urls
    const equipmentPhotoPosts = currentPosts.filter(p => p.type === 'equipment_photo');
    console.log(`\n📷 Equipment photo posts: ${equipmentPhotoPosts.length}`);
    
    const equipmentPhotoWithoutMedia = equipmentPhotoPosts.filter(p => 
      !p.media_urls || p.media_urls.length === 0
    );
    
    if (equipmentPhotoWithoutMedia.length > 0) {
      console.log(`⚠️  ${equipmentPhotoWithoutMedia.length} equipment_photo posts have no media_urls!`);
      console.log('These should ALWAYS have media_urls if they have photos.');
    }

    // Get posts from last 24 hours to see what might have been deleted
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentPosts = currentPosts.filter(p => 
      new Date(p.created_at) > yesterday
    );
    
    console.log(`\n📅 Posts from last 24 hours: ${recentPosts.length}`);
    
    // Group by type
    const byType = {};
    currentPosts.forEach(post => {
      byType[post.type] = (byType[post.type] || 0) + 1;
    });
    
    console.log('\n📊 Current posts by type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });

  } catch (err) {
    console.error('Error:', err);
  }
}

checkDeletedPosts();