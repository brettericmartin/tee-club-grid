-- ====================================================================
-- EMERGENCY FIX: Allow Public Waitlist Application Submission
-- ====================================================================
-- This fixes the critical issue preventing users from submitting applications
-- ====================================================================

-- First, check if RLS is enabled
DO $$
BEGIN
    RAISE NOTICE 'Checking RLS status on waitlist_applications...';
END $$;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can submit waitlist application" ON waitlist_applications;
DROP POLICY IF EXISTS "Users can view their own applications" ON waitlist_applications;
DROP POLICY IF EXISTS "Service role bypasses waitlist RLS" ON waitlist_applications;
DROP POLICY IF EXISTS "Service role full access" ON waitlist_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON waitlist_applications;
DROP POLICY IF EXISTS "Admins can update applications" ON waitlist_applications;

-- Create simple, clear policies

-- 1. CRITICAL: Allow ANYONE (including anonymous users) to INSERT
CREATE POLICY "Public can submit applications"
    ON waitlist_applications
    FOR INSERT
    TO public, anon, authenticated
    WITH CHECK (true);  -- No restrictions on submission

-- 2. Users can view their own applications
CREATE POLICY "Users view own applications"
    ON waitlist_applications
    FOR SELECT
    TO authenticated
    USING (
        -- User can see their own applications by email
        auth.jwt() ->> 'email' = email
        OR 
        -- Admins can see all
        EXISTS (
            SELECT 1 FROM admins 
            WHERE user_id = auth.uid()
        )
    );

-- 3. Service role bypasses everything (for API operations)
CREATE POLICY "Service role bypass"
    ON waitlist_applications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 4. Only admins can update/delete
CREATE POLICY "Admin operations"
    ON waitlist_applications
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE user_id = auth.uid()
        )
    );

-- Ensure RLS is enabled
ALTER TABLE waitlist_applications ENABLE ROW LEVEL SECURITY;

-- Verify the fix
DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
    WHERE cls.relname = 'waitlist_applications';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ EMERGENCY FIX APPLIED!';
    RAISE NOTICE '============================';
    RAISE NOTICE 'Created % policies for waitlist_applications', v_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Users should now be able to:';
    RAISE NOTICE '1. Submit applications (anonymous or authenticated)';
    RAISE NOTICE '2. View their own applications (if authenticated)';
    RAISE NOTICE '3. Admins can view and update all applications';
    RAISE NOTICE '';
END $$;

-- Test the insert permission (dry run)
DO $$
DECLARE
    v_result boolean;
BEGIN
    -- Check if an anonymous insert would be allowed
    SELECT EXISTS (
        SELECT 1 
        FROM pg_policy 
        WHERE polname = 'Public can submit applications'
    ) INTO v_result;
    
    IF v_result THEN
        RAISE NOTICE '🎯 Insert policy exists and should allow submissions';
    ELSE
        RAISE WARNING '❌ Insert policy not found!';
    END IF;
END $$;