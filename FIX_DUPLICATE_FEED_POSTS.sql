-- QUICK FIX: Drop triggers that create duplicate feed posts
-- Run this in Supabase SQL Editor to fix the issue immediately

DO $$
DECLARE
    trigger_record RECORD;
    dropped_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting cleanup of duplicate feed post triggers...';
    
    -- Find ALL triggers on equipment_photos table
    FOR trigger_record IN 
        SELECT tgname, pg_get_triggerdef(oid) as def
        FROM pg_trigger 
        WHERE tgrelid = 'public.equipment_photos'::regclass 
        AND NOT tgisinternal
    LOOP
        RAISE NOTICE 'Found trigger: %', trigger_record.tgname;
        RAISE NOTICE '  Definition: %', trigger_record.def;
        
        -- Drop if it creates feed posts
        IF trigger_record.def ILIKE '%feed_post%' OR 
           trigger_record.def ILIKE '%INSERT%INTO%feed%' OR
           trigger_record.tgname ILIKE '%feed%' THEN
            
            EXECUTE format('DROP TRIGGER %I ON public.equipment_photos', trigger_record.tgname);
            dropped_count := dropped_count + 1;
            RAISE NOTICE '  ✓ DROPPED trigger: %', trigger_record.tgname;
        ELSE
            RAISE NOTICE '  ✓ Keeping trigger: % (not feed-related)', trigger_record.tgname;
        END IF;
    END LOOP;
    
    -- Also drop any orphaned functions
    DROP FUNCTION IF EXISTS create_feed_post_from_equipment_photo() CASCADE;
    DROP FUNCTION IF EXISTS auto_create_equipment_photo_post() CASCADE;
    DROP FUNCTION IF EXISTS sync_equipment_photo_to_feed() CASCADE;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    IF dropped_count > 0 THEN
        RAISE NOTICE '✅ SUCCESS: Dropped % trigger(s) that were creating duplicate feed posts', dropped_count;
        RAISE NOTICE 'Feed posts will now only be created with captions when users upload photos.';
    ELSE
        RAISE NOTICE '✅ No problematic triggers found. The duplicate may be coming from the application code.';
        RAISE NOTICE 'Check that createEquipmentPhotoPost() is not being called twice.';
    END IF;
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- Verify no triggers remain on equipment_photos
SELECT 'Remaining triggers on equipment_photos:' as info;
SELECT tgname as trigger_name, pg_get_triggerdef(oid) as definition
FROM pg_trigger 
WHERE tgrelid = 'public.equipment_photos'::regclass 
AND NOT tgisinternal;