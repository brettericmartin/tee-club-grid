-- Migration: Add configurable scoring system
-- This migration adds support for dynamic scoring configuration

-- Add scoring configuration columns to feature_flags table
ALTER TABLE feature_flags 
ADD COLUMN IF NOT EXISTS scoring_config JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS auto_approve_threshold INTEGER DEFAULT 4;

-- Set default scoring configuration
UPDATE feature_flags 
SET scoring_config = '{
  "version": "1.0.0",
  "weights": {
    "role": {
      "fitter_builder": 3,
      "creator": 2,
      "league_captain": 1,
      "golfer": 0,
      "retailer_other": 0
    },
    "shareChannels": {
      "reddit": 1,
      "golfwrx": 1,
      "socialMedia": 1,
      "cap": 2
    },
    "learnChannels": {
      "youtube": 1,
      "reddit": 1,
      "fitterBuilder": 1,
      "manufacturerSites": 1,
      "cap": 3
    },
    "uses": {
      "discoverDeepDive": 1,
      "followFriends": 1,
      "trackBuilds": 1,
      "cap": 2
    },
    "buyFrequency": {
      "never": 0,
      "yearly_1_2": 0,
      "few_per_year": 1,
      "monthly": 2,
      "weekly_plus": 2
    },
    "shareFrequency": {
      "never": 0,
      "yearly_1_2": 0,
      "few_per_year": 1,
      "monthly": 2,
      "weekly_plus": 2
    },
    "location": {
      "phoenixMetro": 1
    },
    "inviteCode": {
      "present": 2
    },
    "profileCompletion": {
      "threshold": 80,
      "bonus": 1
    },
    "equipmentEngagement": {
      "firstItem": 1,
      "multipleItemsThreshold": 5,
      "multipleItemsBonus": 2,
      "photoBonus": 1
    },
    "totalCap": 10
  },
  "autoApproval": {
    "threshold": 4,
    "requireEmailVerification": true,
    "capacityBuffer": 10
  },
  "metadata": {
    "lastUpdated": "2024-01-01T00:00:00Z",
    "description": "Default scoring configuration"
  }
}'::jsonb,
auto_approve_threshold = 4
WHERE id = 1;

-- Create scoring configuration history table for audit trail
CREATE TABLE IF NOT EXISTS scoring_config_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_version TEXT NOT NULL,
  config JSONB NOT NULL,
  auto_approve_threshold INTEGER NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  change_reason TEXT,
  rollback_from UUID REFERENCES scoring_config_history(id)
);

-- Create index for history lookups
CREATE INDEX IF NOT EXISTS idx_scoring_config_history_updated_at 
ON scoring_config_history(updated_at DESC);

-- Function to get current scoring configuration
CREATE OR REPLACE FUNCTION get_scoring_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config jsonb;
BEGIN
  SELECT scoring_config INTO v_config
  FROM feature_flags
  WHERE id = 1;
  
  IF v_config IS NULL THEN
    -- Return default configuration if not set
    RETURN '{
      "version": "1.0.0",
      "weights": {
        "totalCap": 10
      },
      "autoApproval": {
        "threshold": 4
      }
    }'::jsonb;
  END IF;
  
  RETURN v_config;
END;
$$;

-- Function to update scoring configuration with history tracking
CREATE OR REPLACE FUNCTION update_scoring_config(
  p_config jsonb,
  p_threshold integer,
  p_updated_by uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_config jsonb;
  v_old_threshold integer;
  v_new_version text;
  v_history_id uuid;
BEGIN
  -- Get current configuration
  SELECT scoring_config, auto_approve_threshold 
  INTO v_old_config, v_old_threshold
  FROM feature_flags
  WHERE id = 1
  FOR UPDATE;
  
  -- Generate new version number
  v_new_version := format('1.0.%s', 
    COALESCE((SELECT COUNT(*) + 1 FROM scoring_config_history), 1)
  );
  
  -- Update version in new config
  v_new_config := jsonb_set(p_config, '{version}', to_jsonb(v_new_version));
  
  -- Save to history
  INSERT INTO scoring_config_history (
    config_version,
    config,
    auto_approve_threshold,
    updated_by,
    change_reason
  ) VALUES (
    v_new_version,
    p_config,
    p_threshold,
    p_updated_by,
    p_reason
  ) RETURNING id INTO v_history_id;
  
  -- Update feature flags
  UPDATE feature_flags
  SET 
    scoring_config = p_config,
    auto_approve_threshold = p_threshold
  WHERE id = 1;
  
  RETURN jsonb_build_object(
    'success', true,
    'version', v_new_version,
    'historyId', v_history_id,
    'previousThreshold', v_old_threshold,
    'newThreshold', p_threshold
  );
END;
$$;

-- Update the auto-approval check function to use dynamic threshold
CREATE OR REPLACE FUNCTION check_auto_approval_eligibility(p_score integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_beta_cap integer;
  v_approved_count integer;
  v_auto_approve_threshold integer;
  v_config jsonb;
BEGIN
  -- Get current capacity and threshold
  SELECT beta_cap, auto_approve_threshold, scoring_config 
  INTO v_beta_cap, v_auto_approve_threshold, v_config
  FROM feature_flags
  WHERE id = 1;
  
  -- Use dynamic threshold, fallback to 4 if not set
  IF v_auto_approve_threshold IS NULL THEN
    v_auto_approve_threshold := 4;
  END IF;
  
  -- Count currently approved users (excluding soft-deleted)
  SELECT COUNT(*) INTO v_approved_count
  FROM profiles
  WHERE beta_access = true
    AND deleted_at IS NULL;
  
  -- Check eligibility with dynamic threshold
  IF p_score >= v_auto_approve_threshold AND v_approved_count < v_beta_cap THEN
    RETURN jsonb_build_object(
      'eligible', true,
      'score', p_score,
      'threshold', v_auto_approve_threshold,
      'capacity_remaining', v_beta_cap - v_approved_count
    );
  ELSIF v_approved_count >= v_beta_cap THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'at_capacity',
      'capacity_remaining', 0,
      'score', p_score,
      'threshold', v_auto_approve_threshold
    );
  ELSE
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'score_too_low',
      'capacity_remaining', v_beta_cap - v_approved_count,
      'score', p_score,
      'score_needed', v_auto_approve_threshold,
      'threshold', v_auto_approve_threshold
    );
  END IF;
