-- Analytics Tables for Observability System
-- Tracks user events through the waitlist/beta access funnel

-- 1. Create analytics_events table for storing all tracked events
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(100) NOT NULL,
  properties JSONB DEFAULT '{}',
  
  -- Standard fields
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address INET,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Indexing for performance
  INDEX idx_analytics_event_name (event_name),
  INDEX idx_analytics_user_id (user_id),
  INDEX idx_analytics_session_id (session_id),
  INDEX idx_analytics_created_at (created_at DESC)
);

-- 2. Create event_definitions table for documenting events
CREATE TABLE IF NOT EXISTS event_definitions (
  id SERIAL PRIMARY KEY,
  event_name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(50), -- 'waitlist', 'auth', 'engagement', etc.
  required_properties JSONB DEFAULT '[]',
  optional_properties JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Create analytics_funnels table for tracking conversion funnels
CREATE TABLE IF NOT EXISTS analytics_funnels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_name VARCHAR(100) NOT NULL,
  steps JSONB NOT NULL, -- Array of event names in order
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(funnel_name)
);

-- 4. Create analytics_sessions table for session tracking
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id VARCHAR(100) PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMPTZ,
  event_count INTEGER DEFAULT 0,
  properties JSONB DEFAULT '{}',
  
  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_started_at (started_at DESC)
);

-- 5. Create daily aggregates for dashboard performance
CREATE TABLE IF NOT EXISTS analytics_daily_stats (
  date DATE NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  count BIGINT DEFAULT 0,
  unique_users BIGINT DEFAULT 0,
  properties JSONB DEFAULT '{}', -- Store aggregated properties
  
  PRIMARY KEY (date, event_name),
  INDEX idx_daily_stats_date (date DESC)
);

-- 6. Insert standard event definitions
INSERT INTO event_definitions (event_name, description, category, required_properties, optional_properties) VALUES
  -- Waitlist events
  ('waitlist_view', 'User viewed the waitlist page', 'waitlist', 
   '[]'::jsonb, 
   '["source", "referrer"]'::jsonb),
  
  ('waitlist_submit', 'User submitted waitlist form', 'waitlist',
   '["outcome", "score"]'::jsonb,
   '["hasInvite", "role", "city"]'::jsonb),
  
  ('waitlist_approved', 'User was approved for beta access', 'waitlist',
   '["score"]'::jsonb,
   '["email_hash"]'::jsonb),
  
  ('waitlist_pending', 'User placed on waitlist', 'waitlist',
   '["score"]'::jsonb,
   '["position"]'::jsonb),
  
  ('waitlist_at_capacity', 'Beta at capacity when user tried to join', 'waitlist',
   '[]'::jsonb,
   '["spots_filled", "cap"]'::jsonb),
  
  -- Auth/Access events
  ('invite_redeemed', 'User redeemed an invite code', 'auth',
   '["success"]'::jsonb,
   '["code_hash"]'::jsonb),
  
  ('betaguard_blocked', 'User blocked by beta guard', 'auth',
   '["route", "reason"]'::jsonb,
   '[]'::jsonb),
  
  ('betaguard_passed', 'User passed beta guard check', 'auth',
   '["route"]'::jsonb,
   '["has_beta_access"]'::jsonb),
  
  ('beta_summary_view', 'Beta summary banner viewed', 'engagement',
   '[]'::jsonb,
   '["approved", "cap", "remaining", "fill_percentage"]'::jsonb)
ON CONFLICT (event_name) DO UPDATE SET
  updated_at = NOW();

-- 7. Define standard funnels
INSERT INTO analytics_funnels (funnel_name, steps) VALUES
  ('waitlist_conversion', '["waitlist_view", "waitlist_submit", "waitlist_approved"]'::jsonb),
  ('beta_access', '["waitlist_approved", "invite_redeemed", "betaguard_passed"]'::jsonb),
  ('full_journey', '["waitlist_view", "waitlist_submit", "waitlist_approved", "invite_redeemed", "betaguard_passed"]'::jsonb)
ON CONFLICT (funnel_name) DO NOTHING;

