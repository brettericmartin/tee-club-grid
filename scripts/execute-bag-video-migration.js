import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Extract the database connection info from the Supabase URL
const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

async function executeMigration() {
  try {
    console.log('🚀 Executing Bag Video Type Migration\n');
    console.log('='.repeat(40));
    
    // Use Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Migration statements to execute
    const statements = [
      // Drop existing constraint
      `ALTER TABLE feed_posts DROP CONSTRAINT IF EXISTS feed_posts_type_check`,
      
      // Add new constraint with bag_video
      `ALTER TABLE feed_posts 
       ADD CONSTRAINT feed_posts_type_check 
       CHECK (type IN (
         'new_equipment', 
         'bag_update', 
         'milestone', 
         'playing', 
         'equipment_photo',
         'bag_created',
         'bag_updated',
         'multi_equipment_photos',
         'bag_video'
       ))`,
       
      // Create index for performance
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_posts_bag_video 
       ON feed_posts(type, created_at DESC, user_id) 
       WHERE type = 'bag_video'`,
       
      // Add comment
      `COMMENT ON COLUMN feed_posts.type IS 'Post type - includes bag_video for video content shared from user bags'`
    ];
    
    console.log('📝 Executing migration statements...\n');
    
    // Since we can't execute DDL directly through Supabase client,
    // we'll create a function to do it
    
    // First, let's create a temporary function to execute our DDL
    console.log('Creating temporary migration function...');
    
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION apply_bag_video_migration()
      RETURNS void AS $$
      BEGIN
        -- Drop existing constraint
        ALTER TABLE feed_posts DROP CONSTRAINT IF EXISTS feed_posts_type_check;
        
        -- Add new constraint with bag_video
        ALTER TABLE feed_posts 
        ADD CONSTRAINT feed_posts_type_check 
        CHECK (type IN (
          'new_equipment', 
          'bag_update', 
          'milestone', 
          'playing', 
          'equipment_photo',
          'bag_created',
          'bag_updated',
          'multi_equipment_photos',
          'bag_video'
        ));
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_feed_posts_bag_video 
        ON feed_posts(type, created_at DESC, user_id) 
        WHERE type = 'bag_video';
        
        -- Add comment
        COMMENT ON COLUMN feed_posts.type IS 'Post type - includes bag_video for video content shared from user bags';
        
        RAISE NOTICE 'Migration completed successfully';
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // Try to create and execute the function
    try {
      // This approach won't work without proper database connection
      console.log('\n⚠️  Direct DDL execution requires database admin access.');
      console.log('\n📋 Manual Application Required:');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Run the following SQL:\n');
      
      console.log('-- Migration: Add bag_video type to feed_posts');
      console.log('-- Run this in Supabase SQL Editor\n');
      statements.forEach(stmt => {
        console.log(stmt + ';\n');
      });
      
      console.log('\n4. After running, test with: node scripts/test-video-feed-post.js');
      
    } catch (err) {
      console.error('Error:', err.message);
    }
    
    // Let's at least verify the current state
    console.log('\n🔍 Checking current constraint status...');
    
    // Try to get constraint definition
    const { data: constraintCheck, error: constraintError } = await supabase
      .rpc('get_constraint_def', {
        table_name: 'feed_posts',
        constraint_name: 'feed_posts_type_check'
      });
    
    if (constraintError) {
      // Try a simpler check
      const { data: testUser } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();
      
      if (testUser) {
        const { data: testBag } = await supabase
          .from('user_bags')
          .select('id')
          .eq('user_id', testUser.id)
          .limit(1)
          .single();
        
        if (testBag) {
          // Try to insert a test post
          const { error: testError } = await supabase
            .from('feed_posts')
            .insert({
              user_id: testUser.id,
              type: 'bag_video',
              bag_id: testBag.id,
              content: { test: true },
              likes_count: 0
            });
          
          if (testError && testError.message.includes('feed_posts_type_check')) {
            console.log('❌ Constraint needs updating - bag_video not allowed');
          } else if (!testError) {
            console.log('✅ bag_video type already supported!');
            // Clean up
            await supabase
              .from('feed_posts')
              .delete()
              .match({ 
                user_id: testUser.id,
                type: 'bag_video'
              })
              .eq('content->test', true);
          }
        }
      }
    } else {
      console.log('Current constraint:', constraintCheck);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

executeMigration();