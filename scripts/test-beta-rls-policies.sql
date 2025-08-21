-- ============================================================================
-- TEST QUERIES FOR BETA ACCESS RLS POLICIES
-- ============================================================================
-- Run these queries after applying the migration to verify the policies work
-- ============================================================================

-- ============================================================================
-- SETUP TEST DATA
-- ============================================================================

-- First, ensure feature_flags table exists and has default values
INSERT INTO feature_flags (id, public_beta_enabled, beta_cap)
VALUES (1, false, 150)
ON CONFLICT (id) DO UPDATE
SET public_beta_enabled = EXCLUDED.public_beta_enabled;

-- Create test users (run as service role or in auth admin)
-- User 1: Has beta access
-- User 2: No beta access
-- User 3: Admin user

-- ============================================================================
-- TEST 1: Public Beta Disabled - User WITHOUT Beta Access
-- ============================================================================

-- Set context to user without beta access
SET LOCAL role TO authenticated;
SET LOCAL auth.uid TO 'user-without-beta-uuid';

-- These should FAIL (permission denied)
-- Try to create a post
INSERT INTO feed_posts (id, user_id, content, type)
VALUES (gen_random_uuid(), 'user-without-beta-uuid', '{"text": "Test post"}', 'status');
-- Expected: ERROR - new row violates row-level security policy

-- Try to create a bag
INSERT INTO user_bags (id, user_id, name)
VALUES (gen_random_uuid(), 'user-without-beta-uuid', 'My Test Bag');
-- Expected: ERROR - new row violates row-level security policy

-- Try to like a post
INSERT INTO feed_likes (user_id, post_id)
VALUES ('user-without-beta-uuid', 'some-post-uuid');
-- Expected: ERROR - new row violates row-level security policy

-- ============================================================================
-- TEST 2: Public Beta Disabled - User WITH Beta Access
-- ============================================================================

-- First, give the user beta access
UPDATE profiles SET beta_access = true WHERE id = 'user-with-beta-uuid';

-- Set context to user with beta access
SET LOCAL role TO authenticated;
SET LOCAL auth.uid TO 'user-with-beta-uuid';

-- These should SUCCEED
-- Try to create a post
INSERT INTO feed_posts (id, user_id, content, type)
VALUES (gen_random_uuid(), 'user-with-beta-uuid', '{"text": "Beta user post"}', 'status');
-- Expected: SUCCESS

-- Try to create a bag
INSERT INTO user_bags (id, user_id, name)
VALUES (gen_random_uuid(), 'user-with-beta-uuid', 'Beta User Bag');
-- Expected: SUCCESS

-- Try to like a post
INSERT INTO feed_likes (user_id, post_id)
VALUES ('user-with-beta-uuid', 'some-post-uuid');
-- Expected: SUCCESS

-- ============================================================================
-- TEST 3: Public Beta ENABLED - User WITHOUT Beta Access
-- ============================================================================

-- Enable public beta
UPDATE feature_flags SET public_beta_enabled = true WHERE id = 1;

-- Set context to user without beta access
SET LOCAL role TO authenticated;
SET LOCAL auth.uid TO 'user-without-beta-uuid';

-- These should now SUCCEED (public beta enabled)
-- Try to create a post
INSERT INTO feed_posts (id, user_id, content, type)
VALUES (gen_random_uuid(), 'user-without-beta-uuid', '{"text": "Public beta post"}', 'status');
-- Expected: SUCCESS

-- Try to create a bag
INSERT INTO user_bags (id, user_id, name)
VALUES (gen_random_uuid(), 'user-without-beta-uuid', 'Public Beta Bag');
-- Expected: SUCCESS

-- ============================================================================
-- TEST 4: Ownership Restrictions (UPDATE/DELETE)
-- ============================================================================

-- Create test data as user 1
SET LOCAL role TO authenticated;
SET LOCAL auth.uid TO 'user-1-uuid';

INSERT INTO feed_posts (id, user_id, content, type)
VALUES ('post-1-uuid', 'user-1-uuid', '{"text": "User 1 post"}', 'status');

-- Try to update as user 2 (should FAIL)
SET LOCAL auth.uid TO 'user-2-uuid';

UPDATE feed_posts 
SET content = '{"text": "Hacked!"}'
WHERE id = 'post-1-uuid';
-- Expected: ERROR - no rows updated (filtered by RLS)

-- Try to delete as user 2 (should FAIL)
DELETE FROM feed_posts WHERE id = 'post-1-uuid';
-- Expected: ERROR - no rows deleted (filtered by RLS)

-- Try to update as owner (should SUCCEED)
SET LOCAL auth.uid TO 'user-1-uuid';

UPDATE feed_posts 
SET content = '{"text": "Updated by owner"}'
WHERE id = 'post-1-uuid';
-- Expected: SUCCESS

-- ============================================================================
-- TEST 5: Private Tables (equipment_saves, equipment_wishlist)
-- ============================================================================

-- User 1 saves equipment
SET LOCAL auth.uid TO 'user-1-uuid';

INSERT INTO equipment_saves (user_id, equipment_id)
VALUES ('user-1-uuid', 'equipment-1-uuid');
-- Expected: SUCCESS

-- User 2 tries to view User 1's saves (should return empty)
SET LOCAL auth.uid TO 'user-2-uuid';

SELECT * FROM equipment_saves WHERE user_id = 'user-1-uuid';
-- Expected: 0 rows (filtered by RLS)

-- User 1 can see their own saves
SET LOCAL auth.uid TO 'user-1-uuid';

SELECT * FROM equipment_saves WHERE user_id = 'user-1-uuid';
-- Expected: 1 row

-- ============================================================================
-- TEST 6: Complex Ownership (bag_equipment via user_bags)
-- ============================================================================

-- User 1 creates a bag and adds equipment
SET LOCAL auth.uid TO 'user-1-uuid';

INSERT INTO user_bags (id, user_id, name)
VALUES ('bag-1-uuid', 'user-1-uuid', 'User 1 Bag');

INSERT INTO bag_equipment (bag_id, equipment_id)
VALUES ('bag-1-uuid', 'equipment-1-uuid');
-- Expected: SUCCESS

-- User 2 tries to add equipment to User 1's bag (should FAIL)
SET LOCAL auth.uid TO 'user-2-uuid';

INSERT INTO bag_equipment (bag_id, equipment_id)
VALUES ('bag-1-uuid', 'equipment-2-uuid');
-- Expected: ERROR - new row violates row-level security policy

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check function execution
SELECT public_beta_enabled();
SELECT user_has_beta_access('user-with-beta-uuid');
SELECT user_has_beta_access('user-without-beta-uuid');

-- List all policies for key tables
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('feed_posts', 'user_bags', 'equipment_saves')
ORDER BY tablename, cmd;

-- Check RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;

-- ============================================================================
-- CLEANUP TEST DATA
-- ============================================================================

-- Reset feature flags
UPDATE feature_flags SET public_beta_enabled = false WHERE id = 1;

-- Delete test data (run as service role)
DELETE FROM feed_posts WHERE user_id IN ('user-1-uuid', 'user-2-uuid', 'user-with-beta-uuid', 'user-without-beta-uuid');
DELETE FROM user_bags WHERE user_id IN ('user-1-uuid', 'user-2-uuid', 'user-with-beta-uuid', 'user-without-beta-uuid');
DELETE FROM equipment_saves WHERE user_id IN ('user-1-uuid', 'user-2-uuid', 'user-with-beta-uuid', 'user-without-beta-uuid');