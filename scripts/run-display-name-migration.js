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
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔄 Adding display_name parameter to redeem function\n');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-display-name-to-redeem.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    const { error } = await supabase.rpc('execute_sql', {
      query: sql
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      return;
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('\nUpdated functions:');
    console.log('  - redeem_invite_code_atomic() - Now accepts p_display_name parameter');
    console.log('  - rpc_redeem_invite_code() - Now accepts p_display_name parameter');
    console.log('\nFeatures added:');
    console.log('  - Display names are sanitized when users redeem invite codes');
    console.log('  - Fallback to email local part if no display name provided');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

runMigration().catch(console.error);