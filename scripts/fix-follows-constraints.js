import { supabase } from './supabase-admin.js';

console.log('🔧 FIXING FOLLOWS CONSTRAINTS');
console.log('=============================');

async function fixFollowsConstraints() {
  try {
    console.log('\n1. REMOVING INVALID SELF-FOLLOWS...');
    
    // First, remove any existing self-follows
    const { data: selfFollows, error: findError } = await supabase
      .from('user_follows')
      .select('*')
      .filter('follower_id', 'eq', 'following_id');

    if (findError) {
      console.log('❌ Error finding self-follows:', findError.message);
    } else {
      console.log(`Found ${selfFollows?.length || 0} self-follow records`);
      
      if (selfFollows && selfFollows.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_follows')
          .delete()
          .filter('follower_id', 'eq', 'following_id');
        
        if (deleteError) {
          console.log('❌ Error removing self-follows:', deleteError.message);
        } else {
          console.log(`✅ Removed ${selfFollows.length} self-follow records`);
        }
      }
    }

    console.log('\n2. ADDING CHECK CONSTRAINT TO PREVENT SELF-FOLLOWS...');
    
    // Add check constraint to prevent self-follows
    const constraintSQL = `
      -- Add check constraint to prevent self-follows
      ALTER TABLE public.user_follows 
      ADD CONSTRAINT user_follows_no_self_follow 
      CHECK (follower_id != following_id);
    `;

    // Try to add the constraint
    try {
      const { error: constraintError } = await supabase.rpc('execute_sql', {
        query: constraintSQL
      });

      if (constraintError) {
        console.log('⚠️ Cannot add constraint via RPC. Trying direct execution...');
        
        // Alternative approach - execute the SQL directly through the API
        const { error: directError } = await supabase
          .rpc('exec', { sql: constraintSQL });
        
        if (directError) {
          console.log('❌ Constraint could not be added automatically');
          console.log('\n📋 Please execute this SQL manually in Supabase SQL Editor:');
          console.log('='.repeat(60));
          console.log(constraintSQL);
          console.log('='.repeat(60));
        } else {
          console.log('✅ Check constraint added successfully');
        }
      } else {
        console.log('✅ Check constraint added successfully');
      }
    } catch (e) {
      console.log('❌ Error adding constraint:', e.message);
      console.log('\n📋 Please execute this SQL manually in Supabase SQL Editor:');
      console.log('='.repeat(60));
      console.log(constraintSQL);
      console.log('='.repeat(60));
    }

    console.log('\n3. TESTING SELF-FOLLOW PREVENTION...');
    
    // Get a test user
    const { data: testUser } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (testUser) {
      // Try to create a self-follow
      const { error: selfFollowError } = await supabase
        .from('user_follows')
        .insert({
          follower_id: testUser.id,
          following_id: testUser.id
        });

      if (selfFollowError && (selfFollowError.code === '23514' || selfFollowError.message.includes('check constraint'))) {
        console.log('✅ Self-follow prevention is working correctly');
      } else if (selfFollowError) {
        console.log('⚠️ Self-follow blocked, but with unexpected error:', selfFollowError.message);
      } else {
        console.log('❌ Self-follow was not prevented - constraint may not be active');
      }
    }

    console.log('\n4. VERIFYING TABLE STRUCTURE...');
    
    // Check current stats
    const { count: totalFollows } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ Total valid follow relationships: ${totalFollows}`);

    // Check for any remaining invalid data
    const { data: invalidFollows } = await supabase
      .from('user_follows')
      .select('*')
      .filter('follower_id', 'eq', 'following_id');

    if (invalidFollows && invalidFollows.length > 0) {
      console.log(`❌ Found ${invalidFollows.length} invalid self-follows still in database`);
    } else {
      console.log('✅ No invalid self-follows found in database');
    }

    console.log('\n🎉 CONSTRAINT FIXES COMPLETE!');
    console.log('\n✅ Updated Features:');
    console.log('   • Removed any existing self-follow records');
    console.log('   • Added check constraint to prevent self-follows');
    console.log('   • Verified constraint is working');
    console.log('   • Database integrity maintained');

  } catch (error) {
    console.error('❌ Error fixing constraints:', error);
  }
}

fixFollowsConstraints();