-- 8. Create function to track events (server-side)
CREATE OR REPLACE FUNCTION track_analytics_event(
  p_event_name VARCHAR(100),
  p_user_id UUID DEFAULT NULL,
  p_session_id VARCHAR(100) DEFAULT NULL,
  p_properties JSONB DEFAULT '{}',
  p_page_url TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
  v_session_id VARCHAR(100);
BEGIN
  -- Generate session ID if not provided
  v_session_id := COALESCE(p_session_id, gen_random_uuid()::VARCHAR);
  
  -- Insert the event
  INSERT INTO analytics_events (
    event_name,
    user_id,
    session_id,
    properties,
    page_url,
    referrer,
    user_agent,
    ip_address
  ) VALUES (
    p_event_name,
    p_user_id,
    v_session_id,
    p_properties,
    p_page_url,
    p_referrer,
    p_user_agent,
    p_ip_address
  ) RETURNING id INTO v_event_id;
  
  -- Update session if exists
  INSERT INTO analytics_sessions (id, user_id, event_count)
  VALUES (v_session_id, p_user_id, 1)
  ON CONFLICT (id) DO UPDATE SET
    event_count = analytics_sessions.event_count + 1,
    ended_at = NOW();
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to get funnel conversion rates
CREATE OR REPLACE FUNCTION get_funnel_conversion(
  p_funnel_name VARCHAR(100),
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE (
  step_name VARCHAR(100),
  step_index INTEGER,
  event_count BIGINT,
  unique_users BIGINT,
  conversion_rate NUMERIC
) AS $$
DECLARE
  v_steps JSONB;
  v_prev_count BIGINT := NULL;
BEGIN
  -- Get funnel steps
  SELECT steps INTO v_steps
  FROM analytics_funnels
  WHERE funnel_name = p_funnel_name;
  
  IF v_steps IS NULL THEN
    RAISE EXCEPTION 'Funnel % not found', p_funnel_name;
  END IF;
  
  -- Calculate metrics for each step
  RETURN QUERY
  WITH step_data AS (
    SELECT 
      step::TEXT AS step_name,
      (row_number() OVER ())::INTEGER AS step_index,
      COUNT(*) AS event_count,
      COUNT(DISTINCT user_id) AS unique_users
    FROM 
      jsonb_array_elements_text(v_steps) WITH ORDINALITY AS step,
      analytics_events ae
    WHERE 
      ae.event_name = step::TEXT
      AND ae.created_at BETWEEN p_start_date AND p_end_date
    GROUP BY step::TEXT, ordinality
    ORDER BY ordinality
  ),
  with_conversion AS (
    SELECT 
      *,
      CASE 
        WHEN LAG(unique_users) OVER (ORDER BY step_index) IS NULL THEN 100
        ELSE ROUND((unique_users::NUMERIC / NULLIF(FIRST_VALUE(unique_users) OVER (ORDER BY step_index), 0)) * 100, 2)
      END AS conversion_rate
    FROM step_data
  )
  SELECT * FROM with_conversion;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create materialized view for real-time dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_realtime_stats AS
SELECT 
  date_trunc('hour', created_at) AS hour,
  event_name,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(DISTINCT session_id) AS unique_sessions
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY date_trunc('hour', created_at), event_name
ORDER BY hour DESC, event_count DESC;

-- Create index for fast queries
CREATE INDEX IF NOT EXISTS idx_realtime_stats_hour ON analytics_realtime_stats(hour DESC);

-- 11. Create function to refresh materialized view (call via cron)
CREATE OR REPLACE FUNCTION refresh_analytics_stats() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_realtime_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Enable Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_stats ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS policies

-- Only admins can read analytics events
CREATE POLICY "Admins can view analytics events" ON analytics_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Service role can insert events
CREATE POLICY "Service role can insert events" ON analytics_events
  FOR INSERT
  WITH CHECK (true);

-- Users can see their own sessions
CREATE POLICY "Users can view own sessions" ON analytics_sessions
  FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  ));

-- 14. Grant permissions
GRANT EXECUTE ON FUNCTION track_analytics_event TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_funnel_conversion TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_analytics_stats TO service_role;
GRANT SELECT ON analytics_realtime_stats TO authenticated;

-- 15. Add comments for documentation
COMMENT ON TABLE analytics_events IS 'Stores all user interaction events for analytics';
COMMENT ON TABLE event_definitions IS 'Defines valid events and their expected properties';
COMMENT ON TABLE analytics_funnels IS 'Defines conversion funnels to track';
COMMENT ON TABLE analytics_sessions IS 'Tracks user sessions for analytics';
COMMENT ON FUNCTION track_analytics_event IS 'Server-side function to track analytics events';
COMMENT ON FUNCTION get_funnel_conversion IS 'Calculate conversion rates for a defined funnel';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Analytics tables created successfully!';
  RAISE NOTICE '📊 Tables: analytics_events, event_definitions, analytics_funnels, analytics_sessions, analytics_daily_stats';
  RAISE NOTICE '🔧 Functions: track_analytics_event(), get_funnel_conversion(), refresh_analytics_stats()';
  RAISE NOTICE '🔒 RLS policies configured for admin access';
  RAISE NOTICE '📈 Standard events and funnels defined';
END $$;