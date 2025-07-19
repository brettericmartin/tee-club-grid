-- Step 5: Add comment enhancements (tees, downvotes, nested comments)

-- Add columns to feed_comments
ALTER TABLE feed_comments ADD COLUMN IF NOT EXISTS tees_count INTEGER DEFAULT 0;
ALTER TABLE feed_comments ADD COLUMN IF NOT EXISTS downvotes_count INTEGER DEFAULT 0;
ALTER TABLE feed_comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES feed_comments(id) ON DELETE CASCADE;
ALTER TABLE feed_comments ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- Create comment_tees table
CREATE TABLE IF NOT EXISTS comment_tees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment_id UUID REFERENCES feed_comments(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, comment_id)
);

-- Create comment_downvotes table
CREATE TABLE IF NOT EXISTS comment_downvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment_id UUID REFERENCES feed_comments(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, comment_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_comment_tees_user ON comment_tees(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_tees_comment ON comment_tees(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_downvotes_user ON comment_downvotes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_downvotes_comment ON comment_downvotes(comment_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_parent ON feed_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_post ON feed_comments(post_id);

-- Enable RLS
ALTER TABLE comment_tees ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_downvotes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Comment tees are viewable by everyone" ON comment_tees
  FOR SELECT USING (true);

CREATE POLICY "Comment downvotes are viewable by everyone" ON comment_downvotes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own comment tees" ON comment_tees
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own comment downvotes" ON comment_downvotes
  FOR ALL USING (auth.uid() = user_id);