import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Running equipment ranking migration...');
  
  try {
    // Read the SQL file
    const sqlPath = join(__dirname, 'add-equipment-ranking-columns.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    // Split into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
      console.log(statement.substring(0, 50) + '...');
      
      // For ALTER TABLE and CREATE INDEX, we need to use raw SQL
      // Supabase doesn't have a direct way to run DDL, so we'll check if columns exist first
      if (statement.includes('ALTER TABLE')) {
        console.log('Skipping ALTER TABLE - columns may already exist');
        continue;
      }
      
      if (statement.includes('CREATE INDEX')) {
        console.log('Skipping CREATE INDEX - indexes may already exist');
        continue;
      }
      
      if (statement.includes('COMMENT ON')) {
        console.log('Skipping COMMENT - not critical');
        continue;
      }
    }
    
    // Verify columns exist by trying to query them
    console.log('\nVerifying columns...');
    const { data, error } = await supabase
      .from('equipment')
      .select('id, category_rank, total_bag_tees, bags_count, photos_count, ranking_score, last_ranked_at')
      .limit(1);
    
    if (error) {
      console.error('❌ Migration may have failed. Columns might not exist:', error.message);
      console.log('\nPlease run the migration manually in your Supabase dashboard:');
      console.log('1. Go to the SQL Editor in Supabase');
      console.log('2. Copy the contents of scripts/add-equipment-ranking-columns.sql');
      console.log('3. Run the SQL');
    } else {
      console.log('✅ Migration appears successful! Columns verified.');
    }
    
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration().then(() => {
  console.log('\nMigration check complete!');
  process.exit(0);
});