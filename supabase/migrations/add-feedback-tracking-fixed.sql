-- Add 'fixed' reaction type to forum_reactions if not already present
DO $$ 
BEGIN
  -- Check if the constraint exists and drop it if it does
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'forum_reactions_reaction_type_check'
  ) THEN
    ALTER TABLE forum_reactions DROP CONSTRAINT forum_reactions_reaction_type_check;
  END IF;
  
  -- Add the new constraint with 'fixed' included
  ALTER TABLE forum_reactions 
  ADD CONSTRAINT forum_reactions_reaction_type_check 
  CHECK (reaction_type IN ('tee', 'helpful', 'fire', 'fixed'));
END $$;

-- Create feedback_tracking table for tracking fixes
CREATE TABLE IF NOT EXISTS feedback_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  issue_type TEXT CHECK (issue_type IN ('bug', 'feature', 'improvement', 'other')),
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'fixed', 'wont_fix', 'duplicate')),
  assigned_to UUID REFERENCES profiles(id),
  fixed_date TIMESTAMPTZ,
  pr_url TEXT,
  implementation_notes TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(thread_id)
);

-- Create feedback_sessions table for tracking batch processing
CREATE TABLE IF NOT EXISTS feedback_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  branch_name TEXT,
  items_processed INTEGER DEFAULT 0,
  items_fixed INTEGER DEFAULT 0,
  pr_url TEXT,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  notes TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create view for forum feedback status
CREATE OR REPLACE VIEW forum_feedback_status AS
SELECT 
  t.id,
  t.title,
  t.slug,
  t.created_at,
  t.user_id,
  c.slug as category_slug,
  c.name as category_name,
  ft.status,
  ft.priority,
  ft.issue_type,
  ft.fixed_date,
  ft.pr_url,
  ft.session_id,
  COUNT(DISTINCT p.id) as post_count,
  COUNT(DISTINCT CASE WHEN r.reaction_type = 'tee' THEN r.id END) as tee_count,
  COUNT(DISTINCT CASE WHEN r.reaction_type = 'helpful' THEN r.id END) as helpful_count,
  COUNT(DISTINCT CASE WHEN r.reaction_type = 'fixed' THEN r.id END) as fixed_count
FROM forum_threads t
LEFT JOIN forum_categories c ON t.category_id = c.id
LEFT JOIN forum_posts p ON p.thread_id = t.id
LEFT JOIN forum_reactions r ON r.post_id = p.id
LEFT JOIN feedback_tracking ft ON ft.thread_id = t.id
WHERE c.slug = 'site-feedback'
GROUP BY t.id, t.title, t.slug, t.created_at, t.user_id, 
         c.slug, c.name, ft.status, ft.priority, ft.issue_type, 
         ft.fixed_date, ft.pr_url, ft.session_id;

-- Add RLS policies for feedback_tracking (simplified without is_admin check)
ALTER TABLE feedback_tracking ENABLE ROW LEVEL SECURITY;

-- Anyone can view feedback tracking
CREATE POLICY "Anyone can view feedback tracking" 
  ON feedback_tracking FOR SELECT 
  USING (true);

-- Only authenticated users can update (you can restrict this further if needed)
CREATE POLICY "Authenticated users can update feedback tracking" 
  ON feedback_tracking FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- Only authenticated users can insert
CREATE POLICY "Authenticated users can insert feedback tracking" 
  ON feedback_tracking FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add RLS policies for feedback_sessions
ALTER TABLE feedback_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can view feedback sessions
CREATE POLICY "Anyone can view feedback sessions" 
  ON feedback_sessions FOR SELECT 
  USING (true);

-- Only authenticated users can manage sessions
CREATE POLICY "Authenticated users can manage feedback sessions" 
  ON feedback_sessions FOR ALL 
  USING (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_tracking_thread_id ON feedback_tracking(thread_id);
CREATE INDEX IF NOT EXISTS idx_feedback_tracking_status ON feedback_tracking(status);
CREATE INDEX IF NOT EXISTS idx_feedback_tracking_session_id ON feedback_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_sessions_session_id ON feedback_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_sessions_status ON feedback_sessions(status);

-- Update trigger for feedback_tracking
CREATE OR REPLACE FUNCTION update_feedback_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feedback_tracking_updated_at
BEFORE UPDATE ON feedback_tracking
FOR EACH ROW
EXECUTE FUNCTION update_feedback_tracking_updated_at();