CREATE TABLE IF NOT EXISTS forum_equipment_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, equipment_id)
);

ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS tee_count INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_forum_equipment_tags_equipment_id ON forum_equipment_tags(equipment_id);
CREATE INDEX IF NOT EXISTS idx_forum_equipment_tags_post_id ON forum_equipment_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_tee_count ON forum_threads(tee_count);

-- RLS Policies
ALTER TABLE forum_equipment_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipment tags are viewable by everyone" ON forum_equipment_tags
  FOR SELECT USING (true);

CREATE POLICY "Users can tag equipment in own posts" ON forum_equipment_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM forum_posts 
      WHERE id = post_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove equipment tags from own posts" ON forum_equipment_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM forum_posts 
      WHERE id = post_id AND user_id = auth.uid()
    )
  );
