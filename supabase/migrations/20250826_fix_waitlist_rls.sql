-- ====================================================================
-- FIX WAITLIST SUBMISSION RLS ISSUE
-- ====================================================================
-- This fixes the critical issue preventing users from submitting applications
-- ====================================================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "Anyone can submit waitlist application" ON waitlist_applications;
DROP POLICY IF EXISTS "Public can submit applications" ON waitlist_applications;
DROP POLICY IF EXISTS "Users view own applications" ON waitlist_applications;
DROP POLICY IF EXISTS "Service role bypass" ON waitlist_applications;
DROP POLICY IF EXISTS "Admin operations" ON waitlist_applications;
DROP POLICY IF EXISTS "Service role all access" ON waitlist_applications;
DROP POLICY IF EXISTS "Anyone can insert" ON waitlist_applications;
DROP POLICY IF EXISTS "Users can view own" ON waitlist_applications;

-- Create simple, working policies

-- 1. CRITICAL: Allow ANYONE (anon and authenticated) to INSERT applications
CREATE POLICY "Anyone can submit application"
    ON waitlist_applications
    FOR INSERT
    WITH CHECK (true);

-- 2. Users can view their own applications
CREATE POLICY "Users can view own applications"
    ON waitlist_applications
    FOR SELECT
    USING (
        -- Anonymous can't select
        auth.role() = 'authenticated' 
        AND 
        (
            -- User can see their own
            auth.jwt() ->> 'email' = email
            OR
            -- Admins can see all
            EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
        )
    );

-- 3. Only admins can update
CREATE POLICY "Only admins can update"
    ON waitlist_applications
    FOR UPDATE
    USING (
        auth.role() = 'authenticated' 
        AND 
        EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
    )
    WITH CHECK (
        auth.role() = 'authenticated' 
        AND 
        EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
    );

-- 4. Only admins can delete
CREATE POLICY "Only admins can delete"
    ON waitlist_applications
    FOR DELETE
    USING (
        auth.role() = 'authenticated' 
        AND 
        EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
    );

-- Ensure RLS is enabled
ALTER TABLE waitlist_applications ENABLE ROW LEVEL SECURITY;

-- Done
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ WAITLIST RLS FIXED!';
    RAISE NOTICE '========================';
    RAISE NOTICE 'Anonymous users can now submit applications';
    RAISE NOTICE 'Authenticated users can view their own applications';
    RAISE NOTICE 'Admins can view/update/delete all applications';
    RAISE NOTICE '';
END $$;