import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service key in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addForumNestedReplies() {
  console.log('Starting forum nested replies migration...');
  console.log('\nThis script will output SQL that needs to be run in the Supabase SQL editor.\n');
  
  const migrationSQL = `
-- Add nested replies to forum posts
-- This adds a parent_post_id column to allow posts to reply to other posts

-- Add parent_post_id column to forum_posts table
ALTER TABLE forum_posts 
ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE;

-- Add index for performance on nested queries
CREATE INDEX IF NOT EXISTS idx_forum_posts_parent_post_id 
ON forum_posts(parent_post_id);

-- Add index for efficient tree queries
CREATE INDEX IF NOT EXISTS idx_forum_posts_thread_parent 
ON forum_posts(thread_id, parent_post_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'forum_posts' 
AND column_name = 'parent_post_id';

-- Check existing RLS policies (they should work with the new column)
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'forum_posts';
  `.trim();
  
  console.log('=== COPY AND RUN THIS SQL IN SUPABASE SQL EDITOR ===\n');
  console.log(migrationSQL);
  console.log('\n=== END OF SQL ===\n');
  
  // Try to check if the column already exists
  try {
    const { data, error } = await supabaseAdmin
      .from('forum_posts')
      .select('id, parent_post_id')
      .limit(1);
    
    if (error && error.message.includes('parent_post_id')) {
      console.log('❌ Column parent_post_id does not exist yet. Please run the SQL above.');
    } else if (!error) {
      console.log('✅ Column parent_post_id appears to already exist!');
    }
  } catch (e) {
    console.log('Could not verify column existence. Please run the SQL above to ensure migration.');
  }
  
  console.log('\nNext steps after running the migration:');
  console.log('1. Update TypeScript types to include parent_post_id');
  console.log('2. Create service functions for nested post operations');
  console.log('3. Update UI components to support nested replies');
}

// Run the migration
addForumNestedReplies();