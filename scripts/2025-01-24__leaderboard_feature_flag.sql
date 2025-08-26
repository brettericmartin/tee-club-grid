-- Migration: Add leaderboard feature flags and configuration
-- Date: 2025-01-24
-- Purpose: Enable configurable referral leaderboard with privacy controls

-- ============================================================================
-- PART 1: Add leaderboard columns to feature_flags table
-- ============================================================================

-- Add leaderboard configuration columns
ALTER TABLE feature_flags 
ADD COLUMN IF NOT EXISTS leaderboard_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS leaderboard_cache_minutes INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS leaderboard_size INT DEFAULT 10,
ADD COLUMN IF NOT EXISTS leaderboard_show_avatars BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS leaderboard_time_period TEXT DEFAULT '30d' 
  CHECK (leaderboard_time_period IN ('7d', '30d', 'all'));

-- Add privacy configuration
ALTER TABLE feature_flags
ADD COLUMN IF NOT EXISTS leaderboard_privacy_mode TEXT DEFAULT 'username_first'
  CHECK (leaderboard_privacy_mode IN ('username_first', 'name_only', 'anonymous'));

-- ============================================================================
-- PART 2: Create indexes for leaderboard queries
-- ============================================================================

-- Index for efficient leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_referrals_count_active
ON profiles(referrals_count DESC)
WHERE referrals_count > 0 AND deleted_at IS NULL;

-- Index for time-based referral queries
CREATE INDEX IF NOT EXISTS idx_referral_chains_created_at
ON referral_chains(created_at DESC)
WHERE referrer_profile_id IS NOT NULL;

-- ============================================================================
-- PART 3: Create helper function for time-based leaderboard
-- ============================================================================

CREATE OR REPLACE FUNCTION get_referral_leaderboard(
  p_time_period TEXT DEFAULT '30d',
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  profile_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  referral_count BIGINT,
  rank INT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
BEGIN
  -- Calculate start date based on period
  v_start_date := CASE p_time_period
    WHEN '7d' THEN NOW() - INTERVAL '7 days'
    WHEN '30d' THEN NOW() - INTERVAL '30 days'
    ELSE NULL -- All time
  END;
  
  -- Return leaderboard with privacy considerations
  RETURN QUERY
  WITH referral_counts AS (
    SELECT 
      p.id AS profile_id,
      p.username,
      p.display_name,
      p.avatar_url,
      CASE 
        WHEN v_start_date IS NULL THEN p.referrals_count::BIGINT
        ELSE COUNT(rc.id)::BIGINT
      END AS referral_count
    FROM profiles p
    LEFT JOIN referral_chains rc ON rc.referrer_profile_id = p.id
      AND (v_start_date IS NULL OR rc.created_at >= v_start_date)
    WHERE p.deleted_at IS NULL
      AND p.show_referrer = true -- Respect privacy preference
    GROUP BY p.id, p.username, p.display_name, p.avatar_url, p.referrals_count
    HAVING 
      CASE 
        WHEN v_start_date IS NULL THEN p.referrals_count > 0
        ELSE COUNT(rc.id) > 0
      END
  )
  SELECT 
    rc.profile_id,
    rc.username,
    rc.display_name,
    rc.avatar_url,
    rc.referral_count,
    ROW_NUMBER() OVER (ORDER BY rc.referral_count DESC, rc.profile_id)::INT AS rank
  FROM referral_counts rc
  ORDER BY rc.referral_count DESC, rc.profile_id
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- PART 4: Create function to get leaderboard with trends
-- ============================================================================

CREATE OR REPLACE FUNCTION get_referral_leaderboard_with_trends(
  p_time_period TEXT DEFAULT '30d',
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  profile_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  referral_count BIGINT,
  rank INT,
  previous_rank INT,
  trend TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_previous_start_date TIMESTAMPTZ;
  v_previous_end_date TIMESTAMPTZ;
BEGIN
  -- Calculate date ranges
  v_start_date := CASE p_time_period
    WHEN '7d' THEN NOW() - INTERVAL '7 days'
    WHEN '30d' THEN NOW() - INTERVAL '30 days'
    ELSE NULL
  END;
  
  v_previous_end_date := v_start_date;
  v_previous_start_date := CASE p_time_period
    WHEN '7d' THEN v_start_date - INTERVAL '7 days'
    WHEN '30d' THEN v_start_date - INTERVAL '30 days'
    ELSE NULL
  END;
  
  RETURN QUERY
  WITH current_period AS (
    SELECT * FROM get_referral_leaderboard(p_time_period, p_limit * 2)
  ),
  previous_period AS (
    SELECT 
      p.id AS profile_id,
      ROW_NUMBER() OVER (ORDER BY COUNT(rc.id) DESC)::INT AS rank
    FROM profiles p
    LEFT JOIN referral_chains rc ON rc.referrer_profile_id = p.id
      AND rc.created_at >= v_previous_start_date 
      AND rc.created_at < v_previous_end_date
    WHERE p.deleted_at IS NULL
    GROUP BY p.id
    HAVING COUNT(rc.id) > 0
  )
  SELECT 
    cp.profile_id,
    cp.username,
    cp.display_name,
    cp.avatar_url,
    cp.referral_count,
    cp.rank,
    pp.rank AS previous_rank,
    CASE 
      WHEN pp.rank IS NULL THEN 'new'
      WHEN pp.rank > cp.rank THEN 'up'
      WHEN pp.rank < cp.rank THEN 'down'
      ELSE 'same'
    END AS trend
  FROM current_period cp
  LEFT JOIN previous_period pp ON pp.profile_id = cp.profile_id
  WHERE cp.rank <= p_limit
  ORDER BY cp.rank;
END;
$$;

-- ============================================================================
-- PART 5: Grant permissions
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_referral_leaderboard TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_referral_leaderboard_with_trends TO anon, authenticated;

-- ============================================================================
-- PART 6: Update feature flags with default configuration
-- ============================================================================

-- Enable leaderboard by default (can be disabled if needed)
UPDATE feature_flags 
SET 
  leaderboard_enabled = false, -- Start disabled, enable when ready
  leaderboard_cache_minutes = 5,
  leaderboard_size = 10,
  leaderboard_show_avatars = false,
  leaderboard_time_period = '30d',
  leaderboard_privacy_mode = 'username_first'
WHERE id = 1;

-- ============================================================================
-- PART 7: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN feature_flags.leaderboard_enabled IS 
'Enable/disable the referral leaderboard feature globally';

COMMENT ON COLUMN feature_flags.leaderboard_cache_minutes IS 
'How many minutes to cache leaderboard data (reduces database load)';

COMMENT ON COLUMN feature_flags.leaderboard_size IS 
'Maximum number of entries to show on the leaderboard';

COMMENT ON COLUMN feature_flags.leaderboard_show_avatars IS 
'Whether to display user avatars on the leaderboard (privacy consideration)';

COMMENT ON COLUMN feature_flags.leaderboard_time_period IS 
'Default time period for leaderboard: 7d (week), 30d (month), or all (all-time)';

COMMENT ON COLUMN feature_flags.leaderboard_privacy_mode IS 
'Privacy mode: username_first (prefer @username), name_only (display names), anonymous (User #1, #2)';

COMMENT ON FUNCTION get_referral_leaderboard IS 
'Returns the referral leaderboard for a given time period with privacy filtering';

COMMENT ON FUNCTION get_referral_leaderboard_with_trends IS 
'Returns the referral leaderboard with trend indicators comparing to previous period';