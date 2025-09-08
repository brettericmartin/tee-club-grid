import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyRLSFix() {
  try {
    console.log('Applying RLS fix for user_bag_videos table...\n');

    // Read the migration SQL
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250907_fix_video_rls.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Migration SQL loaded. Executing...\n');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If the RPC doesn't exist, we'll need to apply it differently
      console.log('Direct SQL execution not available. Applying statements individually...\n');

      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        
        // Since we can't execute arbitrary SQL, we'll need to use Supabase dashboard
        console.log('Statement to execute in Supabase SQL Editor:');
        console.log(statement + ';');
        console.log('---');
      }

      console.log('\n⚠️  Cannot apply RLS policies directly via API.');
      console.log('Please execute the following SQL in your Supabase Dashboard SQL Editor:');
      console.log('\nFile: supabase/migrations/20250907_fix_video_rls.sql');
      console.log('\nOr run: npx supabase db push (if using Supabase CLI)');
      
      return;
    }

    console.log('✅ RLS policies applied successfully!');

    // Test the fix
    console.log('\n=== Testing the fix ===\n');

    // Get a test user
    const { data: users } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(1);

    if (users && users.length > 0) {
      const testUser = users[0];
      console.log('Test user:', testUser.username);

      // Get their bag
      const { data: bags } = await supabase
        .from('user_bags')
        .select('id, name')
        .eq('user_id', testUser.id)
        .limit(1);

      if (bags && bags.length > 0) {
        const testBag = bags[0];
        console.log('Test bag:', testBag.name);

        // Try to insert as the user (simulating client-side insert)
        // Note: We can't actually impersonate a user with service key
        console.log('\n⚠️  Note: Direct user impersonation test not possible with service key.');
        console.log('The fix should now allow users to add videos through the UI.');
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

applyRLSFix();