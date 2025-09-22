-- Migration: Disable automatic feed post creation from equipment_photos
-- Purpose: Prevent duplicate feed posts when users upload photos with captions
-- Date: 2025-01-21

-- Step 1: Drop any triggers on equipment_photos that might create feed posts
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find all triggers on equipment_photos table
    FOR r IN 
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'public.equipment_photos'::regclass 
        AND NOT tgisinternal
    LOOP
        RAISE NOTICE 'Found trigger on equipment_photos: %', r.tgname;
        
        -- Drop any trigger that might create feed posts
        -- Common naming patterns for such triggers
        IF r.tgname IN (
            'create_feed_post_trigger',
            'create_feed_post_from_equipment_photo',
            'auto_create_feed_post',
            'equipment_photo_to_feed',
            'after_equipment_photo_insert',
            'equipment_photo_feed_trigger',
            'sync_equipment_photo_to_feed'
        ) OR r.tgname ILIKE '%feed%' THEN
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.equipment_photos', r.tgname);
            RAISE NOTICE 'Dropped trigger: %', r.tgname;
        END IF;
    END LOOP;
END $$;

-- Step 2: Drop any functions that auto-create feed posts from equipment photos
-- These are functions that might be orphaned after dropping triggers
DROP FUNCTION IF EXISTS create_feed_post_from_equipment_photo() CASCADE;
DROP FUNCTION IF EXISTS auto_create_equipment_photo_post() CASCADE;
DROP FUNCTION IF EXISTS sync_equipment_photo_to_feed() CASCADE;

-- Step 3: Ensure the reverse trigger (feed_posts -> equipment_photos) still exists
-- This is the correct direction: when a feed post is created, it can create equipment_photos
-- We want to keep this trigger as it's working correctly
DO $$
BEGIN
    -- Check if the trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'create_equipment_photos_trigger' 
        AND tgrelid = 'public.feed_posts'::regclass
    ) THEN
        RAISE NOTICE 'The create_equipment_photos_trigger on feed_posts does not exist (this is fine)';
    ELSE
        RAISE NOTICE 'The create_equipment_photos_trigger on feed_posts exists and will be preserved';
    END IF;
END $$;

-- Step 4: Create a comment to document this change
COMMENT ON TABLE public.equipment_photos IS 
'Stores user-uploaded equipment photos. 
IMPORTANT: Feed posts are created manually from the application when photos are uploaded.
There should be NO triggers on this table that auto-create feed posts to prevent duplicates.';

-- Step 5: Verify the migration
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    -- Count remaining triggers on equipment_photos
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger 
    WHERE tgrelid = 'public.equipment_photos'::regclass 
    AND NOT tgisinternal;
    
    RAISE NOTICE '';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Migration completed successfully';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Remaining triggers on equipment_photos: %', trigger_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Feed posts will now only be created when explicitly';
    RAISE NOTICE 'called from the application code (SinglePhotoUpload.tsx)';
    RAISE NOTICE 'This prevents duplicate feed posts.';
    RAISE NOTICE '=======================================================';
END $$;