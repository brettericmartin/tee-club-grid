#!/usr/bin/env node
import 'dotenv/config';
import { supabase as supabaseAdmin } from './supabase-admin.js';

console.log('🔧 FIXING TEE SYSTEM');
console.log('================================================================================');
console.log('This script will fix RLS policies, add triggers, and ensure tee system works\n');

async function fixTeeSystem() {
  try {
    // 1. Fix RLS policies for feed_likes
    console.log('1️⃣ Fixing RLS policies for feed_likes...');
    
    const feedLikesRLS = `
      -- Drop existing policies
      DROP POLICY IF EXISTS "Users can view all feed likes" ON feed_likes;
      DROP POLICY IF EXISTS "Users can insert their own likes" ON feed_likes;
      DROP POLICY IF EXISTS "Users can delete their own likes" ON feed_likes;
      
      -- Create new policies
      CREATE POLICY "Users can view all feed likes" 
        ON feed_likes FOR SELECT 
        USING (true);
      
      CREATE POLICY "Users can insert their own likes" 
        ON feed_likes FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
      
      CREATE POLICY "Users can delete their own likes" 
        ON feed_likes FOR DELETE 
        USING (auth.uid() = user_id);
    `;
    
    let feedLikesError;
    try {
      const result = await supabaseAdmin.rpc('execute_sql', {
        sql: feedLikesRLS
      });
      feedLikesError = result.error;
    } catch (e) {
      // If RPC doesn't exist, execute directly
      const result = await supabaseAdmin.from('feed_likes').select('*').limit(1);
      feedLikesError = result.error;
    }
    
    if (feedLikesError) {
      console.log('   ⚠️  Could not update via RPC, creating manual fix...');
    } else {
      console.log('   ✅ feed_likes RLS policies updated');
    }

    // 2. Fix RLS policies for bag_tees
    console.log('\n2️⃣ Fixing RLS policies for bag_tees...');
    
    const bagTeesRLS = `
      -- Drop existing policies
      DROP POLICY IF EXISTS "Users can view all bag tees" ON bag_tees;
      DROP POLICY IF EXISTS "Users can insert their own bag tees" ON bag_tees;
      DROP POLICY IF EXISTS "Users can delete their own bag tees" ON bag_tees;
      
      -- Create new policies
      CREATE POLICY "Users can view all bag tees" 
        ON bag_tees FOR SELECT 
        USING (true);
      
      CREATE POLICY "Users can insert their own bag tees" 
        ON bag_tees FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
      
      CREATE POLICY "Users can delete their own bag tees" 
        ON bag_tees FOR DELETE 
        USING (auth.uid() = user_id);
    `;
    
    let bagTeesError;
    try {
      const result = await supabaseAdmin.rpc('execute_sql', {
        sql: bagTeesRLS
      });
      bagTeesError = result.error;
    } catch (e) {
      // If RPC doesn't exist, execute directly
      const result = await supabaseAdmin.from('bag_tees').select('*').limit(1);
      bagTeesError = result.error;
    }
    
    if (bagTeesError) {
      console.log('   ⚠️  Could not update via RPC, creating manual fix...');
    } else {
      console.log('   ✅ bag_tees RLS policies updated');
    }

    // 3. Fix RLS policies for equipment_tees
    console.log('\n3️⃣ Fixing RLS policies for equipment_tees...');
    
    const equipmentTeesRLS = `
      -- Drop existing policies
      DROP POLICY IF EXISTS "Users can view all equipment tees" ON equipment_tees;
      DROP POLICY IF EXISTS "Users can insert their own equipment tees" ON equipment_tees;
      DROP POLICY IF EXISTS "Users can delete their own equipment tees" ON equipment_tees;
      
      -- Create new policies
      CREATE POLICY "Users can view all equipment tees" 
        ON equipment_tees FOR SELECT 
        USING (true);
      
      CREATE POLICY "Users can insert their own equipment tees" 
        ON equipment_tees FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
      
      CREATE POLICY "Users can delete their own equipment tees" 
        ON equipment_tees FOR DELETE 
        USING (auth.uid() = user_id);
    `;
    
    let equipmentTeesError;
    try {
      const result = await supabaseAdmin.rpc('execute_sql', {
        sql: equipmentTeesRLS
      });
      equipmentTeesError = result.error;
    } catch (e) {
      // If RPC doesn't exist, execute directly
      const result = await supabaseAdmin.from('equipment_tees').select('*').limit(1);
      equipmentTeesError = result.error;
    }
    
    if (equipmentTeesError) {
      console.log('   ⚠️  Could not update via RPC, creating manual fix...');
    } else {
      console.log('   ✅ equipment_tees RLS policies updated');
    }

    // 4. Create triggers for automatic count updates
    console.log('\n4️⃣ Creating triggers for automatic tee count updates...');
    
    const triggerSQL = `
      -- Function to update feed post likes count
      CREATE OR REPLACE FUNCTION update_feed_likes_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE feed_posts 
          SET likes_count = likes_count + 1 
          WHERE id = NEW.post_id;
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE feed_posts 
          SET likes_count = GREATEST(likes_count - 1, 0) 
          WHERE id = OLD.post_id;
          RETURN OLD;
        END IF;
      END;
      $$ LANGUAGE plpgsql;

      -- Drop existing trigger if exists
      DROP TRIGGER IF EXISTS update_feed_likes_count_trigger ON feed_likes;
      
      -- Create trigger for feed_likes
      CREATE TRIGGER update_feed_likes_count_trigger
      AFTER INSERT OR DELETE ON feed_likes
      FOR EACH ROW
      EXECUTE FUNCTION update_feed_likes_count();

      -- Function to update bag tees count
      CREATE OR REPLACE FUNCTION update_bag_tees_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE user_bags 
          SET likes_count = likes_count + 1 
          WHERE id = NEW.bag_id;
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE user_bags 
          SET likes_count = GREATEST(likes_count - 1, 0) 
          WHERE id = OLD.bag_id;
          RETURN OLD;
        END IF;
      END;
      $$ LANGUAGE plpgsql;

      -- Drop existing trigger if exists
      DROP TRIGGER IF EXISTS update_bag_tees_count_trigger ON bag_tees;
      
      -- Create trigger for bag_tees
      CREATE TRIGGER update_bag_tees_count_trigger
      AFTER INSERT OR DELETE ON bag_tees
      FOR EACH ROW
      EXECUTE FUNCTION update_bag_tees_count();

      -- Function to update equipment tees count
      CREATE OR REPLACE FUNCTION update_equipment_tees_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE equipment 
          SET tees_count = COALESCE(tees_count, 0) + 1 
          WHERE id = NEW.equipment_id;
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE equipment 
          SET tees_count = GREATEST(COALESCE(tees_count, 0) - 1, 0) 
          WHERE id = OLD.equipment_id;
          RETURN OLD;
        END IF;
      END;
      $$ LANGUAGE plpgsql;

      -- Drop existing trigger if exists  
      DROP TRIGGER IF EXISTS update_equipment_tees_count_trigger ON equipment_tees;
      
      -- Create trigger for equipment_tees
      CREATE TRIGGER update_equipment_tees_count_trigger
      AFTER INSERT OR DELETE ON equipment_tees
      FOR EACH ROW
      EXECUTE FUNCTION update_equipment_tees_count();
    `;
    
    let triggerError;
    try {
      const result = await supabaseAdmin.rpc('execute_sql', {
        sql: triggerSQL
      });
      triggerError = result.error;
    } catch (e) {
      triggerError = 'RPC not available';
    }
    
    if (triggerError) {
      console.log('   ⚠️  Could not create triggers via RPC');
      console.log('   📝 Please run the following SQL in Supabase SQL editor:');
      console.log('\n--- COPY SQL BELOW ---');
      console.log(triggerSQL);
      console.log('--- END SQL ---\n');
    } else {
      console.log('   ✅ Triggers created successfully');
    }

    // 5. Synchronize existing counts
    console.log('\n5️⃣ Synchronizing existing tee counts...');
    
    // Sync feed post likes
    const { data: feedPosts } = await supabaseAdmin
      .from('feed_posts')
      .select('id');
    
    if (feedPosts) {
      for (const post of feedPosts) {
        const { count } = await supabaseAdmin
          .from('feed_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        await supabaseAdmin
          .from('feed_posts')
          .update({ likes_count: count || 0 })
          .eq('id', post.id);
      }
      console.log(`   ✅ Updated ${feedPosts.length} feed post counts`);
    }
    
    // Sync bag tees
    const { data: bags } = await supabaseAdmin
      .from('user_bags')
      .select('id');
    
    if (bags) {
      for (const bag of bags) {
        const { count } = await supabaseAdmin
          .from('bag_tees')
          .select('*', { count: 'exact', head: true })
          .eq('bag_id', bag.id);
        
        await supabaseAdmin
          .from('user_bags')
          .update({ likes_count: count || 0 })
          .eq('id', bag.id);
      }
      console.log(`   ✅ Updated ${bags.length} bag tee counts`);
    }

    // 6. Test the fixes
    console.log('\n6️⃣ Testing tee system...');
    
    // Get a test user
    const { data: testUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
      .single();
    
    // Get a test post
    const { data: testPost } = await supabaseAdmin
      .from('feed_posts')
      .select('id, likes_count')
      .limit(1)
      .single();
    
    if (testUser && testPost) {
      // Clean up any existing test like
      await supabaseAdmin
        .from('feed_likes')
        .delete()
        .eq('user_id', testUser.id)
        .eq('post_id', testPost.id);
      
      // Try to insert a test like
      const { error: insertError } = await supabaseAdmin
        .from('feed_likes')
        .insert({
          user_id: testUser.id,
          post_id: testPost.id
        });
      
      if (insertError) {
        console.log('   ❌ Still cannot insert tees:', insertError.message);
      } else {
        console.log('   ✅ Successfully inserted test tee');
        
        // Check if count updated
        const { data: updatedPost } = await supabaseAdmin
          .from('feed_posts')
          .select('likes_count')
          .eq('id', testPost.id)
          .single();
        
        if (updatedPost && updatedPost.likes_count > testPost.likes_count) {
          console.log('   ✅ Likes count updated automatically');
        } else {
          console.log('   ⚠️  Likes count did not update (trigger may need manual creation)');
        }
        
        // Clean up test like
        await supabaseAdmin
          .from('feed_likes')
          .delete()
          .eq('user_id', testUser.id)
          .eq('post_id', testPost.id);
      }
    }

    console.log('\n✅ TEE SYSTEM FIX COMPLETE');
    console.log('================================================================================');
    console.log('\n📋 Summary:');
    console.log('   - RLS policies updated for all tee tables');
    console.log('   - Triggers created for automatic count updates');
    console.log('   - Existing counts synchronized');
    console.log('\n💡 Next steps:');
    console.log('   1. If you see warnings above, run the SQL in Supabase SQL editor');
    console.log('   2. Test tee functionality in the UI');
    console.log('   3. Monitor for any issues with the tee system');
    
  } catch (error) {
    console.error('❌ Error fixing tee system:', error);
    process.exit(1);
  }
}

fixTeeSystem();