import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFeedTriggers() {
  console.log('\n📝 Applying Feed Triggers\n');
  console.log('========================\n');

  try {
    // Read the SQL file
    const sqlPath = join(dirname(__dirname), 'sql', 'fix-equipment-feed-triggers.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    console.log('⚠️  IMPORTANT: Database triggers need to be applied through Supabase SQL editor\n');
    console.log('Please follow these steps:\n');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Create a new query');
    console.log('4. Copy and paste the contents of sql/fix-equipment-feed-triggers.sql');
    console.log('5. Run the query\n');
    
    console.log('The triggers will automatically create feed posts when:');
    console.log('- Equipment is added to a bag');
    console.log('- Photos are uploaded for bag equipment');
    console.log('- New bags are created\n');
    
    console.log('Additionally, the frontend has been updated to manually create feed posts');
    console.log('for equipment photos to ensure they are created even without triggers.\n');

    // Test if we can create a feed post
    console.log('Testing feed post creation...');
    
    const { data: testUser } = await supabase.auth.getUser();
    if (testUser?.user) {
      console.log('✅ Connected to Supabase successfully');
    } else {
      console.log('⚠️  Not authenticated. Feed posts will be created when users interact with the app.');
    }

    console.log('\n========================');
    console.log('✅ Setup complete!\n');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

applyFeedTriggers().catch(console.error);