-- Check if feed posts are being created
SELECT 
  fp.*,
  p.username,
  p.full_name
FROM feed_posts fp
JOIN profiles p ON fp.user_id = p.id
ORDER BY fp.created_at DESC
LIMIT 20;

-- Check the count of posts by type
SELECT 
  type,
  COUNT(*) as count
FROM feed_posts
GROUP BY type
ORDER BY count DESC;

-- Check for recent equipment additions
SELECT 
  fp.*,
  p.username,
  p.full_name
FROM feed_posts fp
JOIN profiles p ON fp.user_id = p.id
WHERE fp.type = 'new_equipment'
ORDER BY fp.created_at DESC
LIMIT 10;