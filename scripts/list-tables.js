import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listTables() {
  // List of known tables from your SQL files
  const tables = [
    'user_bags',
    'bag_equipment', 
    'bag_likes',
    'equipment',
    'equipment_photo_likes',
    'feed_posts',
    'likes',
    'profiles',
    'user_follows'
  ];

  console.log('\nSupabase Database Tables:');
  console.log('========================\n');

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`✓ ${table} (${count} rows)`);
      } else {
        console.log(`✗ ${table} (error: ${error.message})`);
      }
    } catch (e) {
      console.log(`✗ ${table} (not accessible)`);
    }
  }
}

listTables();