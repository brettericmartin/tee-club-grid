import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReviewSchema() {
  console.log('📋 Checking equipment_reviews schema...\n');

  try {
    // Get one row to see the columns
    const { data, error } = await supabase
      .from('equipment_reviews')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error:', error.message);
      return;
    }

    if (data && data.length > 0) {
      console.log('Columns in equipment_reviews table:');
      Object.keys(data[0]).forEach(col => {
        console.log(`  - ${col}: ${typeof data[0][col]} (value: ${data[0][col]})`);
      });
    } else {
      console.log('No data in equipment_reviews table, trying different approach...');
      
      // Try to insert and rollback to see required fields
      const { error: insertError } = await supabase
        .from('equipment_reviews')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          equipment_id: '00000000-0000-0000-0000-000000000000',
          rating: 5
        });
      
      if (insertError) {
        console.log('\nFrom error message, detected columns/constraints:');
        console.log(insertError.message);
      }
    }

  } catch (error) {
    console.error('Failed:', error);
  }
}

checkReviewSchema();