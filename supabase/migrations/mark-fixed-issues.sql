-- Mark fixed issues in the forum feedback thread
-- This script adds 'fixed' reactions to posts that have been addressed
-- Run this in Supabase SQL Editor to mark all the fixed issues

-- Get the user ID to use for marking (first user or specific user)
WITH system_user AS (
  SELECT id 
  FROM profiles 
  WHERE username = 'brett.eric.martin' OR username = 'Brett' OR display_name = 'Brett'
  LIMIT 1
),
-- Get the Site Feedback category
feedback_category AS (
  SELECT id 
  FROM forum_categories 
  WHERE slug = 'site-feedback'
  LIMIT 1
),
-- Get posts that mention fixed issues
posts_to_mark AS (
  SELECT DISTINCT p.id as post_id, su.id as user_id
  FROM forum_posts p
  CROSS JOIN system_user su
  JOIN forum_threads t ON p.thread_id = t.id
  JOIN feedback_category fc ON t.category_id = fc.id
  WHERE 
    -- Equipment selector issue
    (p.content ILIKE '%equipment%reset%' OR p.content ILIKE '%selector%reset%')
    OR
    -- Display name issue
    (p.content ILIKE '%username%' AND p.content ILIKE '%display%name%')
    OR
    -- Reply button issue
    (p.content ILIKE '%reply%button%top%' OR p.content ILIKE '%button%top%post%')
    OR
    -- Edit post issue
    (p.content ILIKE '%edit%post%' AND p.content ILIKE '%work%')
    OR
    -- Delete post issue
    (p.content ILIKE '%delet%comment%' OR p.content ILIKE '%delet%post%')
    OR
    -- Scroll jump issue
    (p.content ILIKE '%refresh%jump%' OR p.content ILIKE '%scroll%jump%')
    OR
    -- Layout issue
    (p.content ILIKE '%layout%' AND p.content ILIKE '%make%sense%')
)
-- Insert fixed reactions for identified posts
INSERT INTO forum_reactions (post_id, user_id, reaction_type)
SELECT post_id, user_id, 'fixed'
FROM posts_to_mark
ON CONFLICT (post_id, user_id, reaction_type) DO NOTHING;

-- Add a summary comment to the main feedback thread
WITH system_user AS (
  SELECT id 
  FROM profiles 
  WHERE username = 'brett.eric.martin' OR username = 'Brett'
  LIMIT 1
),
feedback_thread AS (
  SELECT t.id
  FROM forum_threads t
  JOIN forum_categories c ON t.category_id = c.id
  WHERE c.slug = 'site-feedback'
  AND t.title = 'General Site Feedback'
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
-- Only insert if we haven't already added this comment
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