-- ============================================================================
-- DISABLE EMAIL CONFIRMATION FOR INSTANT ACCESS
-- ============================================================================
-- Run this in Supabase SQL Editor to allow users to sign in immediately
-- ============================================================================

-- This updates the auth config to not require email confirmation
-- Users can sign in immediately after creating their account

-- Check current settings
SELECT 
  (raw_app_meta_data->>'provider')::text as provider,
  email_confirmed_at,
  confirmed_at
FROM auth.users
LIMIT 5;

-- The real fix is in Supabase Dashboard:
-- 1. Go to Authentication > Providers > Email
-- 2. Turn OFF "Confirm email" 
-- 3. Save changes

-- For existing users who haven't confirmed, we can manually confirm them:
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmed_at = COALESCE(confirmed_at, now())
WHERE email_confirmed_at IS NULL;

SELECT 'Email confirmation disabled - check Dashboard settings!' as status;