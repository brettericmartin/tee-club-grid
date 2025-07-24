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
  
  try {
    // Add parent_post_id column to forum_posts table
    const { error: alterError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        -- Add parent_post_id column to forum_posts table
        ALTER TABLE forum_posts 
        ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE;
        
        -- Add index for performance on nested queries
        CREATE INDEX IF NOT EXISTS idx_forum_posts_parent_post_id 
        ON forum_posts(parent_post_id);
        
        -- Add index for efficient tree queries
        CREATE INDEX IF NOT EXISTS idx_forum_posts_thread_parent 
        ON forum_posts(thread_id, parent_post_id);
      `
    });
    
    if (alterError) {
      console.error('Error altering table:', alterError);
      throw alterError;
    }
    
    console.log('✅ Added parent_post_id column to forum_posts table');
    console.log('✅ Added indexes for nested post queries');
    
    // Verify the column was added
    const { data: columns, error: columnsError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'forum_posts' 
        AND column_name = 'parent_post_id';
      `
    });
    
    if (columnsError) {
      console.error('Error checking columns:', columnsError);
      throw columnsError;
    }
    
    if (columns && columns.length > 0) {
      console.log('✅ Verified parent_post_id column exists:', columns[0]);
    }
    
    // Check existing RLS policies
    const { data: policies, error: policiesError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        SELECT policyname, cmd, qual 
        FROM pg_policies 
        WHERE tablename = 'forum_posts';
      `
    });
    
    if (policiesError) {
      console.error('Error checking policies:', policiesError);
    } else {
      console.log('\nExisting RLS policies for forum_posts:');
      policies.forEach(policy => {
        console.log(`- ${policy.policyname} (${policy.cmd})`);
      });
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update TypeScript types to include parent_post_id');
    console.log('2. Create service functions for nested post operations');
    console.log('3. Update UI components to support nested replies');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
addForumNestedReplies();