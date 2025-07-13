import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function runMigration() {
  try {
    console.log('Running feed posts migration...\n');
    
    // Check current schema
    const { data: columns, error: schemaError } = await supabase
      .from('feed_posts')
      .select('*')
      .limit(0);
    
    if (schemaError) {
      console.error('Error checking schema:', schemaError);
      return;
    }
    
    console.log('Current feed_posts table exists. Migration SQL needs to be run in Supabase dashboard.');
    console.log('\nPlease run the following SQL in your Supabase SQL editor:\n');
    
    // Read and display SQL
    const sqlPath = path.join(__dirname, '..', 'sql', 'add-equipment-id-to-feed-posts.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(sql);
    
    console.log('\nMigration SQL displayed above. Copy and run in Supabase SQL editor.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

runMigration();