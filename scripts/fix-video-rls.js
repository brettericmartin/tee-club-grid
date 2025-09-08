import './supabase-admin.js';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Parse the DATABASE_URL to get connection details
const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL in .env.local');
  console.log('\nTo fix the RLS policies, please run this SQL in your Supabase Dashboard:');
  console.log('\n--- START SQL ---\n');
  console.log(`
-- Fix RLS policies for user_bag_videos table

-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view videos from public bags" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can manage videos in their bags" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can insert videos to their bags" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can update their own videos" ON user_bag_videos;
DROP POLICY IF EXISTS "Users can delete their own videos" ON user_bag_videos;

-- Enable RLS on the table
ALTER TABLE user_bag_videos ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view videos
CREATE POLICY "Users can view videos from accessible bags"
ON user_bag_videos FOR SELECT
USING (
  auth.uid() = user_id
  OR share_to_feed = true
  OR EXISTS (
    SELECT 1 FROM user_bags 
    WHERE user_bags.id = user_bag_videos.bag_id 
    AND (user_bags.user_id = auth.uid() OR user_bags.is_public = true)
  )
);

-- Policy 2: Users can insert videos to their bags
CREATE POLICY "Users can insert videos to their bags"
ON user_bag_videos FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_bags 
    WHERE user_bags.id = bag_id 
    AND user_bags.user_id = auth.uid()
  )
);

-- Policy 3: Users can update their own videos
CREATE POLICY "Users can update their own videos"
ON user_bag_videos FOR UPDATE
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_bags 
    WHERE user_bags.id = user_bag_videos.bag_id 
    AND user_bags.user_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_bags 
    WHERE user_bags.id = bag_id 
    AND user_bags.user_id = auth.uid()
  )
);

-- Policy 4: Users can delete their own videos
CREATE POLICY "Users can delete their own videos"
ON user_bag_videos FOR DELETE
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_bags 
    WHERE user_bags.id = user_bag_videos.bag_id 
    AND user_bags.user_id = auth.uid()
  )
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_bag_videos TO authenticated;
  `);
  console.log('\n--- END SQL ---\n');
  console.log('Copy and paste the SQL above into the SQL Editor at:');
  console.log('https://supabase.com/dashboard/project/_/sql');
  process.exit(1);
}

async function fixVideoRLS() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();

    console.log('Fixing RLS policies for user_bag_videos table...\n');

    // Drop existing policies
    const dropPolicies = [
      `DROP POLICY IF EXISTS "Users can view videos from public bags" ON user_bag_videos`,
      `DROP POLICY IF EXISTS "Users can manage videos in their bags" ON user_bag_videos`,
      `DROP POLICY IF EXISTS "Users can insert videos to their bags" ON user_bag_videos`,
      `DROP POLICY IF EXISTS "Users can update their own videos" ON user_bag_videos`,
      `DROP POLICY IF EXISTS "Users can delete their own videos" ON user_bag_videos`,
    ];

    for (const query of dropPolicies) {
      console.log(`Executing: ${query.substring(0, 50)}...`);
      await client.query(query);
    }

    // Enable RLS
    console.log('Enabling RLS...');
    await client.query('ALTER TABLE user_bag_videos ENABLE ROW LEVEL SECURITY');

    // Create new policies
    console.log('Creating new policies...');

    // SELECT policy
    await client.query(`
      CREATE POLICY "Users can view videos from accessible bags"
      ON user_bag_videos FOR SELECT
      USING (
        auth.uid() = user_id
        OR share_to_feed = true
        OR EXISTS (
          SELECT 1 FROM user_bags 
          WHERE user_bags.id = user_bag_videos.bag_id 
          AND (user_bags.user_id = auth.uid() OR user_bags.is_public = true)
        )
      )
    `);
    console.log('✅ SELECT policy created');

    // INSERT policy
    await client.query(`
      CREATE POLICY "Users can insert videos to their bags"
      ON user_bag_videos FOR INSERT
      WITH CHECK (
        auth.uid() IS NOT NULL
        AND user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM user_bags 
          WHERE user_bags.id = bag_id 
          AND user_bags.user_id = auth.uid()
        )
      )
    `);
    console.log('✅ INSERT policy created');

    // UPDATE policy
    await client.query(`
      CREATE POLICY "Users can update their own videos"
      ON user_bag_videos FOR UPDATE
      USING (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM user_bags 
          WHERE user_bags.id = user_bag_videos.bag_id 
          AND user_bags.user_id = auth.uid()
        )
      )
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM user_bags 
          WHERE user_bags.id = bag_id 
          AND user_bags.user_id = auth.uid()
        )
      )
    `);
    console.log('✅ UPDATE policy created');

    // DELETE policy
    await client.query(`
      CREATE POLICY "Users can delete their own videos"
      ON user_bag_videos FOR DELETE
      USING (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM user_bags 
          WHERE user_bags.id = user_bag_videos.bag_id 
          AND user_bags.user_id = auth.uid()
        )
      )
    `);
    console.log('✅ DELETE policy created');

    // Grant permissions
    console.log('Granting permissions...');
    await client.query('GRANT SELECT, INSERT, UPDATE, DELETE ON user_bag_videos TO authenticated');
    
    console.log('\n✅ RLS policies fixed successfully!');
    console.log('\nUsers should now be able to add videos to their bags.');

  } catch (error) {
    console.error('Error applying RLS fix:', error);
    console.log('\nPlease apply the migration manually in your Supabase Dashboard.');
  } finally {
    await client.end();
  }
}

fixVideoRLS();