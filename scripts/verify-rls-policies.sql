-- Verify RLS policies for equipment-related tables
-- Run this to see current RLS status and policies

-- Check RLS status for tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('equipment_saves', 'equipment_photo_likes', 'equipment_photos')
ORDER BY tablename;

-- Check existing policies for equipment_saves
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'equipment_saves'
ORDER BY policyname;

-- Check existing policies for equipment_photo_likes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'equipment_photo_likes'
ORDER BY policyname;

-- Check if authenticated role has proper permissions
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name IN ('equipment_saves', 'equipment_photo_likes')
AND grantee IN ('authenticated', 'anon')
ORDER BY table_name, grantee, privilege_type;