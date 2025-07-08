-- Ensure all profiles have usernames

-- Check profiles without usernames
SELECT id, display_name, username, created_at
FROM profiles
WHERE username IS NULL OR username = ''
ORDER BY created_at;

-- Generate usernames for profiles that don't have them
-- Based on display_name or a random string
UPDATE profiles
SET username = LOWER(
  COALESCE(
    -- Try to use display_name, replace spaces with underscores
    REGEXP_REPLACE(display_name, '\s+', '_', 'g'),
    -- Fallback to 'user_' + first 8 chars of ID
    'user_' || SUBSTRING(id::text, 1, 8)
  )
)
WHERE username IS NULL OR username = '';

-- Ensure usernames are unique by appending numbers if needed
WITH duplicates AS (
  SELECT username, COUNT(*) as count
  FROM profiles
  WHERE username IS NOT NULL
  GROUP BY username
  HAVING COUNT(*) > 1
)
UPDATE profiles p
SET username = p.username || '_' || (
  SELECT COUNT(*) 
  FROM profiles p2 
  WHERE p2.username = p.username 
    AND p2.created_at < p.created_at
)
WHERE username IN (SELECT username FROM duplicates);

-- Verify all profiles now have unique usernames
SELECT username, COUNT(*) as count
FROM profiles
GROUP BY username
ORDER BY count DESC, username;