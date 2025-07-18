import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProfileSchema() {
  console.log('🔍 Checking Profile Table Schema');
  console.log('================================\n');

  try {
    // Method 1: Try to fetch a profile with all expected columns
    console.log('1️⃣ Checking which columns exist by querying profiles table...\n');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error querying profiles:', error.message);
      console.log('\nThis might mean:');
      console.log('- The profiles table doesn\'t exist');
      console.log('- You don\'t have permission to read it');
      console.log('- RLS policies are blocking access\n');
    } else if (data && data.length > 0) {
      console.log('✅ Successfully queried profiles table\n');
      console.log('Columns found:');
      const sampleRow = data[0];
      Object.keys(sampleRow).forEach(column => {
        const value = sampleRow[column];
        const type = value === null ? 'null' : typeof value;
        console.log(`  - ${column}: ${type}`);
      });
    } else {
      console.log('⚠️  Profiles table exists but is empty\n');
      console.log('Attempting to detect schema from error messages...\n');
      
      // Try to insert with all fields to see what errors we get
      try {
        await supabase.from('profiles').insert({
          id: '00000000-0000-0000-0000-000000000000',
          username: 'test',
          display_name: 'test',
          avatar_url: 'test',
          handicap: 0,
          home_course: 'test',
          years_playing: 0,
          location: 'test',
          bio: 'test'
        });
      } catch (insertError) {
        // We expect this to fail, but the error might tell us about the schema
        console.log('Schema detection attempt completed');
      }
    }

    // Method 2: Check TypeScript types vs actual schema
    console.log('\n2️⃣ Expected columns from TypeScript types:');
    console.log('  - id: string (UUID)');
    console.log('  - username: string');
    console.log('  - display_name?: string');
    console.log('  - avatar_url?: string');
    console.log('  - handicap?: number');
    console.log('  - home_course?: string');
    console.log('  - years_playing?: number');
    console.log('  - location?: string');
    console.log('  - bio?: string');
    console.log('  - created_at: string');
    console.log('  - updated_at: string');

    // Method 3: Try specific column queries
    console.log('\n3️⃣ Testing specific columns...\n');
    
    const columnsToTest = ['id', 'username', 'display_name', 'avatar_url'];
    
    for (const column of columnsToTest) {
      try {
        const { error } = await supabase
          .from('profiles')
          .select(column)
          .limit(1);
        
        if (error && error.message.includes('does not exist')) {
          console.log(`❌ Column '${column}' does not exist`);
        } else if (error) {
          console.log(`⚠️  Column '${column}' - unclear (${error.message})`);
        } else {
          console.log(`✅ Column '${column}' exists`);
        }
      } catch (e) {
        console.log(`❌ Column '${column}' - error testing`);
      }
    }

    console.log('\n📝 Recommendations:');
    console.log('1. Run sql/fix-profile-system-aligned.sql to ensure schema is correct');
    console.log('2. This script will add any missing columns');
    console.log('3. It will also fix RLS policies and storage settings');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the check
checkProfileSchema();