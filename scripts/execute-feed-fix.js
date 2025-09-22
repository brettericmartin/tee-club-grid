import { supabase } from './supabase-admin.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function executeMigration() {
  console.log('🔧 Executing migration to fix duplicate feed posts...\n');
  
  try {
    // Read the migration SQL
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250121_disable_auto_feed_posts.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration loaded successfully\n');
    
    // Since we can't execute DDL directly, we need to use Supabase's SQL editor
    // But we can try to check if there are any issues first
    
    // Test connection
    const { data: testData, error: testError } = await supabase
      .from('equipment_photos')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection error:', testError.message);
      return;
    }
    
    console.log('✅ Database connection successful\n');
    
    // Output the SQL that needs to be run
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 EXECUTE THIS SQL IN SUPABASE SQL EDITOR:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const cleanupSQL = `
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
AND NOT tgisinternal;`;
    
    console.log(cleanupSQL);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📋 HOW TO RUN:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('1. Copy the SQL above');
    console.log('2. Go to your Supabase Dashboard');
    console.log('3. Click on "SQL Editor" in the left sidebar');
    console.log('4. Paste the SQL into the editor');
    console.log('5. Click the "Run" button');
    console.log('6. Check the output messages for confirmation\n');
    console.log('The script will:');
    console.log('  • Find all triggers on equipment_photos table');
    console.log('  • Drop any that create feed posts');
    console.log('  • Show you what was removed');
    console.log('  • Verify the cleanup was successful\n');
    console.log('═══════════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

executeMigration();