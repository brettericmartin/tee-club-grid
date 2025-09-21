import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './supabase-admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const sqlFile = process.argv[2];
  
  if (!sqlFile) {
    console.error('Usage: node scripts/run-sql-migration.js <sql-file-path>');
    process.exit(1);
  }

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, '..', sqlFile);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log(`Running migration from: ${sqlFile}`);
    console.log('SQL content:', sql.substring(0, 200) + '...\n');
    
    // Execute SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Try direct query as fallback
      const { error: directError } = await supabase.from('feed_posts').select('id').limit(1);
      
      if (directError) {
        console.error('Migration failed:', error);
        process.exit(1);
      }
      
      // If direct query works, the migration might need to be run differently
      console.log('Note: Direct RPC failed, but table access works. Migration may need manual execution.');
      console.log('\nPlease run this SQL manually in Supabase SQL editor:');
      console.log(sql);
    } else {
      console.log('Migration completed successfully!');
    }
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

runMigration();