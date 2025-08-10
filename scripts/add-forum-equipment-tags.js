import { supabase } from './supabase-admin.js';

async function addForumEquipmentTags() {
  console.log('Adding forum equipment tags functionality...\n');

  try {
    // Test database connection
    console.log('Testing database access...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('Error accessing database:', testError);
      console.log('\n⚠️  Please run the SQL below in your Supabase SQL editor.');
      printSQL();
      return;
    }

    console.log('✓ Database connection successful');
    console.log('\n⚠️  The following SQL needs to be run in your Supabase SQL editor:');
    printSQL();
    
  } catch (error) {
    console.error('Error:', error);
    console.log('\nPlease run the SQL below in your Supabase SQL editor:');
    printSQL();
  }
}

function printSQL() {
  console.log(`
-- ================================================
-- FORUM EQUIPMENT TAGS MIGRATION
-- Run this in your Supabase SQL editor
-- ================================================

-- Create forum equipment tags table
CREATE TABLE IF NOT EXISTS forum_equipment_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, equipment_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_forum_equipment_tags_equipment_id ON forum_equipment_tags(equipment_id);
CREATE INDEX IF NOT EXISTS idx_forum_equipment_tags_post_id ON forum_equipment_tags(post_id);

-- Enable RLS
ALTER TABLE forum_equipment_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Forum equipment tags are viewable by everyone" ON forum_equipment_tags
  FOR SELECT USING (true);
  
CREATE POLICY "Users can tag equipment in their posts" ON forum_equipment_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM forum_posts 
      WHERE id = post_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete equipment tags from their posts" ON forum_equipment_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM forum_posts 
      WHERE id = post_id AND user_id = auth.uid()
    )
  );

-- Add tee_count to forum_threads for sorting (if not exists)
ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS tee_count INTEGER DEFAULT 0;

-- Create index on tee_count for performance
CREATE INDEX IF NOT EXISTS idx_forum_threads_tee_count ON forum_threads(tee_count DESC);

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Check if tables were created successfully:
SELECT 'forum_equipment_tags' as table_name, 
       EXISTS (
         SELECT FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name = 'forum_equipment_tags'
       ) as exists;

-- Check if tee_count column was added:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'forum_threads' 
AND column_name = 'tee_count';
`);
}

// Run the migration
addForumEquipmentTags();