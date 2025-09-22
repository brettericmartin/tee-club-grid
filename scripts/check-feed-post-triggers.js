import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root directory
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  process.exit(1);
}

// Create Supabase client with service key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkFeedPostTriggers() {
  try {
    console.log('Checking for triggers that might create feed posts...\n');
    
    // Check triggers on equipment_photos table
    const { data: triggerData, error: triggerError } = await supabase
      .rpc('get_triggers_info', { table_name: 'equipment_photos' });
    
    if (triggerError) {
      // Try a direct SQL query approach
      const { data: triggers, error } = await supabase.rpc('get_all_triggers');
      
      if (error) {
        console.log('Could not fetch triggers via RPC. Checking via raw SQL...\n');
        
        // Execute raw SQL to find triggers
        const sql = `
          SELECT 
            tgname as trigger_name,
            tgrelid::regclass as table_name,
            pg_get_triggerdef(oid) as trigger_definition
          FROM pg_trigger
          WHERE tgrelid IN (
            'equipment_photos'::regclass,
            'feed_posts'::regclass
          )
          AND NOT tgisinternal
          ORDER BY tgrelid::regclass, tgname;
        `;
        
        const { data, error: sqlError } = await supabase.rpc('exec_sql', { query: sql });
        
        if (sqlError) {
          console.error('Error executing SQL:', sqlError);
          
          // Fallback: check for known trigger functions
          console.log('\nChecking for known trigger functions that might create feed posts...\n');
          
          const functionSql = `
            SELECT 
              proname as function_name,
              pg_get_functiondef(oid) as function_definition
            FROM pg_proc
            WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
            AND (
              pg_get_functiondef(oid) ILIKE '%INSERT%INTO%feed_posts%'
              OR proname ILIKE '%feed%post%'
              OR proname ILIKE '%create%post%'
            );
          `;
          
          const { data: funcData, error: funcError } = await supabase.rpc('exec_sql', { query: functionSql });
          
          if (funcError) {
            console.log('Could not execute raw SQL. Please check database triggers manually.');
            console.log('\nManual check instructions:');
            console.log('1. Go to Supabase Dashboard > Database > Functions');
            console.log('2. Look for any functions that insert into feed_posts');
            console.log('3. Check Database > Triggers for triggers on equipment_photos table');
            console.log('4. Look for triggers that might create feed posts automatically');
          } else if (funcData && funcData.length > 0) {
            console.log('Found functions that might create feed posts:');
            funcData.forEach(func => {
              console.log(`\nFunction: ${func.function_name}`);
              console.log('Definition snippet:', func.function_definition.substring(0, 500));
            });
          }
        } else if (data && data.length > 0) {
          console.log('Found triggers on equipment_photos and feed_posts tables:');
          data.forEach(trigger => {
            console.log(`\n${trigger.table_name} - ${trigger.trigger_name}:`);
            console.log(trigger.trigger_definition);
          });
        } else {
          console.log('No triggers found on equipment_photos or feed_posts tables');
        }
      } else if (triggers && triggers.length > 0) {
        console.log('Found triggers in database:');
        triggers.forEach(t => {
          if (t.table_name === 'equipment_photos' || t.table_name === 'feed_posts') {
            console.log(`\n${t.table_name} - ${t.trigger_name}`);
          }
        });
      }
    } else if (triggerData) {
      console.log('Triggers on equipment_photos table:', triggerData);
    }
    
    // Check if there's a trigger creating feed posts from equipment photos
    console.log('\n\nLooking for the specific issue: duplicate feed post creation...\n');
    console.log('The issue appears to be that when uploading equipment photos:');
    console.log('1. SinglePhotoUpload.tsx calls uploadEquipmentPhoto() which inserts into equipment_photos');
    console.log('2. SinglePhotoUpload.tsx then calls createEquipmentPhotoPost() which creates a feed post');
    console.log('3. If there\'s a database trigger that ALSO creates a feed post from equipment_photos inserts,');
    console.log('   that would cause the duplicate.\n');
    
    console.log('SOLUTION: We need to either:');
    console.log('A) Remove the database trigger that auto-creates feed posts from equipment_photos');
    console.log('B) Remove the createEquipmentPhotoPost() call from SinglePhotoUpload.tsx');
    console.log('\nRecommendation: Remove the database trigger (Option A) to keep control in the application layer.');
    
  } catch (error) {
    console.error('Error checking triggers:', error);
  }
}

// Run the check
checkFeedPostTriggers();