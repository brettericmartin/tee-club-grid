import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testForumEquipmentFeature() {
  console.log('Testing forum equipment tagging feature...\n');

  try {
    // 1. Check if forum_equipment_tags table exists
    console.log('1. Checking forum_equipment_tags table...');
    const { data: tables, error: tableError } = await supabase
      .from('forum_equipment_tags')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Table check failed:', tableError.message);
    } else {
      console.log('✅ forum_equipment_tags table exists');
    }

    // 2. Get some sample equipment
    console.log('\n2. Getting sample equipment...');
    const { data: equipment, error: equipError } = await supabase
      .from('equipment')
      .select('id, brand, model')
      .limit(5);
    
    if (equipError) {
      console.error('❌ Equipment fetch failed:', equipError.message);
    } else {
      console.log(`✅ Found ${equipment.length} equipment items`);
      equipment.forEach(e => console.log(`   - ${e.brand} ${e.model} (${e.id})`));
    }

    // 3. Check forum threads with equipment tags
    console.log('\n3. Checking forum threads with equipment tags...');
    // Since we don't have a direct relation, we'll check both tables separately
    const { data: tags, error: tagError } = await supabase
      .from('forum_equipment_tags')
      .select('post_id, equipment_id')
      .limit(10);
    
    if (tagError) {
      console.error('❌ Equipment tags fetch failed:', tagError.message);
    } else {
      console.log(`✅ Found ${tags?.length || 0} equipment tags`);
    }

    // 4. Test creating a forum post with equipment tags
    console.log('\n4. Testing equipment tagging in a new post...');
    
    // First, get a test user
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (!users || users.length === 0) {
      console.log('⚠️  No users found for testing');
      return;
    }

    // Get a test category
    const { data: categories } = await supabase
      .from('forum_categories')
      .select('id')
      .limit(1);
    
    if (!categories || categories.length === 0) {
      console.log('⚠️  No categories found for testing');
      return;
    }

    // Create a test thread
    const testTitle = 'Test: Equipment Forum Integration';
    const { data: thread, error: threadError } = await supabase
      .from('forum_threads')
      .insert({
        title: testTitle,
        slug: testTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category_id: categories[0].id,
        user_id: users[0].id,
        tee_count: 0
      })
      .select()
      .single();
    
    if (threadError) {
      console.error('❌ Thread creation failed:', threadError.message);
      return;
    }

    // Create a test post
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .insert({
        thread_id: thread.id,
        content: 'Testing equipment tagging feature',
        user_id: users[0].id
      })
      .select()
      .single();
    
    if (postError) {
      console.error('❌ Post creation failed:', postError.message);
      // Clean up thread
      await supabase.from('forum_threads').delete().eq('id', thread.id);
      return;
    }

    // Tag some equipment to the post
    if (equipment && equipment.length > 0) {
      const { error: tagError } = await supabase
        .from('forum_equipment_tags')
        .insert([
          { post_id: post.id, equipment_id: equipment[0].id },
          { post_id: post.id, equipment_id: equipment[1].id }
        ]);
      
      if (tagError) {
        console.error('❌ Equipment tagging failed:', tagError.message);
      } else {
        console.log('✅ Successfully tagged equipment to post');
      }
    }

    // Clean up test data
    console.log('\n5. Cleaning up test data...');
    await supabase.from('forum_threads').delete().eq('id', thread.id);
    console.log('✅ Test data cleaned up');

    console.log('\n✨ Forum equipment feature test complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testForumEquipmentFeature();