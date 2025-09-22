import { supabase } from './supabase-admin.js';

async function applyMigration() {
  console.log('🔧 Applying migration to disable automatic feed post creation...\n');
  
  try {
    // Step 1: Check for existing triggers on equipment_photos
    console.log('📋 Checking for existing triggers on equipment_photos table...');
    
    const checkTriggersSQL = `
      SELECT 
        tgname as trigger_name,
        pg_get_triggerdef(oid) as definition
      FROM pg_trigger 
      WHERE tgrelid = 'public.equipment_photos'::regclass 
      AND NOT tgisinternal;
    `;
    
    // Try to execute via RPC if available
    const { data: triggers, error: triggerError } = await supabase.rpc('get_triggers_on_table', {
      table_name: 'equipment_photos'
    }).catch(() => ({ data: null, error: 'RPC not available' }));
    
    if (triggers) {
      console.log('Found triggers:', triggers);
    }
    
    // Step 2: Drop problematic triggers
    console.log('\n🗑️  Dropping any triggers that create feed posts...');
    
    const dropTriggerSQL = `
      DO $$
      DECLARE
          r RECORD;
      BEGIN
          FOR r IN 
              SELECT tgname 
              FROM pg_trigger 
              WHERE tgrelid = 'public.equipment_photos'::regclass 
              AND NOT tgisinternal
          LOOP
              -- Drop any trigger that might create feed posts
              IF r.tgname ILIKE '%feed%' OR 
                 r.tgname IN (
                  'create_feed_post_trigger',
                  'create_feed_post_from_equipment_photo',
                  'auto_create_feed_post',
                  'equipment_photo_to_feed',
                  'after_equipment_photo_insert',
                  'equipment_photo_feed_trigger',
                  'sync_equipment_photo_to_feed'
              ) THEN
                  EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.equipment_photos', r.tgname);
                  RAISE NOTICE 'Dropped trigger: %', r.tgname;
              END IF;
          END LOOP;
      END $$;
    `;
    
    // Since we can't execute raw DDL through the client, let's try a different approach
    // We'll create a function that can be called via RPC
    
    console.log('\n📝 Creating a migration function...');
    
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION disable_auto_feed_triggers()
      RETURNS TEXT AS $$
      DECLARE
          r RECORD;
          dropped_count INTEGER := 0;
          result_text TEXT := '';
      BEGIN
          -- Find and drop triggers
          FOR r IN 
              SELECT tgname 
              FROM pg_trigger 
              WHERE tgrelid = 'public.equipment_photos'::regclass 
              AND NOT tgisinternal
          LOOP
              IF r.tgname ILIKE '%feed%' THEN
                  EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.equipment_photos', r.tgname);
                  dropped_count := dropped_count + 1;
                  result_text := result_text || 'Dropped: ' || r.tgname || '; ';
              END IF;
          END LOOP;
          
          -- Drop orphaned functions
          DROP FUNCTION IF EXISTS create_feed_post_from_equipment_photo() CASCADE;
          DROP FUNCTION IF EXISTS auto_create_equipment_photo_post() CASCADE;
          DROP FUNCTION IF EXISTS sync_equipment_photo_to_feed() CASCADE;
          
          IF dropped_count = 0 THEN
              RETURN 'No feed-related triggers found on equipment_photos table.';
          ELSE
              RETURN 'Migration complete. Dropped ' || dropped_count || ' trigger(s): ' || result_text;
          END IF;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // Try to create and execute the function
    const { error: funcError } = await supabase.rpc('exec_sql', { 
      sql: createFunctionSQL 
    }).catch(() => ({ error: 'Cannot execute SQL via RPC' }));
    
    if (!funcError) {
      // Execute the migration function
      const { data: result, error: execError } = await supabase.rpc('disable_auto_feed_triggers');
      
      if (!execError && result) {
        console.log('✅ Migration successful:', result);
      } else {
        console.log('⚠️  Could not execute migration function automatically.');
      }
    }
    
    // If we can't execute via RPC, provide manual instructions
    console.log('\n📋 MANUAL EXECUTION REQUIRED:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\nPlease run the following SQL in your Supabase SQL Editor:\n');
    
    const manualSQL = `
-- Drop any triggers on equipment_photos that create feed posts
DO $$
DECLARE
    r RECORD;
    dropped_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Checking for feed-related triggers on equipment_photos...';
    
    FOR r IN 
        SELECT tgname, pg_get_triggerdef(oid) as def
        FROM pg_trigger 
        WHERE tgrelid = 'public.equipment_photos'::regclass 
        AND NOT tgisinternal
    LOOP
        RAISE NOTICE 'Found trigger: %', r.tgname;
        
        IF r.tgname ILIKE '%feed%' OR r.def ILIKE '%feed_posts%' THEN
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.equipment_photos', r.tgname);
            dropped_count := dropped_count + 1;
            RAISE NOTICE '  ✓ Dropped trigger: %', r.tgname;
        END IF;
    END LOOP;
    
    -- Drop orphaned functions
    DROP FUNCTION IF EXISTS create_feed_post_from_equipment_photo() CASCADE;
    DROP FUNCTION IF EXISTS auto_create_equipment_photo_post() CASCADE;
    DROP FUNCTION IF EXISTS sync_equipment_photo_to_feed() CASCADE;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE 'Migration complete!';
    RAISE NOTICE 'Dropped % trigger(s) that were creating duplicate feed posts', dropped_count;
    RAISE NOTICE 'Feed posts will now only be created manually with captions';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;`;
    
    console.log(manualSQL);
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('After running this SQL, equipment photos will no longer create');
    console.log('duplicate feed posts. Only the manual post with caption will be created.');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

applyMigration();