import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testTeeSystem() {
  console.log('🏌️ Testing Complete Tee System\n');
  console.log('Platform Language: "Tees" not "Likes" (per CLAUDE.md)\n');

  try {
    // 1. Test feed_likes (feed post tees)
    console.log('1. Testing Feed Post Tees...');
    const { data: posts } = await supabase
      .from('feed_posts')
      .select('id, likes_count')
      .limit(1);

    if (posts && posts[0]) {
      const testPost = posts[0];
      console.log(`   Test post: ${testPost.id}`);
      console.log(`   Current tees: ${testPost.likes_count || 0}`);

      // Check if we can query likes
      const { data: likes, error: likesError } = await supabase
        .from('feed_likes')
        .select('*')
        .eq('post_id', testPost.id);

      if (likesError) {
        console.log('   ❌ Cannot query feed_likes:', likesError.message);
      } else {
        console.log(`   ✅ Can query feed_likes (${likes?.length || 0} tees)`);
      }
    }

    // 2. Test bag_tees
    console.log('\n2. Testing Bag Tees...');
    const { data: bags } = await supabase
      .from('user_bags')
      .select('id, name, likes_count')
      .limit(1);

    if (bags && bags[0]) {
      const testBag = bags[0];
      console.log(`   Test bag: ${testBag.name} (${testBag.id})`);
      console.log(`   Current tees: ${testBag.likes_count || 0}`);

      // Check if bag_tees table exists
      const { error: bagTeesError } = await supabase
        .from('bag_tees')
        .select('*')
        .eq('bag_id', testBag.id)
        .limit(1);

      if (bagTeesError) {
        if (bagTeesError.code === '42P01') {
          console.log('   ❌ bag_tees table does not exist');
          console.log('   ⚠️ Run the SQL script to create it');
        } else {
          console.log('   ⚠️ bag_tees query error:', bagTeesError.message);
        }
      } else {
        console.log('   ✅ bag_tees table exists and is queryable');
      }
    }

    // 3. Test equipment_tees
    console.log('\n3. Testing Equipment Tees...');
    const { data: equipment } = await supabase
      .from('equipment')
      .select('id, brand, model')
      .limit(1);

    if (equipment && equipment[0]) {
      const testEquipment = equipment[0];
      console.log(`   Test equipment: ${testEquipment.brand} ${testEquipment.model}`);

      // Check if equipment_tees table exists
      const { error: equipTeesError } = await supabase
        .from('equipment_tees')
        .select('*')
        .eq('equipment_id', testEquipment.id)
        .limit(1);

      if (equipTeesError) {
        if (equipTeesError.code === '42P01') {
          console.log('   ❌ equipment_tees table does not exist');
          console.log('   ⚠️ Run the SQL script to create it');
        } else {
          console.log('   ⚠️ equipment_tees query error:', equipTeesError.message);
        }
      } else {
        console.log('   ✅ equipment_tees table exists and is queryable');
      }
    }

    // 4. Test RLS permissions
    console.log('\n4. Testing RLS Permissions...');
    
    // Get a test user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (profile && posts && posts[0]) {
      // Try to simulate a tee action
      console.log('   Testing feed_likes insert/delete...');
      
      // First, remove any existing like
      await supabase
        .from('feed_likes')
        .delete()
        .eq('user_id', profile.id)
        .eq('post_id', posts[0].id);

      // Try to insert
      const { error: insertError } = await supabase
        .from('feed_likes')
        .insert({
          user_id: profile.id,
          post_id: posts[0].id
        });

      if (insertError) {
        if (insertError.message.includes('violates row-level security policy')) {
          console.log('   ❌ RLS blocking inserts - needs fix');
          console.log('   ⚠️ Run the SQL script to fix RLS policies');
        } else {
          console.log('   ❌ Insert error:', insertError.message);
        }
      } else {
        console.log('   ✅ Can insert tees');

        // Clean up
        await supabase
          .from('feed_likes')
          .delete()
          .eq('user_id', profile.id)
          .eq('post_id', posts[0].id);
      }
    }

    // 5. Summary
    console.log('\n📊 SYSTEM STATUS SUMMARY:');
    console.log('================================');
    
    const { error: feedError } = await supabase.from('feed_likes').select('*').limit(1);
    const { error: bagError } = await supabase.from('bag_tees').select('*').limit(1);
    const { error: equipError } = await supabase.from('equipment_tees').select('*').limit(1);

    console.log('feed_likes table:', feedError ? '❌ Issues' : '✅ Working');
    console.log('bag_tees table:', bagError?.code === '42P01' ? '❌ Missing' : bagError ? '⚠️ Has issues' : '✅ Working');
    console.log('equipment_tees table:', equipError?.code === '42P01' ? '❌ Missing' : equipError ? '⚠️ Has issues' : '✅ Working');

    if (bagError?.code === '42P01' || equipError?.code === '42P01') {
      console.log('\n🚨 ACTION REQUIRED:');
      console.log('1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Run the SQL script: sql/fix-tee-system-final.sql');
      console.log('3. This will create missing tables and fix RLS policies');
    } else {
      console.log('\n✅ All tee tables exist!');
      console.log('If tees are not saving, run the SQL script to fix RLS policies.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testTeeSystem();