import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔄 Running shaft/grip foreign key migration...\n');

  try {
    // Read the migration SQL
    const migrationPath = join(__dirname, '../supabase/migrations/add-shaft-grip-foreign-keys.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // Try direct execution if RPC doesn't work
      console.log('RPC failed, trying alternative approach...');
      
      // Check current foreign keys
      const { data: constraints } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name')
        .eq('table_name', 'bag_equipment')
        .eq('constraint_type', 'FOREIGN KEY');
      
      console.log('Current foreign key constraints:', constraints?.map(c => c.constraint_name));
      
      console.log('\n⚠️  Foreign key constraints may need to be added manually.');
      console.log('Run the following SQL in your Supabase SQL editor:');
      console.log('\n' + migrationSQL);
    } else {
      console.log('✅ Migration completed successfully!');
    }

  } catch (error) {
    console.error('Error running migration:', error);
  }
}

runMigration();