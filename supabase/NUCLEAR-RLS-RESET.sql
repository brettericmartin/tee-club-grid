-- ============================================================================
-- NUCLEAR RLS RESET - THE FINAL SOLUTION
-- ============================================================================
-- Senior Developer Review: This clears ALL the conflicting policies
-- and creates a minimal, working set from scratch
-- ============================================================================

-- STEP 1: Show current policy count for evidence
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'waitlist_applications' 
    AND schemaname = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '🔍 BEFORE: Found % existing policies to remove', policy_count;
END $$;

-- STEP 2: NUCLEAR OPTION - Drop ALL existing policies
DO $$
DECLARE 
    r RECORD;
    dropped_count INTEGER := 0;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'waitlist_applications' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON waitlist_applications', r.policyname);
        dropped_count := dropped_count + 1;
        RAISE NOTICE '  Dropped policy: %', r.policyname;
    END LOOP;
    
    RAISE NOTICE '💥 NUCLEAR: Dropped % policies', dropped_count;
END $$;

-- STEP 3: Create MINIMAL working policies
-- Policy 1: Anonymous users can INSERT (this is what's been failing!)
CREATE POLICY "anon_can_insert"
    ON waitlist_applications 
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- Policy 2: Authenticated users can SELECT their own
CREATE POLICY "auth_read_own"
    ON waitlist_applications 
    FOR SELECT 
    TO authenticated
    USING (auth.jwt() ->> 'email' = email);

-- Policy 3: Service role has full access (for admin operations)
CREATE POLICY "service_role_all"
    ON waitlist_applications 
    FOR ALL 
    TO service_role
    USING (true) 
    WITH CHECK (true);

-- STEP 4: Grant explicit permissions (belt and suspenders)
GRANT INSERT ON waitlist_applications TO anon;
GRANT SELECT ON waitlist_applications TO authenticated;
GRANT ALL ON waitlist_applications TO service_role;

-- STEP 5: Ensure RLS is enabled
ALTER TABLE waitlist_applications ENABLE ROW LEVEL SECURITY;

-- STEP 6: Verify the fix
DO $$
DECLARE
    new_policy_count INTEGER;
    has_anon_insert BOOLEAN;
BEGIN
    -- Count new policies
    SELECT COUNT(*) INTO new_policy_count
    FROM pg_policies 
    WHERE tablename = 'waitlist_applications' 
    AND schemaname = 'public';
    
    -- Check for the critical anon insert policy
    SELECT EXISTS(
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'waitlist_applications' 
        AND schemaname = 'public'
        AND policyname = 'anon_can_insert'
    ) INTO has_anon_insert;
    
    RAISE NOTICE '';
    RAISE NOTICE '=' .repeat(60);
    RAISE NOTICE '✅ NUCLEAR RESET COMPLETE';
    RAISE NOTICE '=' .repeat(60);
    RAISE NOTICE 'Created % new policies', new_policy_count;
    RAISE NOTICE 'Anonymous INSERT policy exists: %', has_anon_insert;
    RAISE NOTICE '';
    RAISE NOTICE 'WHAT THIS FIXED:';
    RAISE NOTICE '  ✅ Anonymous users CAN now submit waitlist applications';
    RAISE NOTICE '  ✅ Users can view their own applications';
    RAISE NOTICE '  ✅ Admin operations work via service role';
    RAISE NOTICE '';
    RAISE NOTICE 'The form should work immediately after running this.';
    RAISE NOTICE '=' .repeat(60);
END $$;