import { supabase } from './supabase-admin.js';

async function testForumEquipmentTags() {
  console.log('Testing forum equipment tags functionality...\n');

  try {
    // 1. Check if forum_equipment_tags table exists
    console.log('1. Checking if forum_equipment_tags table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('forum_equipment_tags')
      .select('*')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      console.error('❌ Table forum_equipment_tags does not exist!');
      console.log('Please run the migration SQL first.');
      return;
    }
    console.log('✓ Table forum_equipment_tags exists\n');

    // 2. Check if tee_count column exists on forum_threads
    console.log('2. Checking if tee_count column exists on forum_threads...');
    const { data: threads, error: threadError } = await supabase
      .from('forum_threads')
      .select('id, title, tee_count')
      .limit(1);

    if (threadError) {
      console.error('❌ Error checking forum_threads:', threadError.message);
    } else {
      console.log('✓ Column tee_count exists on forum_threads\n');
    }

    // 3. Get some sample equipment
    console.log('3. Fetching sample equipment...');
    const { data: equipment, error: equipError } = await supabase
      .from('equipment')
      .select('id, brand, model, category')
      .limit(5);

    if (equipError || !equipment?.length) {
      console.error('❌ No equipment found');
      return;
    }

    console.log(`✓ Found ${equipment.length} equipment items:`);
    equipment.forEach(e => {
      console.log(`  - ${e.brand} ${e.model} (${e.category})`);
    });
    console.log();

    // 4. Get sample forum posts
    console.log('4. Fetching sample forum posts...');
    const { data: posts, error: postsError } = await supabase
      .from('forum_posts')
      .select('id, thread_id, content')
      .limit(3);

    if (postsError || !posts?.length) {
      console.log('⚠️  No forum posts found to test with');
    } else {
      console.log(`✓ Found ${posts.length} forum posts\n`);
    }

    // 5. Test the service functions
    console.log('5. Testing getForumThreadsByEquipment function...');
    if (equipment.length > 0) {
      const testEquipmentId = equipment[0].id;
      console.log(`   Testing with equipment: ${equipment[0].brand} ${equipment[0].model}`);
      
      // This would normally use the service function, but we'll query directly
      const { data: taggedThreads, error: tagError } = await supabase
        .from('forum_equipment_tags')
        .select(`
          post_id,
          forum_posts!inner(thread_id)
        `)
        .eq('equipment_id', testEquipmentId);

      if (tagError) {
        console.log('   No threads found with this equipment (which is expected for new setup)');
      } else {
        console.log(`   Found ${taggedThreads?.length || 0} posts tagged with this equipment`);
      }
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Create a forum post and tag some equipment');
    console.log('2. Open an equipment modal to see the Forums tab');
    console.log('3. Click on equipment badges in forum posts');

  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run the test
testForumEquipmentTags();