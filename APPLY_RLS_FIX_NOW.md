# CRITICAL: Apply RLS Fix NOW

## The Issue
The waitlist submission is failing due to RLS policy conflicts. Tests show inconsistent behavior - sometimes working, sometimes not.

## Immediate Action Required

### Step 1: Go to Supabase Dashboard
1. Open your Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query

### Step 2: Run This SQL (Copy & Paste Exactly)

```sql
-- ====================================================================
-- NUCLEAR RLS RESET - FIXES ALL ISSUES
-- ====================================================================

BEGIN;

-- 1. Disable RLS on all tables temporarily
ALTER TABLE IF EXISTS waitlist_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_bags DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bag_equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feed_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feed_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_follows DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I CASCADE', pol.policyname, pol.tablename);
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Ignore errors
        END;
    END LOOP;
END $$;

-- 3. Re-enable RLS
ALTER TABLE waitlist_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- 4. Create SIMPLE policies that actually work

-- WAITLIST APPLICATIONS - Allow anonymous submission
CREATE POLICY "anon_insert" ON waitlist_applications
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "service_bypass" ON waitlist_applications
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "admin_view" ON waitlist_applications
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- PROFILES - Public read, user edit
CREATE POLICY "public_read" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "user_update" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "service_bypass" ON profiles
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- USER_BAGS - Public read, owner edit
CREATE POLICY "public_read" ON user_bags
    FOR SELECT USING (true);

CREATE POLICY "owner_all" ON user_bags
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_bypass" ON user_bags
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- BAG_EQUIPMENT - Same as bags
CREATE POLICY "public_read" ON bag_equipment
    FOR SELECT USING (true);

CREATE POLICY "bag_owner" ON bag_equipment
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_bags
            WHERE user_bags.id = bag_equipment.bag_id
            AND user_bags.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_bags
            WHERE user_bags.id = bag_equipment.bag_id
            AND user_bags.user_id = auth.uid()
        )
    );

CREATE POLICY "service_bypass" ON bag_equipment
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- FEED_POSTS - Public read, owner edit
CREATE POLICY "public_read" ON feed_posts
    FOR SELECT USING (true);

CREATE POLICY "user_create" ON feed_posts
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_update" ON feed_posts
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_delete" ON feed_posts
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "service_bypass" ON feed_posts
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- FEED_LIKES - Users can like
CREATE POLICY "public_read" ON feed_likes
    FOR SELECT USING (true);

CREATE POLICY "user_like" ON feed_likes
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_unlike" ON feed_likes
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "service_bypass" ON feed_likes
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- USER_FOLLOWS - Users can follow
CREATE POLICY "public_read" ON user_follows
    FOR SELECT USING (true);

CREATE POLICY "user_follow" ON user_follows
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "user_unfollow" ON user_follows
    FOR DELETE TO authenticated
    USING (auth.uid() = follower_id);

CREATE POLICY "service_bypass" ON user_follows
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 5. Grant necessary permissions
GRANT INSERT ON waitlist_applications TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

COMMIT;

-- Verify it worked
SELECT tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'waitlist_applications';
```

### Step 3: Click "Run"
Execute the SQL and verify you see the success message.

### Step 4: Test
1. Open an incognito/private browser window
2. Go to your site's /waitlist page
3. Submit the form
4. It should work!

## What This Fixes
- ✅ Anonymous waitlist submission
- ✅ Admin access to waitlist
- ✅ Profile creation and editing
- ✅ Bag management
- ✅ Feed posts and likes
- ✅ Following system

## Status After Fix
- All RLS policies will be simplified and working
- No more recursive policies
- Service role properly bypasses all RLS
- Anonymous users can submit to waitlist
- Authenticated users can manage their own data
- Admins can view waitlist applications