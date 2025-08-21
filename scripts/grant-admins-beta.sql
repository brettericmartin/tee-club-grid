-- Grant Beta Access to All Admin Users
-- Run this in Supabase SQL Editor to give all admins beta access

-- Update all admin users to have beta access
UPDATE profiles 
SET 
  beta_access = true,
  invite_quota = CASE 
    WHEN invite_quota IS NULL OR invite_quota < 3 THEN 3 
    ELSE invite_quota 
  END,
  invites_used = COALESCE(invites_used, 0),
  updated_at = NOW()
WHERE is_admin = true;

-- Show the results
SELECT 
  id,
  email,
  username,
  display_name,
  is_admin,
  beta_access,
  invite_quota,
  invites_used
FROM profiles
WHERE is_admin = true;

-- Count how many admins were updated
SELECT 
  COUNT(*) as total_admins,
  SUM(CASE WHEN beta_access = true THEN 1 ELSE 0 END) as admins_with_beta
FROM profiles
WHERE is_admin = true;