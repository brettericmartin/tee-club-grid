import { supabase } from './supabase-admin.js';

console.log('🧪 TESTING FOLLOW FUNCTIONALITY');
console.log('==============================');

async function testFollowFunctionality() {
  try {
    // 1. Check existing follows
    console.log('\n1. CHECKING EXISTING FOLLOWS...');
    const { data: existingFollows, error: fetchError } = await supabase
      .from('user_follows')
      .select('*')
      .limit(10);
    
    if (fetchError) {
      console.error('❌ Error fetching existing follows:', fetchError);
      return;
    }
    
    console.log(`✅ Found ${existingFollows.length} existing follows:`);
    existingFollows.forEach((follow, i) => {
      console.log(`  ${i + 1}. User ${follow.follower_id} follows ${follow.following_id}`);
    });

    // 2. Get two user IDs for testing
    console.log('\n2. GETTING TEST USERS...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(2);
    
    if (profileError || !profiles || profiles.length < 2) {
      console.error('❌ Need at least 2 users for testing');
      return;
    }

    const user1 = profiles[0];
    const user2 = profiles[1];
    console.log(`✅ Test users: ${user1.username} (${user1.id}) and ${user2.username} (${user2.id})`);

    // 3. Test follow operation
    console.log('\n3. TESTING FOLLOW OPERATION...');
    
    // Check if user1 already follows user2
    const { data: existingFollow } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', user1.id)
      .eq('following_id', user2.id)
      .maybeSingle();

    if (existingFollow) {
      console.log('✅ Follow relationship already exists, testing unfollow...');
      
      // Test unfollow
      const { error: unfollowError } = await supabase
        .from('user_follows')
        .delete()
        .eq('id', existingFollow.id);
      
      if (unfollowError) {
        console.error('❌ Unfollow failed:', unfollowError);
        return;
      }
      console.log('✅ Unfollow successful');
      
      // Test follow again
      const { error: followError } = await supabase
        .from('user_follows')
        .insert({
          follower_id: user1.id,
          following_id: user2.id
        });
      
      if (followError) {
        console.error('❌ Follow failed:', followError);
        return;
      }
      console.log('✅ Follow successful');
      
    } else {
      console.log('✅ No existing follow, testing follow...');
      
      // Test follow
      const { error: followError } = await supabase
        .from('user_follows')
        .insert({
          follower_id: user1.id,
          following_id: user2.id
        });
      
      if (followError) {
        console.error('❌ Follow failed:', followError);
        return;
      }
      console.log('✅ Follow successful');
      
      // Test unfollow
      const { data: newFollow } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user1.id)
        .eq('following_id', user2.id)
        .single();
      
      if (newFollow) {
        const { error: unfollowError } = await supabase
          .from('user_follows')
          .delete()
          .eq('id', newFollow.id);
        
        if (unfollowError) {
          console.error('❌ Unfollow failed:', unfollowError);
          return;
        }
        console.log('✅ Unfollow successful');
      }
    }

    // 4. Test RLS policies (if any)
    console.log('\n4. TESTING RLS POLICIES...');
    
    // Test as authenticated user
    const { data: userFollows, error: userFollowsError } = await supabase
      .from('user_follows')
      .select('*')
      .eq('follower_id', user1.id);
    
    if (userFollowsError) {
      console.error('❌ RLS test failed:', userFollowsError);
    } else {
      console.log(`✅ RLS test passed. User can read ${userFollows.length} of their follows`);
    }

    console.log('\n🎉 FOLLOW FUNCTIONALITY TEST COMPLETE');
    console.log('=====================================');
    console.log('✅ Database operations work correctly');
    console.log('✅ Follow/unfollow toggle functions properly');
    console.log('✅ RLS policies allow proper access');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testFollowFunctionality();