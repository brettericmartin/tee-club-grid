-- Complete waitlist_applications table setup
-- Run this in Supabase Dashboard SQL Editor

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS waitlist_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  city_region TEXT,
  answers JSONB,
  score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint on email
ALTER TABLE waitlist_applications 
ADD CONSTRAINT waitlist_applications_email_unique UNIQUE (email);

-- Add columns if they don't exist (for existing tables)
ALTER TABLE waitlist_applications 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE waitlist_applications 
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

ALTER TABLE waitlist_applications 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE waitlist_applications 
ADD COLUMN IF NOT EXISTS city_region TEXT;

ALTER TABLE waitlist_applications 
ADD COLUMN IF NOT EXISTS display_name TEXT;

ALTER TABLE waitlist_applications 
ADD COLUMN IF NOT EXISTS answers JSONB;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_status 
ON waitlist_applications(status);

CREATE INDEX IF NOT EXISTS idx_waitlist_score 
ON waitlist_applications(score DESC);

CREATE INDEX IF NOT EXISTS idx_waitlist_created 
ON waitlist_applications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_waitlist_email 
ON waitlist_applications(email);

-- Enable RLS
ALTER TABLE waitlist_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin only access
CREATE POLICY "Waitlist applications admin only" 
ON waitlist_applications FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Create invite_codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  max_uses INTEGER DEFAULT 1,
  uses INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create referral_chains table if it doesn't exist
CREATE TABLE IF NOT EXISTS referral_chains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referred_profile_id UUID REFERENCES profiles(id),
  referrer_profile_id UUID REFERENCES profiles(id),
  depth INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for referral chains
CREATE INDEX IF NOT EXISTS idx_referral_referred 
ON referral_chains(referred_profile_id);

CREATE INDEX IF NOT EXISTS idx_referral_referrer 
ON referral_chains(referrer_profile_id);

-- Create functions for auto-approval
CREATE OR REPLACE FUNCTION check_auto_approval_eligibility(p_score INTEGER)
RETURNS TABLE(eligible BOOLEAN)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN p_score >= 75 THEN true
      ELSE false
    END as eligible;
END;
$$;

CREATE OR REPLACE FUNCTION approve_user_by_email_if_capacity(
  p_email TEXT,
  p_display_name TEXT,
  p_grant_invites BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_beta_cap INTEGER;
  v_current_approved INTEGER;
  v_profile_id UUID;
  v_result JSON;
BEGIN
  -- Get current beta cap
  SELECT beta_cap INTO v_beta_cap
  FROM feature_flags
  WHERE id = 1;
  
  -- Count current approved users (excluding soft-deleted)
  SELECT COUNT(*) INTO v_current_approved
  FROM profiles
  WHERE beta_access = true
  AND deleted_at IS NULL;
  
  -- Check capacity
  IF v_current_approved >= v_beta_cap THEN
    RETURN json_build_object(
      'success', false,
      'message', 'at_capacity'
    );
  END IF;
  
  -- Create or update profile
  INSERT INTO profiles (id, email, display_name, beta_access, invite_quota, invites_sent, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    p_email,
    p_display_name,
    true,
    CASE WHEN p_grant_invites THEN 3 ELSE 0 END,
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) 
  DO UPDATE SET
    beta_access = true,
    display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
    invite_quota = CASE WHEN p_grant_invites THEN GREATEST(profiles.invite_quota, 3) ELSE profiles.invite_quota END,
    updated_at = NOW()
  RETURNING id INTO v_profile_id;
  
  -- Generate referral code if not exists
  UPDATE profiles
  SET referral_code = LOWER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
  WHERE id = v_profile_id
  AND referral_code IS NULL;
  
  RETURN json_build_object(
    'success', true,
    'profile_id', v_profile_id,
    'message', 'approved'
  );
END;
$$;

-- Verify setup
SELECT 
  'waitlist_applications' as table_name,
  COUNT(*) as row_count
FROM waitlist_applications
UNION ALL
SELECT 
  'invite_codes' as table_name,
  COUNT(*) as row_count
FROM invite_codes
UNION ALL
SELECT 
  'referral_chains' as table_name,
  COUNT(*) as row_count
FROM referral_chains;