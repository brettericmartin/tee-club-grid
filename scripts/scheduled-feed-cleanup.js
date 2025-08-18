import './supabase-admin.js';
import { supabase } from './supabase-admin.js';

/**
 * Scheduled cleanup script for feed posts without pictures
 * Run this daily/weekly via cron job or GitHub Actions
 */
async function scheduledFeedCleanup() {
  console.log('🧹 Starting scheduled feed cleanup...');
  console.log('Time:', new Date().toISOString());
  console.log('');

  try {
    // Get posts without pictures that are older than 24 hours
    // (giving users time to add photos after creating posts)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    console.log('1️⃣ Finding posts without pictures older than 24 hours...');
    
    // Get ALL posts to check both media_urls and content.photo_url
    const { data: allOldPosts, error: fetchError } = await supabase
      .from('feed_posts')
      .select('id, type, created_at, user_id, content, media_urls')
      .lt('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('Error fetching posts:', fetchError);
      return;
    }
    
    // Filter to only posts that have NO pictures anywhere
    const postsToDelete = allOldPosts.filter(post => {
      const hasMediaUrls = post.media_urls && post.media_urls.length > 0;
      const hasContentPhoto = post.content?.photo_url || (post.content?.photos && post.content.photos.length > 0);
      return !hasMediaUrls && !hasContentPhoto;
    });

    if (!postsToDelete || postsToDelete.length === 0) {
      console.log('✅ No posts to clean up. Feed is clean!');
      return;
    }

    console.log(`Found ${postsToDelete.length} posts without pictures to remove`);

    // Group by type for reporting
    const byType = {};
    postsToDelete.forEach(post => {
      byType[post.type] = (byType[post.type] || 0) + 1;
    });

    console.log('\n📊 Breakdown by type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count} posts`);
    });

    // Delete the posts
    console.log('\n2️⃣ Deleting posts...');
    
    const postIds = postsToDelete.map(p => p.id);
    const { error: deleteError } = await supabase
      .from('feed_posts')
      .delete()
      .in('id', postIds);

    if (deleteError) {
      console.error('Error deleting posts:', deleteError);
      return;
    }

    console.log(`✅ Successfully deleted ${postsToDelete.length} posts without pictures`);

    // Log cleanup for monitoring
    console.log('\n📝 Cleanup Summary:');
    console.log(`  - Date: ${new Date().toISOString()}`);
    console.log(`  - Posts removed: ${postsToDelete.length}`);
    console.log(`  - Oldest removed: ${postsToDelete[postsToDelete.length - 1]?.created_at}`);
    console.log(`  - Newest removed: ${postsToDelete[0]?.created_at}`);

    // Optional: Save cleanup log to database
    try {
      await supabase
        .from('system_logs')
        .insert({
          action: 'feed_cleanup',
          details: {
            posts_removed: postsToDelete.length,
            breakdown: byType
          },
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      // Logging table might not exist, that's okay
      console.log('(Log table not available)');
    }

  } catch (err) {
    console.error('Unexpected error during cleanup:', err);
    process.exit(1);
  }

  console.log('\n✨ Scheduled cleanup complete!');
}

// Run the cleanup
scheduledFeedCleanup();