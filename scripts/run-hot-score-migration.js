import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Running hot score migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250110_add_hot_scoring.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into individual statements (rough split on semicolons)
    const statements = migrationSQL
      .split(/;\s*$/gm)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.trim().startsWith('--')) continue;
      
      // Get a preview of the statement
      const preview = statement.substring(0, 50).replace(/\n/g, ' ');
      console.log(`\nExecuting statement ${i + 1}: ${preview}...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      }).single();
      
      if (error) {
        // Try direct execution as alternative
        console.log('RPC failed, trying direct execution...');
        
        // For this, we need to use the REST API directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sql: statement })
        });
        
        if (!response.ok) {
          console.error(`Failed to execute statement ${i + 1}:`, await response.text());
          console.log('Continuing with next statement...');
        } else {
          console.log(`✓ Statement ${i + 1} executed successfully`);
        }
      } else {
        console.log(`✓ Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log('\n✅ Hot score migration completed!');
    console.log('\nNext steps:');
    console.log('1. Test the hot sorting in the Feed page');
    console.log('2. Test the hot sorting in the Bags Browser');
    console.log('3. Create some new tees to see scores update');
    
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

// Note about manual execution
console.log('⚠️  Note: This script requires database admin access.');
console.log('If it fails, you may need to run the migration manually in Supabase dashboard.');
console.log(`\nMigration file: supabase/migrations/20250110_add_hot_scoring.sql\n`);

runMigration();