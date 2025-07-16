import './supabase-admin.mjs';

async function debugFeedIssue() {
  try {
    console.log('=== DEBUGGING FEED ISSUE ===\n');
    
    // 1. Check if columns exist
    console.log('1. Checking feed_posts table structure...');
    const { data: testInsert, error: testError } = await supabase
      .from('feed_posts')
      .select('id, user_id, type, equipment_id, media_urls, created_at')
      .limit(1);
    
    if (testError) {
      console.error('ERROR accessing feed_posts:', testError);
      return;
    }
    
    console.log('✓ Table structure looks good\n');
    
    // 2. Check feed post types
    console.log('2. Checking feed post types...');
    const { data: types, error: typesError } = await supabase
      .from('feed_posts')
      .select('type')
      .limit(100);
    
    if (types) {
      const uniqueTypes = [...new Set(types.map(t => t.type))];
      console.log('Found post types:', uniqueTypes);
      console.log(`equipment_photo posts exist: ${uniqueTypes.includes('equipment_photo') ? 'YES' : 'NO'}\n`);
    }
    
    // 3. Check specific user's posts
    console.log('3. Checking user posts...');
    const { data: users } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(2);
    
    for (const user of users || []) {
      console.log(`\nUser: ${user.username} (${user.id})`);
      
      // Direct query - exactly what getUserFeedPosts does
      const { data: posts, error: postsError } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (postsError) {
        console.error('Error fetching posts:', postsError);
        continue;
      }
      
      console.log(`Total posts: ${posts?.length || 0}`);
      
      // Count by type
      const postsByType = {};
      posts?.forEach(post => {
        postsByType[post.type] = (postsByType[post.type] || 0) + 1;
      });
      
      Object.entries(postsByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
      
      // Show recent equipment_photo posts
      const recentEquipmentPhotos = posts?.filter(p => p.type === 'equipment_photo').slice(0, 3);
      if (recentEquipmentPhotos?.length > 0) {
        console.log('\nRecent equipment_photo posts:');
        recentEquipmentPhotos.forEach(post => {
          console.log(`  - Created: ${post.created_at}`);
          console.log(`    Equipment ID: ${post.equipment_id}`);
          console.log(`    Media URLs: ${post.media_urls?.length || 0} photos`);
        });
      }
    }
    
    // 4. Check foreign key constraints
    console.log('\n\n4. Checking foreign key references...');
    const { data: samplePost } = await supabase
      .from('feed_posts')
      .select(`
        id,
        type,
        user_id,
        equipment_id,
        profile:profiles!feed_posts_user_id_fkey(username),
        equipment:equipment(brand, model)
      `)
      .eq('type', 'equipment_photo')
      .limit(1)
      .single();
    
    if (samplePost) {
      console.log('Sample equipment_photo post with joins:');
      console.log(JSON.stringify(samplePost, null, 2));
    } else {
      console.log('No equipment_photo posts found to test joins');
    }
    
    // 5. Test creating a post
    console.log('\n\n5. Testing post creation...');
    const testUser = users?.[0];
    if (testUser) {
      const { data: newPost, error: createError } = await supabase
        .from('feed_posts')
        .insert({
          user_id: testUser.id,
          type: 'equipment_photo',
          content: { test: true, message: 'Debug test post' },
          media_urls: ['https://example.com/test.jpg']
        })
        .select()
        .single();
      
      if (createError) {
        console.error('ERROR creating test post:', createError);
      } else {
        console.log('✓ Successfully created test post:', newPost.id);
        
        // Clean up
        await supabase
          .from('feed_posts')
          .delete()
          .eq('id', newPost.id);
        console.log('✓ Cleaned up test post');
      }
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugFeedIssue();