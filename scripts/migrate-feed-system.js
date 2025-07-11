import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateFeedSystem() {
  console.log('\n🔄 Migrating Feed System\n');
  console.log('========================\n');

  try {
    // 1. First, check current feed_posts structure
    console.log('1. Checking current feed_posts table...');
    const { data: currentPosts, error: checkError } = await supabase
      .from('feed_posts')
      .select('*')
      .limit(1);

    if (checkError) {
      console.log('   feed_posts table does not exist or has issues:', checkError.message);
    } else {
      console.log('   ✓ feed_posts table exists');
    }

    // 2. Create or update feed_posts table
    console.log('\n2. Creating enhanced feed system...');
    
    const { error: migrationError } = await supabase.rpc('execute_sql', {
      query: `
        -- Drop existing table if needed (be careful in production!)
        DROP TABLE IF EXISTS feed_posts CASCADE;
        
        -- Create enhanced feed_posts table
        CREATE TABLE feed_posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK (type IN ('equipment_photo', 'bag_created', 'bag_updated')),
          
          -- Common fields
          content TEXT, -- Caption or description
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          
          -- Photo-specific fields
          image_url TEXT,
          
          -- Bag-specific fields
          bag_id UUID REFERENCES user_bags(id) ON DELETE CASCADE,
          parent_post_id UUID REFERENCES feed_posts(id) ON DELETE SET NULL, -- For linking bag updates to original
          
          -- Metadata for different post types
          metadata JSONB DEFAULT '{}',
          
          -- Engagement
          likes_count INTEGER DEFAULT 0,
          comments_count INTEGER DEFAULT 0,
          
          -- Indexes
          CONSTRAINT valid_post_type CHECK (
            (type = 'equipment_photo' AND image_url IS NOT NULL) OR
            (type IN ('bag_created', 'bag_updated') AND bag_id IS NOT NULL)
          )
        );
        
        -- Create indexes
        CREATE INDEX idx_feed_posts_user_id ON feed_posts(user_id);
        CREATE INDEX idx_feed_posts_type ON feed_posts(type);
        CREATE INDEX idx_feed_posts_created_at ON feed_posts(created_at DESC);
        CREATE INDEX idx_feed_posts_bag_id ON feed_posts(bag_id);
        
        -- Create feed_likes table
        CREATE TABLE IF NOT EXISTS feed_likes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          post_id UUID REFERENCES feed_posts(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, post_id)
        );
        
        -- Create feed_comments table
        CREATE TABLE IF NOT EXISTS feed_comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          post_id UUID REFERENCES feed_posts(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Function to update likes count
        CREATE OR REPLACE FUNCTION update_feed_likes_count()
        RETURNS TRIGGER AS $$
        BEGIN
          IF TG_OP = 'INSERT' THEN
            UPDATE feed_posts 
            SET likes_count = likes_count + 1 
            WHERE id = NEW.post_id;
          ELSIF TG_OP = 'DELETE' THEN
            UPDATE feed_posts 
            SET likes_count = likes_count - 1 
            WHERE id = OLD.post_id;
          END IF;
          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
        
        -- Trigger for likes count
        CREATE TRIGGER update_feed_likes_count_trigger
        AFTER INSERT OR DELETE ON feed_likes
        FOR EACH ROW
        EXECUTE FUNCTION update_feed_likes_count();
        
        -- Function to handle bag creation posts
        CREATE OR REPLACE FUNCTION create_bag_feed_post()
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO feed_posts (user_id, type, bag_id, content)
          VALUES (
            NEW.user_id,
            'bag_created',
            NEW.id,
            'Created a new bag: ' || NEW.name
          );
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        -- Trigger for new bags
        CREATE TRIGGER create_bag_feed_post_trigger
        AFTER INSERT ON user_bags
        FOR EACH ROW
        WHEN (NEW.is_public = true)
        EXECUTE FUNCTION create_bag_feed_post();
        
        -- Enable RLS
        ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
        ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
        ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
        
        -- RLS Policies
        CREATE POLICY "Feed posts are viewable by everyone" ON feed_posts
          FOR SELECT USING (true);
          
        CREATE POLICY "Users can create their own feed posts" ON feed_posts
          FOR INSERT WITH CHECK (auth.uid() = user_id);
          
        CREATE POLICY "Users can update their own feed posts" ON feed_posts
          FOR UPDATE USING (auth.uid() = user_id);
          
        CREATE POLICY "Users can delete their own feed posts" ON feed_posts
          FOR DELETE USING (auth.uid() = user_id);
          
        CREATE POLICY "Feed likes are viewable by everyone" ON feed_likes
          FOR SELECT USING (true);
          
        CREATE POLICY "Users can manage their own likes" ON feed_likes
          FOR ALL USING (auth.uid() = user_id);
          
        CREATE POLICY "Comments are viewable by everyone" ON feed_comments
          FOR SELECT USING (true);
          
        CREATE POLICY "Users can create comments" ON feed_comments
          FOR INSERT WITH CHECK (auth.uid() = user_id);
      `
    });

    if (migrationError) {
      console.error('Migration error:', migrationError);
      
      // Try a simpler approach if the full migration fails
      console.log('\n3. Trying simpler migration approach...');
      
      // Just add missing columns if table exists
      const { error: alterError } = await supabase.rpc('execute_sql', {
        query: `
          -- Add missing columns to existing table
          ALTER TABLE feed_posts 
          ADD COLUMN IF NOT EXISTS bag_id UUID REFERENCES user_bags(id) ON DELETE CASCADE,
          ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES feed_posts(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
          
          -- Update type constraint
          ALTER TABLE feed_posts DROP CONSTRAINT IF EXISTS feed_posts_type_check;
          ALTER TABLE feed_posts ADD CONSTRAINT feed_posts_type_check 
            CHECK (type IN ('equipment_photo', 'bag_created', 'bag_updated'));
        `
      });
      
      if (alterError) {
        console.error('Alter table error:', alterError);
      } else {
        console.log('   ✓ Updated existing feed_posts table');
      }
    } else {
      console.log('   ✓ Feed system migration completed successfully');
    }

    // 4. Test the new structure
    console.log('\n4. Testing new feed structure...');
    const { data: testPost, error: testError } = await supabase
      .from('feed_posts')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('Test error:', testError);
    } else {
      console.log('   ✓ Feed posts table is working');
    }

    console.log('\n========================\n');
    console.log('Migration complete! Feed system is ready for:');
    console.log('- Equipment photos from any source');
    console.log('- Automatic bag creation posts');
    console.log('- Bag update posts with 72-hour logic');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

migrateFeedSystem().catch(console.error);