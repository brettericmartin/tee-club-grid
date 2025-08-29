-- ====================================================================
-- FORCE FIX: WAITLIST RLS - NUCLEAR OPTION
-- ====================================================================
-- This will completely reset and fix the waitlist RLS
-- ====================================================================

-- 1. First, disable RLS temporarily to clear everything
ALTER TABLE waitlist_applications DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies (belt and suspenders approach)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'waitlist_applications' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON waitlist_applications', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- 3. Re-enable RLS
ALTER TABLE waitlist_applications ENABLE ROW LEVEL SECURITY;

-- 4. Create ONLY the essential policy for submissions
CREATE POLICY "allow_anon_insert"
    ON waitlist_applications
    FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (true);

-- 5. Create read policy for authenticated users
CREATE POLICY "allow_auth_select"
    ON waitlist_applications
    FOR SELECT
    TO authenticated, service_role
    USING (
        auth.jwt() ->> 'email' = email
        OR EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
    );

-- 6. Create admin update policy
CREATE POLICY "allow_admin_update"
    ON waitlist_applications
    FOR UPDATE
    TO authenticated, service_role
    USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

-- 7. Create admin delete policy
CREATE POLICY "allow_admin_delete"
    ON waitlist_applications
    FOR DELETE
    TO authenticated, service_role
    USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

-- 8. Verify the policies exist
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'waitlist_applications' AND schemaname = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ WAITLIST RLS FORCE FIX COMPLETE!';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Created % policies', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Anonymous users CAN now:';
    RAISE NOTICE '  • Submit waitlist applications';
    RAISE NOTICE '';
    RAISE NOTICE 'Authenticated users CAN:';
    RAISE NOTICE '  • View their own applications';
    RAISE NOTICE '';
    RAISE NOTICE 'Admins CAN:';
    RAISE NOTICE '  • View, update, and delete all applications';
    RAISE NOTICE '====================================';
END $$;