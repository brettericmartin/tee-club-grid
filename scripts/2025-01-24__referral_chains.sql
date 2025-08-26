-- Migration: Create referral chains table for tracking referral relationships
-- Date: 2025-01-24
-- Purpose: Track who referred whom for analytics and attribution

-- ============================================================================
-- PART 1: Create referral_chains table
-- ============================================================================

CREATE TABLE IF NOT EXISTS referral_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  referred_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code TEXT,
  attribution_type TEXT DEFAULT 'signup' CHECK (attribution_type IN ('signup', 'waitlist', 'invite_code')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure each user can only be referred once
  CONSTRAINT unique_referred_profile UNIQUE(referred_profile_id)
);

-- ============================================================================
-- PART 2: Create indexes for performance
-- ============================================================================

-- Index for looking up all users referred by someone
CREATE INDEX IF NOT EXISTS idx_referral_chains_referrer 
ON referral_chains(referrer_profile_id, created_at DESC)
WHERE referrer_profile_id IS NOT NULL;

-- Index for looking up who referred a specific user
CREATE INDEX IF NOT EXISTS idx_referral_chains_referred 
ON referral_chains(referred_profile_id);

-- Index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_referral_chains_code
ON referral_chains(referral_code)
WHERE referral_code IS NOT NULL;

-- ============================================================================
-- PART 3: Add referral tracking columns to profiles if missing
-- ============================================================================

-- Track total successful referrals
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referrals_count INT DEFAULT 0;

-- Track whether user wants their referrer shown publicly
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_referrer BOOLEAN DEFAULT true;

-- ============================================================================
-- PART 4: Function to attribute a referral
-- ============================================================================

