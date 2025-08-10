import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function diagnoseReviewTable() {
  console.log('🔍 Diagnosing equipment_reviews table...\n');

  try {
    // Try different column names
    const possibleColumns = ['review', 'content', 'comment', 'text', 'description'];
    
    console.log('Testing possible column names:');
    for (const col of possibleColumns) {
      try {
        const { data, error } = await adminClient
          .from('equipment_reviews')
          .select(`id, ${col}`)
          .limit(1);
        
        if (!error) {
          console.log(`✅ Column '${col}' exists!`);
        } else if (error.message.includes('column')) {
          console.log(`❌ Column '${col}' does not exist`);
        }
      } catch (e) {
        console.log(`❌ Column '${col}' - error`);
      }
    }

    // Try to get all columns
    console.log('\nTrying to fetch a row to see all columns:');
    const { data, error } = await adminClient
      .from('equipment_reviews')
      .select('*')
      .limit(1);

    if (!error && data && data.length > 0) {
      console.log('\nActual columns in equipment_reviews:');
      Object.keys(data[0]).forEach(col => {
        console.log(`  - ${col}`);
      });
    } else if (!error && data && data.length === 0) {
      console.log('Table exists but has no data');
      
      // Try a specific query to see the structure
      const { error: structError } = await adminClient
        .from('equipment_reviews')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          equipment_id: '00000000-0000-0000-0000-000000000000',
          rating: 5,
          review: 'test' // Try with 'review' column
        });
      
      if (structError) {
        console.log('\nError details:', structError.message);
      }
    }

  } catch (error) {
    console.error('Failed:', error);
  }
}

diagnoseReviewTable();