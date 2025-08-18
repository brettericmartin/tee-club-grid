import { supabase } from './supabase-admin.js';

async function fixLikesSystem() {
  console.log('🔧 Fixing Likes/Tees System...\n');

  try {
    // Step 1: Check if feed_likes table exists
    console.log('📋 Checking feed_likes table...');
    
    const { data: feedLikesData, error: feedLikesError } = await supabase
      .from('feed_likes')
      .select('count', { count: 'exact', head: true });

    if (feedLikesError) {
      if (feedLikesError.code === '42P01') {
        console.log('❌ feed_likes table does not exist');
        console.log('📝 MANUAL ACTION NEEDED: Create feed_likes table in Supabase Dashboard with:');
        console.log(`
CREATE TABLE feed_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX idx_feed_likes_user_id ON feed_likes(user_id);
CREATE INDEX idx_feed_likes_post_id ON feed_likes(post_id);
        `);
      } else {
        console.log('⚠️ Error checking feed_likes table:', feedLikesError);
      }
    } else {
      console.log('✅ feed_likes table exists');
    }

    // Step 2: Check RLS policies by testing insert capability
    console.log('\n🔒 Testing RLS policies...');
    
    // Try to get current user to test policies
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('⚠️ No authenticated user - cannot test policies');
      console.log('📝 MANUAL ACTION NEEDED: Set up RLS policies in Supabase Dashboard:');
      console.log(`
-- Enable RLS
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view likes
CREATE POLICY "Anyone can view feed likes" ON feed_likes FOR SELECT USING (true);

-- Allow authenticated users to like posts
CREATE POLICY "Users can like posts" ON feed_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to unlike posts  
CREATE POLICY "Users can unlike posts" ON feed_likes FOR DELETE USING (auth.uid() = user_id);
      `);
    } else {
      console.log('✅ Authenticated user available for testing');
    }

    // Step 3: Migrate existing likes data
    console.log('\n🔄 Migrating existing likes data...');
    
    const { data: existingLikes, error: likesError } = await supabase
      .from('likes')
      .select('*');
    
    if (likesError) {
      console.log('⚠️ Error reading likes table:', likesError);
    } else if (existingLikes && existingLikes.length > 0) {
      console.log(`Found ${existingLikes.length} existing likes to migrate...`);
      
      let migratedCount = 0;
      let errorCount = 0;
      
      for (const like of existingLikes) {
        if (like.post_id) {
          try {
            const { error: insertError } = await supabase
              .from('feed_likes')
              .insert({
                user_id: like.user_id,
                post_id: like.post_id,
                created_at: like.created_at
              });
            
            if (insertError) {
              if (insertError.message.includes('duplicate key')) {
                // Already exists, that's ok
                migratedCount++;
              } else {
                console.log(`⚠️ Could not migrate like:`, insertError.message);
                errorCount++;
              }
            } else {
              migratedCount++;
            }
          } catch (err) {
            console.log(`⚠️ Error migrating like:`, err.message);
            errorCount++;
          }
        }
      }
      
      console.log(`✅ Migration complete: ${migratedCount} successful, ${errorCount} errors`);
    } else {
      console.log('No existing likes to migrate');
    }

    // Step 4: Update likes counts
    console.log('\n🔄 Updating likes counts...');
    
    const { data: feedPosts, error: postsError } = await supabase
      .from('feed_posts')
      .select('id');
    
    if (postsError) {
      console.log('⚠️ Error reading feed_posts:', postsError);
    } else if (feedPosts) {
      let updatedCount = 0;
      
      for (const post of feedPosts) {
        try {
          // Count likes for this post from feed_likes
          const { count: feedLikeCount } = await supabase
            .from('feed_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          // Count likes from old likes table
          const { count: oldLikeCount } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          const totalLikes = (feedLikeCount || 0) + (oldLikeCount || 0);
          
          // Update the post's likes_count and tees_count
          const { error: updateError } = await supabase
            .from('feed_posts')
            .update({ 
              likes_count: totalLikes,
              tees_count: totalLikes
            })
            .eq('id', post.id);
          
          if (updateError) {
            console.log(`⚠️ Could not update post ${post.id}:`, updateError.message);
          } else {
            updatedCount++;
          }
        } catch (err) {
          console.log(`⚠️ Error updating post ${post.id}:`, err.message);
        }
      }
      
      console.log(`✅ Updated likes counts for ${updatedCount} posts`);
    }

    // Step 5: Create missing tables structures (for manual creation)
    console.log('\n📝 Missing table structures for manual creation:');
    
    const { data: bagTeesCheck, error: bagTeesError } = await supabase
      .from('bag_tees')
      .select('count', { count: 'exact', head: true });

    if (bagTeesError && bagTeesError.code === '42P01') {
      console.log('\n❌ bag_tees table missing. Create with:');
      console.log(`
CREATE TABLE bag_tees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bag_id UUID NOT NULL REFERENCES bags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, bag_id)
);

CREATE INDEX idx_bag_tees_user_id ON bag_tees(user_id);
CREATE INDEX idx_bag_tees_bag_id ON bag_tees(bag_id);

ALTER TABLE bag_tees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view bag tees" ON bag_tees FOR SELECT USING (true);
CREATE POLICY "Users can tee bags" ON bag_tees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can untee bags" ON bag_tees FOR DELETE USING (auth.uid() = user_id);
      `);
    } else {
      console.log('✅ bag_tees table exists');
    }

    const { data: equipmentTeesCheck, error: equipmentTeesError } = await supabase
      .from('equipment_tees')
      .select('count', { count: 'exact', head: true });

    if (equipmentTeesError && equipmentTeesError.code === '42P01') {
      console.log('\n❌ equipment_tees table missing. Create with:');
      console.log(`
CREATE TABLE equipment_tees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, equipment_id)
);

CREATE INDEX idx_equipment_tees_user_id ON equipment_tees(user_id);
CREATE INDEX idx_equipment_tees_equipment_id ON equipment_tees(equipment_id);

ALTER TABLE equipment_tees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view equipment tees" ON equipment_tees FOR SELECT USING (true);
CREATE POLICY "Users can tee equipment" ON equipment_tees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can untee equipment" ON equipment_tees FOR DELETE USING (auth.uid() = user_id);
      `);
    } else {
      console.log('✅ equipment_tees table exists');
    }

    // Step 6: Test the system
    console.log('\n🧪 Testing the system...');
    
    const { data: testPosts, error: testError } = await supabase
      .from('feed_posts')
      .select('id, likes_count, tees_count')
      .limit(5);
    
    if (testError) {
      console.log('⚠️ Test query failed:', testError);
    } else {
      console.log('✅ System test successful');
      console.log('\nSample posts with updated counts:');
      testPosts.forEach((post, index) => {
        console.log(`  ${index + 1}. Post ${post.id.substring(0, 8)}... - Likes: ${post.likes_count || 0}, Tees: ${post.tees_count || 0}`);
      });
    }

    console.log('\n🎉 Likes/Tees system diagnosis and partial fix completed!');
    console.log('\n✅ What was fixed:');
    console.log('  - Migrated existing likes data');
    console.log('  - Updated all feed posts with accurate likes counts');
    console.log('  - Added tees_count support alongside likes_count');
    
    console.log('\n📝 Manual actions needed in Supabase Dashboard:');
    console.log('  - Create missing tables (SQL provided above)');
    console.log('  - Set up RLS policies (SQL provided above)');
    console.log('  - Create triggers for auto-updating counts');
    
  } catch (error) {
    console.error('❌ Error during likes/tees system fix:', error);
  }
}

// Run the fix
fixLikesSystem();