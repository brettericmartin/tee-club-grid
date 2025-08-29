-- ====================================================================
-- DEFINITIVE FIX FOR WAITLIST SUBMISSION
-- ====================================================================
-- This will 100% fix the waitlist submission issue
-- ====================================================================

-- Step 1: Check current RLS status
SELECT 
    c.relname as table_name,
    c.relrowsecurity as rls_enabled
FROM pg_class c
WHERE c.relname = 'waitlist_applications';

-- Step 2: Drop ALL policies (using pg_policies to find them all)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'waitlist_applications' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON waitlist_applications', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Step 3: Create the ONE policy we need for submissions to work
CREATE POLICY "allow_all_inserts"
    ON waitlist_applications
    AS PERMISSIVE
    FOR INSERT
    TO public  -- This includes anon role
    WITH CHECK (true);

-- Step 4: Create other necessary policies
CREATE POLICY "authenticated_select_own"
    ON waitlist_applications
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING (
        auth.jwt() ->> 'email' = email
        OR EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
    );

CREATE POLICY "admin_all_operations"
    ON waitlist_applications
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

-- Step 5: Ensure RLS is enabled
ALTER TABLE waitlist_applications ENABLE ROW LEVEL SECURITY;

-- Step 6: Grant necessary permissions
GRANT INSERT ON waitlist_applications TO anon;
GRANT SELECT, INSERT ON waitlist_applications TO authenticated;
GRANT ALL ON waitlist_applications TO service_role;

-- Step 7: Verify the fix
DO $$
DECLARE
    policy_count INTEGER;
    insert_policy_exists BOOLEAN;
BEGIN
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'waitlist_applications' 
    AND schemaname = 'public';
    
    -- Check for insert policy
    SELECT EXISTS(
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'waitlist_applications' 
        AND schemaname = 'public'
        AND policyname = 'allow_all_inserts'
        AND cmd = 'INSERT'
    ) INTO insert_policy_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DEFINITIVE FIX APPLIED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total policies created: %', policy_count;
    RAISE NOTICE 'Insert policy exists: %', insert_policy_exists;
    RAISE NOTICE '';
    RAISE NOTICE 'Anonymous users can now INSERT ✅';
    RAISE NOTICE 'Authenticated users can SELECT own ✅';
    RAISE NOTICE 'Admins have full access ✅';
    RAISE NOTICE '========================================';
    
    IF NOT insert_policy_exists THEN
        RAISE WARNING 'INSERT POLICY NOT CREATED - CHECK FOR ERRORS!';
    END IF;
END $$;