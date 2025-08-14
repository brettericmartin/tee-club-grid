-- Apply fixed reactions to resolved issues in forum
-- This script should be run in the Supabase SQL Editor

-- First ensure the 'fixed' reaction type is available
DO $$ 
BEGIN
  -- Check if the constraint exists and drop it if it does
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'forum_reactions_reaction_type_check'
  ) THEN
    ALTER TABLE forum_reactions DROP CONSTRAINT forum_reactions_reaction_type_check;
  END IF;
  
  -- Add the new constraint with 'fixed' included
  ALTER TABLE forum_reactions 
  ADD CONSTRAINT forum_reactions_reaction_type_check 
  CHECK (reaction_type IN ('tee', 'helpful', 'fire', 'fixed'));
EXCEPTION 
  WHEN OTHERS THEN
    -- Constraint might already exist with fixed type
    NULL;
END $$;

-- Now mark the fixed issues
WITH system_user AS (
  SELECT id 
  FROM profiles 
  WHERE username = 'brett.eric.martin' OR username = 'Brett' OR display_name = 'Brett'
  ORDER BY created_at ASC
  LIMIT 1
),
feedback_category AS (
  SELECT id 
  FROM forum_categories 
  WHERE slug = 'site-feedback'
  LIMIT 1
),
posts_to_mark AS (
  SELECT DISTINCT p.id as post_id, su.id as user_id
  FROM forum_posts p
  CROSS JOIN system_user su
  JOIN forum_threads t ON p.thread_id = t.id
  JOIN feedback_category fc ON t.category_id = fc.id
  WHERE 
    -- Equipment selector issue
    (p.content ILIKE '%equipment%reset%' OR p.content ILIKE '%selector%reset%' OR p.content ILIKE '%input%reset%')
    OR
    -- Display name issue
    (p.content ILIKE '%username%' AND (p.content ILIKE '%display%name%' OR p.content ILIKE '%forum%'))
    OR
    -- Reply button issue
    (p.content ILIKE '%reply%' AND (p.content ILIKE '%button%top%' OR p.content ILIKE '%top%post%'))
    OR
    -- Edit post issue
    (p.content ILIKE '%edit%' AND p.content ILIKE '%post%' AND (p.content ILIKE '%work%' OR p.content ILIKE '%doesn%'))
    OR
    -- Delete post issue
    (p.content ILIKE '%delet%' AND (p.content ILIKE '%comment%' OR p.content ILIKE '%post%'))
    OR
    -- Scroll jump issue
    (p.content ILIKE '%refresh%' AND p.content ILIKE '%jump%') OR (p.content ILIKE '%scroll%' AND p.content ILIKE '%jump%')
    OR
    -- Layout issue
    (p.content ILIKE '%layout%' AND (p.content ILIKE '%doesn%' OR p.content ILIKE '%make%sense%'))
    OR
    -- Reaction button layout
    (p.content ILIKE '%helpful%' AND p.content ILIKE '%hot%' AND p.content ILIKE '%tee%')
)
INSERT INTO forum_reactions (post_id, user_id, reaction_type)
SELECT post_id, user_id, 'fixed'
FROM posts_to_mark
ON CONFLICT (post_id, user_id, reaction_type) DO NOTHING;

-- Add a summary comment to the main feedback thread
WITH system_user AS (
  SELECT id 
  FROM profiles 
  WHERE username = 'brett.eric.martin' OR username = 'Brett' OR display_name = 'Brett'
  ORDER BY created_at ASC
  LIMIT 1
),
feedback_thread AS (
  SELECT t.id
  FROM forum_threads t
  JOIN forum_categories c ON t.category_id = c.id
  WHERE c.slug = 'site-feedback'
  AND t.title ILIKE '%feedback%'
  ORDER BY t.created_at ASC
  LIMIT 1
)
INSERT INTO forum_posts (thread_id, user_id, content)
SELECT 
  ft.id,
  su.id,
  '🎉 **Update: Multiple issues from this thread have been fixed!**

The following issues reported in this thread have been addressed and deployed to production:

✅ **Equipment selector state persistence**
   The equipment selector now remembers your search and filter state when closed and reopened.

✅ **Forum display names**
   The forum now shows display names instead of usernames throughout.

✅ **Reply button placement**
   Added a reply button at the top of each post for easier access.

✅ **Forum scroll position**
   Fixed the scroll jump issue when posting comments - the page now maintains position.

✅ **Edit post functionality**
   You can now edit your own posts using the dropdown menu.

✅ **Delete post functionality**
   You can now delete your own posts with a confirmation dialog.

✅ **Reaction button layout**
   Improved the reaction button layout with a unified, more intuitive design.

All these fixes are now live on the site! Posts mentioning these issues have been marked with the "Fixed" reaction.

Thank you for your valuable feedback - it directly led to these improvements. Please continue to report any issues or suggestions. We''re actively monitoring this thread and implementing changes based on your input.

Keep the feedback coming! 🙏'
FROM feedback_thread ft
CROSS JOIN system_user su
WHERE NOT EXISTS (
  SELECT 1 FROM forum_posts 
  WHERE thread_id = ft.id 
  AND content LIKE '%Update: Multiple issues from this thread have been fixed!%'
);

-- Return summary of what was done
SELECT 
  'Fixed reactions added' as action,
  COUNT(*) as count
FROM forum_reactions
WHERE reaction_type = 'fixed'
AND created_at > NOW() - INTERVAL '5 minutes'
UNION ALL
SELECT 
  'Summary comments added' as action,
  COUNT(*) as count
FROM forum_posts
WHERE content LIKE '%Update: Multiple issues from this thread have been fixed!%'
AND created_at > NOW() - INTERVAL '5 minutes';