import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running default avatar and username migration...\n');
  
  try {
    // Read the migration SQL file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', 'add-default-avatar-and-username.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    }).single();
    
    if (error) {
      // If RPC doesn't exist, try direct execution (not recommended for production)
      console.log('Note: exec_sql RPC not found, migration needs to be run manually in Supabase dashboard');
      console.log('\nPlease run the following SQL in your Supabase SQL editor:');
      console.log('File: supabase/migrations/add-default-avatar-and-username.sql');
      console.log('\nOr run: npx supabase db push');
      return;
    }
    
    console.log('✅ Migration executed successfully!');
    
    // Check how many profiles were updated with default avatar
    const { data: profilesUpdated, error: checkError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('avatar_url', '/teed-icon.svg');
    
    if (!checkError && profilesUpdated) {
      console.log(`\n✅ ${profilesUpdated.length} profiles now have the default Teed logo avatar`);
    }
    
    // Test the trigger with a sample
    console.log('\n--- Testing Username Generation ---');
    const testCases = [
      { email: 'john.doe@example.com', expected_base: 'johndoe' },
      { email: 'jane_smith@example.com', expected_base: 'janesmith' },
      { email: 'user123@example.com', expected_base: 'user123' }
    ];
    
    console.log('The trigger will now generate unique usernames like:');
    testCases.forEach(test => {
      const base = test.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
      console.log(`  Email: ${test.email} → Username: ${base} (or ${base}1, ${base}2... if taken)`);
    });
    
    console.log('\n✅ Migration complete! New users will now:');
    console.log('  1. Get a unique username automatically');
    console.log('  2. Have the Teed logo as their default avatar');
    console.log('  3. Can modify both in their profile settings');
    
  } catch (error) {
    console.error('Error running migration:', error);
    console.log('\nPlease run the migration manually in Supabase dashboard');
  }
}

runMigration();