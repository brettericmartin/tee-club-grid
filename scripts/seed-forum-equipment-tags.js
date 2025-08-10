import { supabase } from './supabase-admin.js';

async function seedForumEquipmentTags() {
  console.log('Creating test forum post with equipment tags...\n');

  try {
    // 1. Get a test user
    console.log('1. Getting test user...');
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(1);

    if (userError || !users?.length) {
      console.error('❌ No users found. Please create a user first.');
      return;
    }
    const testUser = users[0];
    console.log(`✓ Using user: ${testUser.username}\n`);

    // 2. Get some equipment to tag
    console.log('2. Getting equipment to tag...');
    const { data: equipment, error: equipError } = await supabase
      .from('equipment')
      .select('id, brand, model, category')
      .in('category', ['driver', 'putter', 'iron'])
      .limit(3);

    if (equipError || !equipment?.length) {
      console.error('❌ No suitable equipment found');
      return;
    }
    console.log('✓ Found equipment:');
    equipment.forEach(e => console.log(`  - ${e.brand} ${e.model}`));
    console.log();

    // 3. Get or create a forum thread
    console.log('3. Finding forum thread...');
    let thread;
    
    // First try to find an existing thread
    const { data: existingThreads } = await supabase
      .from('forum_threads')
      .select('*')
      .limit(1);

    if (existingThreads?.length > 0) {
      thread = existingThreads[0];
      console.log(`✓ Using existing thread: "${thread.title}"\n`);
    } else {
      // Create a new thread if none exist
      console.log('Creating new forum thread...');
      
      // Get a category
      const { data: categories } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('slug', 'equipment-discussions')
        .single();

      if (!categories) {
        console.error('❌ No forum categories found');
        return;
      }

      const { data: newThread, error: threadError } = await supabase
        .from('forum_threads')
        .insert({
          category_id: categories.id,
          user_id: testUser.id,
          title: 'Best equipment for beginners - need advice!',
          slug: 'best-equipment-for-beginners',
          view_count: 42,
          reply_count: 0,
          is_pinned: false,
          is_locked: false
        })
        .select()
        .single();

      if (threadError) {
        console.error('❌ Error creating thread:', threadError);
        return;
      }
      thread = newThread;
      console.log(`✓ Created thread: "${thread.title}"\n`);
    }

    // 4. Create a forum post with equipment mentions
    console.log('4. Creating forum post...');
    const postContent = `I've been playing for about 6 months and looking to upgrade my equipment. 

Currently considering the ${equipment[0].brand} ${equipment[0].model} as my new ${equipment[0].category}. 
Has anyone tried it? 

Also looking at the ${equipment[1]?.brand} ${equipment[1]?.model} - heard great things about it.

What do you all think? Any other recommendations?`;

    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .insert({
        thread_id: thread.id,
        user_id: testUser.id,
        content: postContent,
        is_edited: false
      })
      .select()
      .single();

    if (postError) {
      console.error('❌ Error creating post:', postError);
      return;
    }
    console.log('✓ Created forum post\n');

    // 5. Tag the equipment in the post
    console.log('5. Tagging equipment in the post...');
    const tags = equipment.slice(0, 2).map(e => ({
      post_id: post.id,
      equipment_id: e.id
    }));

    const { error: tagError } = await supabase
      .from('forum_equipment_tags')
      .insert(tags);

    if (tagError) {
      console.error('❌ Error tagging equipment:', tagError);
      return;
    }
    console.log(`✓ Tagged ${tags.length} pieces of equipment\n`);

    // 6. Update thread reply count
    await supabase
      .from('forum_threads')
      .update({ 
        reply_count: (thread.reply_count || 0) + 1,
        last_post_at: new Date().toISOString(),
        last_post_by: testUser.id
      })
      .eq('id', thread.id);

    console.log('✅ Successfully created test data!');
    console.log('\nYou can now:');
    console.log('1. Go to the forum and see the post with equipment tags');
    console.log('2. Click on the equipment badges to open the equipment modal');
    console.log('3. In the equipment modal, check the Forums tab to see this discussion');
    console.log(`\nDirect link to thread: http://localhost:3333/forum/${thread.category?.slug || 'equipment-discussions'}/${thread.id}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the seeder
seedForumEquipmentTags();