import './supabase-admin.js';
import { supabase } from './supabase-admin.js';

async function cleanupPicturelessPosts() {
  console.log('🔍 Checking for feed posts without pictures...\n');

  try {
    // First, let's see what we're dealing with
    console.log('1️⃣ Analyzing feed posts...');
    
    const { data: allPosts, error: fetchError } = await supabase
      .from('feed_posts')
      .select('id, type, created_at, user_id, media_urls, content')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching posts:', fetchError);
      return;
    }

    console.log(`Total posts in database: ${allPosts.length}`);

    // Categorize posts - check BOTH media_urls and content.photo_url
    const postsWithPictures = allPosts.filter(post => {
      const hasMediaUrls = post.media_urls && post.media_urls.length > 0;
      const hasContentPhoto = post.content?.photo_url || (post.content?.photos && post.content.photos.length > 0);
      return hasMediaUrls || hasContentPhoto;
    });
    
    const postsWithoutPictures = allPosts.filter(post => {
      const hasMediaUrls = post.media_urls && post.media_urls.length > 0;
      const hasContentPhoto = post.content?.photo_url || (post.content?.photos && post.content.photos.length > 0);
      return !hasMediaUrls && !hasContentPhoto;
    });

    console.log(`Posts WITH pictures: ${postsWithPictures.length}`);
    console.log(`Posts WITHOUT pictures: ${postsWithoutPictures.length}`);

    // Break down posts without pictures by type
    const typeBreakdown = {};
    postsWithoutPictures.forEach(post => {
      typeBreakdown[post.type] = (typeBreakdown[post.type] || 0) + 1;
    });

    console.log('\n📊 Posts without pictures by type:');
    Object.entries(typeBreakdown).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count} posts`);
    });

    // Show some examples
    console.log('\n📝 Sample posts without pictures:');
    postsWithoutPictures.slice(0, 5).forEach(post => {
      const caption = post.content?.caption || 'No caption';
      console.log(`  - Type: ${post.type}, Created: ${new Date(post.created_at).toLocaleDateString()}`);
      console.log(`    Caption: ${caption.substring(0, 50)}...`);
    });

    // Ask for confirmation before deletion
    console.log('\n⚠️  WARNING: This will permanently delete posts without pictures!');
    console.log(`This will affect ${postsWithoutPictures.length} posts.`);
    console.log('\nTo proceed with deletion, run:');
    console.log('node scripts/cleanup-pictureless-posts.js --confirm-delete\n');

    // Check if user passed --confirm-delete flag
    if (process.argv.includes('--confirm-delete')) {
      console.log('🗑️  Deletion confirmed. Removing posts without pictures...');
      
      // Delete in batches to avoid timeout
      const batchSize = 100;
      let deleted = 0;
      
      for (let i = 0; i < postsWithoutPictures.length; i += batchSize) {
        const batch = postsWithoutPictures.slice(i, i + batchSize);
        const ids = batch.map(p => p.id);
        
        const { error: deleteError } = await supabase
          .from('feed_posts')
          .delete()
          .in('id', ids);
        
        if (deleteError) {
          console.error('Error deleting batch:', deleteError);
        } else {
          deleted += batch.length;
          console.log(`Deleted ${deleted}/${postsWithoutPictures.length} posts...`);
        }
      }
      
      console.log('✅ Cleanup complete!');
      console.log(`Removed ${deleted} posts without pictures.`);
    } else {
      console.log('💡 Tip: Some post types might be valuable even without pictures:');
      console.log('   - new_bag: User created a new bag');
      console.log('   - bag_update: User updated their bag');
      console.log('   - Consider keeping these for user history');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

cleanupPicturelessPosts();