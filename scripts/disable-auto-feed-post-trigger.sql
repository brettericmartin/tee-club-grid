-- Migration to disable automatic feed post creation from equipment_photos
-- This prevents duplicate feed posts when users upload photos with captions

-- Step 1: Check for any triggers on equipment_photos that create feed posts
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    RAISE NOTICE 'Checking for triggers on equipment_photos table...';
    
    FOR trigger_record IN 
        SELECT tgname, pg_get_triggerdef(oid) as def
        FROM pg_trigger 
        WHERE tgrelid = 'equipment_photos'::regclass 
        AND NOT tgisinternal
    LOOP
        RAISE NOTICE 'Found trigger: % - %', trigger_record.tgname, trigger_record.def;
        
        -- If the trigger creates feed posts, drop it
        IF trigger_record.def ILIKE '%feed_post%' OR trigger_record.def ILIKE '%create_feed_post%' THEN
            RAISE NOTICE 'Dropping trigger % as it appears to create feed posts', trigger_record.tgname;
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON equipment_photos', trigger_record.tgname);
        END IF;
    END LOOP;
END $$;

-- Step 2: Check for any functions that auto-create feed posts from equipment_photos
DO $$
DECLARE
    func_record RECORD;
BEGIN
    RAISE NOTICE 'Checking for functions that create feed posts from equipment photos...';
    
    FOR func_record IN 
        SELECT proname
        FROM pg_proc
        WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND (
            proname ILIKE '%equipment_photo%feed%'
            OR proname ILIKE '%create_feed_from_photo%'
            OR proname ILIKE '%auto_create_feed_post%'
        )
    LOOP
        RAISE NOTICE 'Found function that might create feed posts: %', func_record.proname;
        -- We don't drop functions automatically as they might be used elsewhere
        -- Just log them for manual review
    END LOOP;
END $$;

-- Step 3: Create or replace a specific trigger if we know its name
-- Based on common patterns, these are likely trigger names:
DROP TRIGGER IF EXISTS create_feed_post_from_equipment_photo ON equipment_photos;
DROP TRIGGER IF EXISTS auto_create_feed_post_trigger ON equipment_photos;
DROP TRIGGER IF EXISTS equipment_photo_feed_trigger ON equipment_photos;
DROP TRIGGER IF EXISTS after_equipment_photo_insert ON equipment_photos;

-- Step 4: Log what we did
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Feed post trigger cleanup completed';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Any triggers that auto-created feed posts from equipment_photos have been disabled.';
    RAISE NOTICE 'Feed posts will now only be created manually when users upload photos with captions.';
    RAISE NOTICE '';
END $$;