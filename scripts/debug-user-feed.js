import './supabase-admin.mjs';

async function debugUserFeed() {
  try {
    // Get the first user with posts
    const { data: users } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(5);
    
    console.log('Users found:', users?.length || 0);
    
    for (const user of users || []) {
      console.log(`\n\n=== Checking feed for user: ${user.username} (${user.id}) ===`);
      
      // Get all posts by this user
      const { data: allPosts, error: allError } = await supabase
        .from('feed_posts')
        .select('id, type, created_at, equipment_id, media_urls')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (allError) {
        console.error('Error fetching posts:', allError);
        continue;
      }
      
      console.log(`Total posts: ${allPosts?.length || 0}`);
      
      // Show equipment_photo posts specifically
      const equipmentPhotoPosts = allPosts?.filter(p => p.type === 'equipment_photo') || [];
      console.log(`Equipment photo posts: ${equipmentPhotoPosts.length}`);
      
      if (equipmentPhotoPosts.length > 0) {
        console.log('Equipment photo posts details:');
        equipmentPhotoPosts.forEach(post => {
          console.log(`  - ID: ${post.id}`);
          console.log(`    Created: ${post.created_at}`);
          console.log(`    Equipment ID: ${post.equipment_id}`);
          console.log(`    Media URLs: ${post.media_urls?.length || 0} photos`);
        });
      }
      
      // Test the same query used in getUserFeedPosts
      const { data: feedPosts, error: feedError } = await supabase
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
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (feedError) {
        console.error('Error with joined query:', feedError);
      } else {
        console.log(`Joined query returned: ${feedPosts?.length || 0} posts`);
      }
    }
    
    // Check if equipment_id column exists
    console.log('\n\n=== Checking feed_posts table structure ===');
    const { data: columns, error: colError } = await supabase.rpc('get_table_columns', {
      table_name: 'feed_posts'
    }).single();
    
    if (colError) {
      console.log('Could not fetch table structure (this is normal if the RPC doesn\'t exist)');
      
      // Try a different approach - insert a test row and see what happens
      const testUserId = users?.[0]?.id;
      if (testUserId) {
        const { error: insertError } = await supabase
          .from('feed_posts')
          .insert({
            user_id: testUserId,
            type: 'test',
            content: { test: true },
            equipment_id: null // This will fail if column doesn't exist
          });
        
        if (insertError) {
          if (insertError.message.includes('equipment_id')) {
            console.error('ERROR: equipment_id column does not exist!');
            console.log('You need to run the migration: sql/add-equipment-id-to-feed-posts.sql');
          } else {
            console.log('Insert test error:', insertError.message);
          }
        } else {
          console.log('Test insert succeeded - equipment_id column exists');
          // Clean up test post
          await supabase
            .from('feed_posts')
            .delete()
            .eq('type', 'test')
            .eq('user_id', testUserId);
        }
      }
    } else {
      console.log('Table columns:', columns);
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugUserFeed();