import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testAllReactions() {
  console.log('🏌️ Testing All Reaction Systems\n');
  
  const results = {
    feedLikes: false,
    forumReactions: false,
    bagTees: false,
    equipmentTees: false
  };

  try {
    // Get test user
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (!user) {
      console.log('❌ No test user found');
      return;
    }

    console.log(`Using test user: ${user.id.substring(0, 8)}...\n`);

    // 1. Test feed_likes
    console.log('1. Testing feed_likes (Feed Post Tees)...');
    const { data: post } = await supabase
      .from('feed_posts')
      .select('id')
      .limit(1)
      .single();

    if (post) {
      await supabase.from('feed_likes').delete().eq('user_id', user.id).eq('post_id', post.id);
      
      const { error: likeError } = await supabase
        .from('feed_likes')
        .insert({ user_id: user.id, post_id: post.id });

      if (likeError) {
        console.log('   ❌ Cannot add feed likes:', likeError.message);
      } else {
        console.log('   ✅ Feed likes working!');
        results.feedLikes = true;
        await supabase.from('feed_likes').delete().eq('user_id', user.id).eq('post_id', post.id);
      }
    }

    // 2. Test forum_reactions
    console.log('\n2. Testing forum_reactions (Forum Reactions)...');
    const { data: forumPost } = await supabase
      .from('forum_posts')
      .select('id')
      .limit(1)
      .single();

    if (forumPost) {
      await supabase.from('forum_reactions').delete().eq('user_id', user.id).eq('post_id', forumPost.id);
      
      const { error: reactionError } = await supabase
        .from('forum_reactions')
        .insert({ 
          user_id: user.id, 
          post_id: forumPost.id,
          reaction_type: '👍'
        });

      if (reactionError) {
        console.log('   ❌ Cannot add forum reactions:', reactionError.message);
      } else {
        console.log('   ✅ Forum reactions working!');
        results.forumReactions = true;
        await supabase.from('forum_reactions').delete().eq('user_id', user.id).eq('post_id', forumPost.id);
      }
    }

    // 3. Test bag_tees
    console.log('\n3. Testing bag_tees (Bag Likes)...');
    const { data: bag } = await supabase
      .from('user_bags')
      .select('id')
      .limit(1)
      .single();

    if (bag) {
      // Check if table exists first
      const { error: bagCheckError } = await supabase
        .from('bag_tees')
        .select('*')
        .limit(1);

      if (bagCheckError && bagCheckError.code === '42P01') {
        console.log('   ⚠️ bag_tees table does not exist yet');
      } else {
        await supabase.from('bag_tees').delete().eq('user_id', user.id).eq('bag_id', bag.id);
        
        const { error: bagError } = await supabase
          .from('bag_tees')
          .insert({ user_id: user.id, bag_id: bag.id });

        if (bagError) {
          console.log('   ❌ Cannot add bag tees:', bagError.message);
        } else {
          console.log('   ✅ Bag tees working!');
          results.bagTees = true;
          await supabase.from('bag_tees').delete().eq('user_id', user.id).eq('bag_id', bag.id);
        }
      }
    }

    // 4. Test equipment_tees
    console.log('\n4. Testing equipment_tees (Equipment Likes)...');
    const { data: equipment } = await supabase
      .from('equipment')
      .select('id')
      .limit(1)
      .single();

    if (equipment) {
      // Check if table exists first
      const { error: equipCheckError } = await supabase
        .from('equipment_tees')
        .select('*')
        .limit(1);

      if (equipCheckError && equipCheckError.code === '42P01') {
        console.log('   ⚠️ equipment_tees table does not exist yet');
      } else {
        await supabase.from('equipment_tees').delete().eq('user_id', user.id).eq('equipment_id', equipment.id);
        
        const { error: equipError } = await supabase
          .from('equipment_tees')
          .insert({ user_id: user.id, equipment_id: equipment.id });

        if (equipError) {
          console.log('   ❌ Cannot add equipment tees:', equipError.message);
        } else {
          console.log('   ✅ Equipment tees working!');
          results.equipmentTees = true;
          await supabase.from('equipment_tees').delete().eq('user_id', user.id).eq('equipment_id', equipment.id);
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SYSTEM STATUS:');
    console.log('='.repeat(50));
    console.log(`Feed Likes:       ${results.feedLikes ? '✅ WORKING' : '❌ NOT WORKING'}`);
    console.log(`Forum Reactions:  ${results.forumReactions ? '✅ WORKING' : '❌ NOT WORKING'}`);
    console.log(`Bag Tees:         ${results.bagTees ? '✅ WORKING' : '❌ NOT WORKING (table may not exist)'}`);
    console.log(`Equipment Tees:   ${results.equipmentTees ? '✅ WORKING' : '❌ NOT WORKING (table may not exist)'}`);

    const allWorking = results.feedLikes && results.forumReactions;
    
    if (!allWorking) {
      console.log('\n🚨 ACTION REQUIRED:');
      console.log('1. Go to Supabase Dashboard → SQL Editor');
      console.log('2. Copy ALL contents from: sql/FIX-ALL-REACTIONS-RLS.sql');
      console.log('3. Paste and click "Run"');
      console.log('4. This will fix ALL reaction systems at once!');
    } else {
      console.log('\n✅ Core reaction systems are working!');
      if (!results.bagTees || !results.equipmentTees) {
        console.log('   Run the SQL to create bag_tees and equipment_tees tables.');
      }
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

testAllReactions();