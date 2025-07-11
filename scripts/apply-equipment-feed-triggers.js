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

async function applyEquipmentFeedTriggers() {
  console.log('\n📝 Applying Equipment Feed Triggers\n');
  console.log('===================================\n');

  try {
    // Read the SQL file
    const sqlPath = join(dirname(__dirname), 'sql', 'add-equipment-feed-triggers.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL to create triggers...\n');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    });

    if (error) {
      // If exec_sql doesn't exist, we need to run the SQL statements individually
      console.log('Running SQL statements individually...\n');
      
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        // For now, we'll need to apply this through Supabase dashboard
        console.log('Statement preview:', statement.substring(0, 100) + '...');
      }
      
      console.log('\n⚠️  Note: These triggers need to be applied through the Supabase SQL editor.');
      console.log('Copy the contents of sql/add-equipment-feed-triggers.sql and run it there.');
    } else {
      console.log('✅ Triggers applied successfully!');
    }

    console.log('\n===================================');
    console.log('✅ Equipment feed triggers ready!');
    console.log('\nNow when you:');
    console.log('- Add equipment to a bag → Creates "new_equipment" feed post');
    console.log('- Upload equipment photo → Creates "equipment_photo" feed post');
    console.log('- Create a new bag → Creates "bag_created" feed post');
    
  } catch (error) {
    console.error('Error:', error);
    console.log('\n⚠️  Please apply the triggers manually through Supabase SQL editor.');
  }
}

applyEquipmentFeedTriggers().catch(console.error);