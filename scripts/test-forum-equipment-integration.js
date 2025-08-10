import { supabase } from './supabase-admin.js';

async function testIntegration() {
  console.log('Testing Forum-Equipment Integration...\n');

  try {
    // 1. Find equipment with forum tags
    console.log('1. Finding equipment with forum discussions...');
    const { data: taggedEquipment, error: tagError } = await supabase
      .from('forum_equipment_tags')
      .select(`
        equipment_id,
        equipment:equipment!forum_equipment_tags_equipment_id_fkey (
          id,
          brand,
          model
        )
      `)
      .limit(1);

    if (tagError || !taggedEquipment?.length) {
      console.log('No tagged equipment found yet.');
      return;
    }

    const equipment = taggedEquipment[0].equipment;
    console.log(`✓ Found equipment: ${equipment.brand} ${equipment.model}\n`);

    // 2. Test forum threads query
    console.log('2. Testing forum threads query...');
    
    // Get thread IDs that have posts with this equipment
    const { data: taggedPosts } = await supabase
      .from('forum_equipment_tags')
      .select('post_id')
      .eq('equipment_id', equipment.id);
    
    if (!taggedPosts?.length) {
      console.log('No posts found with this equipment');
      return;
    }
    
    // Get thread IDs from posts
    const { data: posts } = await supabase
      .from('forum_posts')
      .select('thread_id')
      .in('id', taggedPosts.map(t => t.post_id));
    
    const threadIds = [...new Set(posts.map(p => p.thread_id))];
    
    // Get threads with details
    const { data: threads, error } = await supabase
      .from('forum_threads')
      .select(`
        *,
        category:forum_categories!forum_threads_category_id_fkey (
          id,
          name,
          slug,
          icon
        ),
        user:profiles!forum_threads_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .in('id', threadIds)
      .order('tee_count', { ascending: false });
    
    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log(`✓ Found ${threads.length} forum threads mentioning this equipment`);
    
    if (threads.length > 0) {
      console.log('\nThread details:');
      threads.forEach(thread => {
        console.log(`- "${thread.title}" in ${thread.category.name}`);
        console.log(`  Tees: ${thread.tee_count || 0}, Replies: ${thread.reply_count || 0}`);
      });
    }

    // 3. Check equipment tags in posts
    console.log('\n3. Checking equipment tags in posts...');
    const { data: postsWithTags } = await supabase
      .from('forum_equipment_tags')
      .select(`
        post_id,
        forum_posts!inner (
          id,
          content,
          thread_id
        ),
        equipment!inner (
          brand,
          model
        )
      `)
      .limit(5);

    console.log(`✓ Found ${postsWithTags?.length || 0} posts with equipment tags`);
    
    console.log('\n✅ Integration test complete!');
    console.log('\nTo see it in action:');
    console.log('1. Open http://localhost:3333/forum');
    console.log('2. Find a post with equipment tags (green badges)');
    console.log('3. Click an equipment badge to open the modal');
    console.log('4. Check the Forums tab in the equipment modal');

  } catch (error) {
    console.error('Test error:', error);
  }
}

testIntegration();