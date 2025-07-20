import { supabase } from './supabase-admin.js';

async function setupForumModeration() {
  console.log('Setting up forum moderation tables...\n');

  try {
    console.log('Creating SQL for moderation tables...');
    
    const sql = `
-- Forum Reports Table
CREATE TABLE IF NOT EXISTS forum_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES forum_threads(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'off-topic', 'harassment', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  CHECK ((post_id IS NOT NULL)::int + (thread_id IS NOT NULL)::int = 1)
);

-- User Reputation Table
CREATE TABLE IF NOT EXISTS user_reputation (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  helpful_posts INTEGER DEFAULT 0,
  total_posts INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 0,
  is_moderator BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  muted_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Rate Limiting Table
CREATE TABLE IF NOT EXISTS forum_rate_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('post', 'thread', 'report')),
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Moderation Log
CREATE TABLE IF NOT EXISTS forum_moderation_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  moderator_id UUID REFERENCES profiles(id) NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('lock_thread', 'unlock_thread', 'delete_post', 'mute_user', 'unmute_user', 'review_report')),
  target_type TEXT NOT NULL CHECK (target_type IN ('thread', 'post', 'user', 'report')),
  target_id UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_forum_reports_status ON forum_reports(status);
CREATE INDEX IF NOT EXISTS idx_forum_reports_reporter ON forum_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reputation_user ON user_reputation(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_rate_limits_user_action ON forum_rate_limits(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_forum_moderation_log_moderator ON forum_moderation_log(moderator_id);

-- Enable RLS
ALTER TABLE forum_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_moderation_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forum_reports
CREATE POLICY "Users can create reports" ON forum_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON forum_reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Moderators can view all reports" ON forum_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_reputation 
      WHERE user_id = auth.uid() AND is_moderator = true
    )
  );

CREATE POLICY "Moderators can update reports" ON forum_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_reputation 
      WHERE user_id = auth.uid() AND is_moderator = true
    )
  );

-- RLS Policies for user_reputation
CREATE POLICY "Public can view reputation" ON user_reputation
  FOR SELECT USING (true);

CREATE POLICY "System can manage reputation" ON user_reputation
  FOR ALL USING (false);

-- RLS Policies for forum_rate_limits
CREATE POLICY "System can manage rate limits" ON forum_rate_limits
  FOR ALL USING (false);

-- RLS Policies for moderation_log
CREATE POLICY "Moderators can view logs" ON forum_moderation_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_reputation 
      WHERE user_id = auth.uid() AND is_moderator = true
    )
  );

-- Function to update reputation score
CREATE OR REPLACE FUNCTION calculate_reputation_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.reputation_score = 
    (NEW.helpful_posts * 10) + 
    (NEW.total_posts * 1) - 
    (CASE WHEN NEW.is_muted THEN 50 ELSE 0 END);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update reputation score
CREATE TRIGGER update_reputation_score
  BEFORE INSERT OR UPDATE ON user_reputation
  FOR EACH ROW
  EXECUTE FUNCTION calculate_reputation_score();

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_forum_rate_limit(
  p_user_id UUID,
  p_action_type TEXT,
  p_limit INTEGER,
  p_window_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  v_window_start = NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  SELECT COALESCE(SUM(count), 0) INTO v_count
  FROM forum_rate_limits
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND window_start >= v_window_start;
  
  RETURN v_count < p_limit;
END;
$$ LANGUAGE plpgsql;
`;

    console.log('\n📋 SQL for moderation tables ready!');
    console.log('\nPlease run the following SQL in your Supabase SQL editor:\n');
    console.log(sql);

    console.log('\n✅ Forum moderation setup complete!');
    console.log('\nNext steps:');
    console.log('1. Run the SQL above in your Supabase SQL editor');
    console.log('2. Assign moderators by updating user_reputation.is_moderator');
    console.log('3. Configure rate limits in your application code');
    console.log('4. Implement moderation UI components');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the setup
setupForumModeration();