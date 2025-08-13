-- ================================================
-- FORUM FEEDBACK TRACKING SYSTEM
-- Adds support for tracking implementation of feedback
-- ================================================

-- Add 'fixed' reaction type to existing constraint
ALTER TABLE forum_reactions 
DROP CONSTRAINT IF EXISTS forum_reactions_reaction_type_check;

ALTER TABLE forum_reactions 
ADD CONSTRAINT forum_reactions_reaction_type_check 
CHECK (reaction_type IN ('tee', 'helpful', 'fire', 'fixed'));

-- Create feedback tracking table
CREATE TABLE IF NOT EXISTS feedback_tracking (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  thread_id UUID REFERENCES forum_threads(id) ON DELETE CASCADE NOT NULL,
  issue_type TEXT CHECK (issue_type IN ('bug', 'feature', 'improvement', 'other')) DEFAULT 'other',
  status TEXT CHECK (status IN ('pending', 'in_progress', 'fixed', 'wont_fix', 'duplicate')) DEFAULT 'pending',
  priority INTEGER CHECK (priority BETWEEN 1 AND 5) DEFAULT 3,
  session_id TEXT,
  pr_url TEXT,
  fixed_date TIMESTAMP WITH TIME ZONE,
  fixed_by_commit TEXT,
  implementation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(thread_id)
);

-- Create feedback processing sessions table
CREATE TABLE IF NOT EXISTS feedback_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  branch_name TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  completed_at TIMESTAMP WITH TIME ZONE,
  items_processed INTEGER DEFAULT 0,
  items_fixed INTEGER DEFAULT 0,
  pr_url TEXT,
  status TEXT CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  notes TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_tracking_thread_id ON feedback_tracking(thread_id);
CREATE INDEX IF NOT EXISTS idx_feedback_tracking_status ON feedback_tracking(status);
CREATE INDEX IF NOT EXISTS idx_feedback_tracking_session_id ON feedback_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_sessions_session_id ON feedback_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_sessions_status ON feedback_sessions(status);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_feedback_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feedback_tracking_updated_at 
BEFORE UPDATE ON feedback_tracking
FOR EACH ROW EXECUTE FUNCTION update_feedback_tracking_updated_at();

-- Enable RLS
ALTER TABLE feedback_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for feedback_tracking (public read, authenticated write)
CREATE POLICY "Feedback tracking viewable by everyone" ON feedback_tracking
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage feedback tracking" ON feedback_tracking
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Policies for feedback_sessions
CREATE POLICY "Feedback sessions viewable by everyone" ON feedback_sessions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage feedback sessions" ON feedback_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Add helpful view for feedback status
CREATE OR REPLACE VIEW forum_feedback_status AS
SELECT 
  t.id,
  t.title,
  t.slug,
  t.created_at,
  c.name as category_name,
  c.slug as category_slug,
  ft.status,
  ft.issue_type,
  ft.priority,
  ft.fixed_date,
  ft.pr_url,
  ft.session_id,
  COUNT(DISTINCT r.id) FILTER (WHERE r.reaction_type = 'tee') as tee_count,
  COUNT(DISTINCT r.id) FILTER (WHERE r.reaction_type = 'helpful') as helpful_count,
  COUNT(DISTINCT r.id) FILTER (WHERE r.reaction_type = 'fixed') as fixed_count,
  COUNT(DISTINCT p.id) as post_count
FROM forum_threads t
LEFT JOIN forum_categories c ON t.category_id = c.id
LEFT JOIN feedback_tracking ft ON t.id = ft.thread_id
LEFT JOIN forum_posts p ON t.id = p.thread_id
LEFT JOIN forum_reactions r ON p.id = r.post_id
WHERE c.slug = 'site-feedback'
GROUP BY t.id, t.title, t.slug, t.created_at, c.name, c.slug, 
         ft.status, ft.issue_type, ft.priority, ft.fixed_date, ft.pr_url, ft.session_id
ORDER BY 
  CASE WHEN ft.status = 'pending' THEN 0 ELSE 1 END,
  ft.priority DESC NULLS LAST,
  tee_count DESC,
  t.created_at DESC;

-- Grant permissions for the view
GRANT SELECT ON forum_feedback_status TO anon, authenticated;