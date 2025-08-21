-- Seed initial admin user
-- Replace 'your-email@example.com' with your actual email address

-- Option 1: Insert admin by email
INSERT INTO admins (user_id, notes)
SELECT id, 'Initial admin - system creator'
FROM auth.users
WHERE email = 'your-email@example.com'  -- REPLACE WITH YOUR EMAIL
ON CONFLICT (user_id) DO NOTHING;

-- Option 2: Insert admin by user ID (if you know it)
-- Uncomment and replace with your actual user ID
/*
INSERT INTO admins (user_id, notes)
VALUES (
  'YOUR-USER-UUID-HERE',  -- REPLACE WITH YOUR USER ID
  'Initial admin - system creator'
)
ON CONFLICT (user_id) DO NOTHING;
*/

-- Option 3: Make the first user (with lowest created_at) an admin
-- Uncomment if you want to use this approach
/*
INSERT INTO admins (user_id, notes)
SELECT id, 'Initial admin - first user'
FROM auth.users
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;
*/

-- Verify admin was created
SELECT 
  a.user_id,
  u.email,
  a.created_at,
  a.notes
FROM admins a
JOIN auth.users u ON a.user_id = u.id
ORDER BY a.created_at DESC;