import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkFollowsSystem() {
  console.log('🔍 Checking follows system...\n');

  try {
    // Check if user_follows table exists
    console.log('1. Checking user_follows table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('user_follows')
      .select('*')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      console.log('❌ Table user_follows does not exist!');
      console.log('Creating table...');
      
      // Create the table using direct SQL
      const { error: createError } = await supabase.rpc('create_follows_table', {});

      if (createError && createError.code === '42883') {
        // Function doesn't exist, try raw SQL approach
        console.log('Creating table with raw SQL...');
        // Note: We'll need to use the Supabase dashboard or a different approach
        console.log('⚠️ Please create the user_follows table manually in Supabase dashboard');
        return;
      }
      
      if (createError) {
        console.error('Error creating table:', createError);
        return;
      }
      console.log('✅ Table created successfully');
    } else if (!tableError) {
      console.log('✅ Table user_follows exists');
      
      // Show sample data
      const { data: sampleFollows, error: sampleError } = await supabase
        .from('user_follows')
        .select('*')
        .limit(5);
      
      if (!sampleError && sampleFollows) {
        console.log(`   Found ${sampleFollows.length} sample follow relationships`);
      }
    } else {
      console.log('⚠️ Unexpected error:', tableError);
    }

    // Test follow functionality with actual user IDs
    console.log('\n2. Testing follow functionality...');
    
    // Get test users
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .limit(2);

    if (profileError || !profiles || profiles.length < 2) {
      console.log('⚠️ Need at least 2 users to test follow functionality');
    } else {
      console.log('Found test users:', profiles.map(p => p.display_name || p.id).join(', '));
      
      // Check if follow exists
      const { data: existingFollow } = await supabase
        .from('user_follows')
        .select('*')
        .eq('follower_id', profiles[0].id)
        .eq('following_id', profiles[1].id)
        .maybeSingle();

      if (existingFollow) {
        console.log('✅ Test follow relationship already exists');
        
        // Test unfollow
        console.log('Testing unfollow...');
        const { error: unfollowError } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', profiles[0].id)
          .eq('following_id', profiles[1].id);
        
        if (unfollowError) {
          console.log('❌ Unfollow failed:', unfollowError.message);
        } else {
          console.log('✅ Unfollow successful');
          
          // Re-follow for testing
          const { error: refollowError } = await supabase
            .from('user_follows')
            .insert({
              follower_id: profiles[0].id,
              following_id: profiles[1].id
            });
          
          if (!refollowError) {
            console.log('✅ Re-follow successful');
          }
        }
      } else {
        console.log('Creating test follow...');
        const { error: followError } = await supabase
          .from('user_follows')
          .insert({
            follower_id: profiles[0].id,
            following_id: profiles[1].id
          });

        if (followError) {
          console.log('❌ Could not create test follow:', followError.message);
          console.log('Error details:', followError);
        } else {
          console.log('✅ Test follow created successfully');
        }
      }
    }

    // Check current follows count
    console.log('\n3. Current follow statistics:');
    const { count, error: countError } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`   Total follow relationships: ${count}`);
    } else {
      console.log('   Could not get count:', countError.message);
    }

    // Check if current user can query follows
    console.log('\n4. Testing query permissions...');
    const { data: allFollows, error: queryError } = await supabase
      .from('user_follows')
      .select('follower_id, following_id, created_at')
      .limit(10);

    if (queryError) {
      console.log('❌ Cannot query follows:', queryError.message);
    } else {
      console.log('✅ Can query follows. Found', allFollows?.length || 0, 'relationships');
    }

    console.log('\n✅ Follow system check complete!');

  } catch (error) {
    console.error('❌ Error checking follow system:', error);
  }
}

checkFollowsSystem();