CREATE OR REPLACE FUNCTION attribute_referral(
  p_referred_user_id UUID,
  p_referral_code TEXT,
  p_attribution_type TEXT DEFAULT 'signup'
)
RETURNS TABLE (
  success BOOLEAN,
  referrer_id UUID,
  referrer_name TEXT,
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_name TEXT;
  v_existing_chain UUID;
BEGIN
  -- Check if user already has a referrer
  SELECT id INTO v_existing_chain
  FROM referral_chains
  WHERE referred_profile_id = p_referred_user_id;
  
  IF v_existing_chain IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      false::BOOLEAN,
      NULL::UUID,
      NULL::TEXT,
      'User already has a referrer'::TEXT;
    RETURN;
  END IF;
  
  -- Find referrer by code
  SELECT id, COALESCE(display_name, username, email) INTO v_referrer_id, v_referrer_name
  FROM profiles
  WHERE referral_code = UPPER(p_referral_code)
  LIMIT 1;
  
  IF v_referrer_id IS NULL THEN
    RETURN QUERY
    SELECT 
      false::BOOLEAN,
      NULL::UUID,
      NULL::TEXT,
      'Invalid referral code'::TEXT;
    RETURN;
  END IF;
  
  -- Prevent self-referral
  IF v_referrer_id = p_referred_user_id THEN
    RETURN QUERY
    SELECT 
      false::BOOLEAN,
      NULL::UUID,
      NULL::TEXT,
      'Cannot refer yourself'::TEXT;
    RETURN;
  END IF;
  
  -- Create referral chain entry
  INSERT INTO referral_chains (
    referrer_profile_id,
    referred_profile_id,
    referral_code,
    attribution_type
  ) VALUES (
    v_referrer_id,
    p_referred_user_id,
    UPPER(p_referral_code),
    p_attribution_type
  );
  
  -- Update referrer's stats
  UPDATE profiles
  SET 
    referrals_count = COALESCE(referrals_count, 0) + 1,
    invites_used = CASE 
      WHEN invites_used < invite_quota THEN COALESCE(invites_used, 0) + 1
      ELSE invites_used
    END
  WHERE id = v_referrer_id;
  
  -- Grant bonus invite to referrer (optional reward)
  UPDATE profiles
  SET invite_quota = COALESCE(invite_quota, 3) + 1
  WHERE id = v_referrer_id
    AND referrals_count % 3 = 0; -- Bonus invite every 3 referrals
  
  RETURN QUERY
  SELECT 
    true::BOOLEAN,
    v_referrer_id,
    v_referrer_name,
    'Referral attributed successfully'::TEXT;
END;
$$;

-- ============================================================================
-- PART 5: Function to get referral stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_referral_stats()
RETURNS TABLE (
  total_referrals BIGINT,
  unique_referrers BIGINT,
  avg_chain_depth NUMERIC,
  top_referrer_id UUID,
  top_referrer_name TEXT,
  top_referrer_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT COUNT(*) as total_refs,
           COUNT(DISTINCT referrer_profile_id) as unique_refs
    FROM referral_chains
    WHERE referrer_profile_id IS NOT NULL
  ),
  top_referrer AS (
    SELECT 
      rc.referrer_profile_id,
      p.display_name,
      p.username,
      COUNT(*) as ref_count
    FROM referral_chains rc
    JOIN profiles p ON p.id = rc.referrer_profile_id
    WHERE rc.referrer_profile_id IS NOT NULL
    GROUP BY rc.referrer_profile_id, p.display_name, p.username
    ORDER BY ref_count DESC
    LIMIT 1
  )
  SELECT 
    stats.total_refs,
    stats.unique_refs,
    ROUND(CASE 
      WHEN stats.unique_refs > 0 
      THEN stats.total_refs::NUMERIC / stats.unique_refs::NUMERIC 
      ELSE 0 
    END, 2),
    top_referrer.referrer_profile_id,
    COALESCE(top_referrer.display_name, top_referrer.username),
    top_referrer.ref_count
  FROM stats
  LEFT JOIN top_referrer ON true;
END;
$$;

-- ============================================================================
-- PART 6: RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE referral_chains ENABLE ROW LEVEL SECURITY;

-- Users can see their own referral relationships
CREATE POLICY "Users can view own referral chain"
ON referral_chains FOR SELECT
TO authenticated
USING (
  referred_profile_id = auth.uid() OR 
  referrer_profile_id = auth.uid()
);

-- Service role can manage all referral chains
CREATE POLICY "Service role full access"
ON referral_chains FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- PART 7: Migrate existing referral data
-- ============================================================================

-- If there are existing waitlist applications with referred_by, migrate them
INSERT INTO referral_chains (
  referrer_profile_id,
  referred_profile_id,
  attribution_type,
  created_at
)
SELECT 
  wa.referred_by,
  p.id,
  'waitlist',
  wa.created_at
FROM waitlist_applications wa
JOIN profiles p ON LOWER(p.email) = LOWER(wa.email)
WHERE wa.referred_by IS NOT NULL
  AND wa.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM referral_chains rc 
    WHERE rc.referred_profile_id = p.id
  );

-- Update referrals_count for existing referrers
UPDATE profiles p
SET referrals_count = (
  SELECT COUNT(*) 
  FROM referral_chains rc 
  WHERE rc.referrer_profile_id = p.id
)
WHERE EXISTS (
  SELECT 1 FROM referral_chains rc 
  WHERE rc.referrer_profile_id = p.id
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_chain_count INTEGER;
  v_profiles_with_referrals INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_chain_count FROM referral_chains;
  SELECT COUNT(*) INTO v_profiles_with_referrals 
  FROM profiles WHERE referrals_count > 0;
  
  RAISE NOTICE '=== Referral Chains Migration Complete ===';
  RAISE NOTICE 'Total referral chains: %', v_chain_count;
  RAISE NOTICE 'Profiles with referrals: %', v_profiles_with_referrals;
  
  -- Test the attribution function
  RAISE NOTICE 'Attribution function created: attribute_referral()';
  RAISE NOTICE 'Stats function created: get_referral_stats()';
END;
$$;

-- ============================================================================
-- NOTES:
-- 1. This migration creates a referral tracking system
-- 2. Each user can only be referred once (enforced by unique constraint)
-- 3. Referrers get bonus invites every 3 successful referrals
-- 4. Privacy control via show_referrer column
-- 5. RLS policies ensure users can only see their own chains
-- ============================================================================