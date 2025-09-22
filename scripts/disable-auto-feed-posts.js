import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

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

async function disableAutoFeedPosts() {
  try {
    console.log('Disabling automatic feed post creation from equipment photos...\n');
    
    // First, let's check what triggers exist
    const checkSql = `
      SELECT 
        tgname as trigger_name,
        tgrelid::regclass as table_name,
        pg_get_triggerdef(oid) as trigger_definition
      FROM pg_trigger
      WHERE tgrelid = 'equipment_photos'::regclass
      AND NOT tgisinternal
      ORDER BY tgname;
    `;
    
    console.log('Checking existing triggers on equipment_photos table...');
    
    // Try to get trigger information
    const { data: triggers, error: checkError } = await supabase
      .from('equipment_photos')
      .select('*')
      .limit(0); // Just to test connection
    
    if (checkError) {
      console.error('Error connecting to database:', checkError);
      return;
    }
    
    // Since we can't execute raw SQL directly, we'll need to use Supabase migrations
    console.log('\n⚠️  IMPORTANT: Database triggers can only be modified through Supabase migrations.');
    console.log('\nTo fix the duplicate feed post issue, you need to:');
    console.log('\n1. Go to your Supabase Dashboard');
    console.log('2. Navigate to Database > Triggers');
    console.log('3. Look for any trigger on the "equipment_photos" table');
    console.log('4. Check if any trigger creates feed posts (look for INSERT INTO feed_posts)');
    console.log('5. If found, disable or delete that trigger');
    console.log('\nAlternatively, run this SQL in the SQL Editor:');
    console.log('----------------------------------------');
    
    const sqlCommands = `
-- Check for triggers on equipment_photos
SELECT 
  tgname as trigger_name,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'equipment_photos'::regclass
AND NOT tgisinternal;

-- If you find a trigger that creates feed posts, drop it:
-- DROP TRIGGER IF EXISTS [trigger_name] ON equipment_photos;
`;
    
    console.log(sqlCommands);
    console.log('----------------------------------------\n');
    
    // As a workaround, let's check if we can modify the frontend to prevent the duplicate
    console.log('📝 FRONTEND FIX OPTION:');
    console.log('If you cannot modify the database triggers, we can fix this in the frontend:');
    console.log('1. Remove the createEquipmentPhotoPost() call from SinglePhotoUpload.tsx');
    console.log('2. Let the database trigger handle feed post creation');
    console.log('\nWould you like me to apply the frontend fix instead? (This won\'t require database access)');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
disableAutoFeedPosts();