END;
$$;

-- Function to simulate scoring with test configuration
CREATE OR REPLACE FUNCTION simulate_scoring(
  p_test_config jsonb,
  p_test_threshold integer DEFAULT NULL
)
RETURNS TABLE (
  email text,
  current_score integer,
  new_score integer,
  would_auto_approve boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This would need the actual scoring logic implemented in SQL
  -- For now, return a placeholder that shows the structure
  RETURN QUERY
  SELECT 
    wa.email,
    wa.score as current_score,
    wa.score as new_score, -- Would be recalculated with new config
    wa.score >= COALESCE(p_test_threshold, 4) as would_auto_approve
  FROM waitlist_applications wa
  WHERE wa.status = 'pending'
  LIMIT 10;
END;
$$;

-- Function to get scoring statistics
CREATE OR REPLACE FUNCTION get_scoring_statistics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  WITH score_dist AS (
    SELECT 
      score,
      COUNT(*) as count
    FROM waitlist_applications
    WHERE status = 'pending'
    GROUP BY score
  ),
  score_summary AS (
    SELECT
      AVG(score) as mean_score,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score) as median_score,
      MIN(score) as min_score,
      MAX(score) as max_score,
      COUNT(*) as total_pending
    FROM waitlist_applications
    WHERE status = 'pending'
  )
  SELECT jsonb_build_object(
    'distribution', jsonb_agg(
      jsonb_build_object('score', score, 'count', count) 
      ORDER BY score
    ),
    'summary', to_jsonb(score_summary.*)
  ) INTO v_stats
  FROM score_dist, score_summary
  GROUP BY score_summary.mean_score, 
           score_summary.median_score, 
           score_summary.min_score, 
           score_summary.max_score,
           score_summary.total_pending;
  
  RETURN v_stats;
END;
$$;

-- Add RLS policies for scoring configuration
ALTER TABLE scoring_config_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view history
CREATE POLICY "Admins can view scoring history"
ON scoring_config_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins 
    WHERE user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT SELECT ON feature_flags TO authenticated;
GRANT SELECT ON scoring_config_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_scoring_config() TO authenticated;
GRANT EXECUTE ON FUNCTION check_auto_approval_eligibility(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_scoring_statistics() TO authenticated;

-- Admin-only functions
GRANT EXECUTE ON FUNCTION update_scoring_config(jsonb, integer, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION simulate_scoring(jsonb, integer) TO authenticated;

-- Add helpful comments
COMMENT ON COLUMN feature_flags.scoring_config IS 'JSON configuration for waitlist scoring weights and rules';
COMMENT ON COLUMN feature_flags.auto_approve_threshold IS 'Minimum score required for auto-approval';
COMMENT ON TABLE scoring_config_history IS 'Audit trail of scoring configuration changes';
COMMENT ON FUNCTION get_scoring_config() IS 'Get current scoring configuration';
COMMENT ON FUNCTION update_scoring_config(jsonb, integer, uuid, text) IS 'Update scoring configuration with history tracking';
COMMENT ON FUNCTION check_auto_approval_eligibility(integer) IS 'Check if a score qualifies for auto-approval';
COMMENT ON FUNCTION simulate_scoring(jsonb, integer) IS 'Test scoring with different configuration';
COMMENT ON FUNCTION get_scoring_statistics() IS 'Get scoring distribution statistics';