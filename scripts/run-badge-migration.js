// import './supabase-admin.js'; // Removed due to CommonJS/ESM conflict
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('   Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🏅 Running Badge System Migration');
  console.log('==================================\n');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'sql', 'add-dynamic-badges.sql');
    console.log(`📄 Reading SQL file: ${sqlPath}`);
    
    const sqlContent = await fs.readFile(sqlPath, 'utf-8');
    console.log(`✅ SQL file loaded (${sqlContent.length} characters)\n`);
    
    // Split SQL into individual statements
    // This is a simple split - in production you'd want more robust parsing
    const statements = sqlContent
      .split(/;\s*$/gm)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Get a preview of the statement
      const preview = statement
        .replace(/\s+/g, ' ')
        .substring(0, 80) + (statement.length > 80 ? '...' : '');
      
      process.stdout.write(`[${i + 1}/${statements.length}] ${preview}`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        }).catch(async (rpcError) => {
          // If RPC doesn't exist, try direct query
          const { error } = await supabase.from('badges').select('id').limit(0);
          if (!error) {
            // Tables exist, execute via raw SQL
            // Note: This is a simplified approach - in production use proper migrations
            throw new Error('Direct SQL execution not available - use Supabase dashboard');
          }
          throw rpcError;
        });
        
        if (error) throw error;
        
        console.log(' ✅');
        successCount++;
      } catch (error) {
        console.log(' ❌');
        console.error(`   Error: ${error.message}`);
        errorCount++;
        
        // For certain errors, we might want to continue
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key')) {
          console.log('   (Continuing - non-fatal error)');
        } else if (error.message.includes('Direct SQL execution not available')) {
          console.log('\n\n⚠️  Cannot execute SQL directly via JavaScript');
          console.log('📋 Please run the following SQL in your Supabase dashboard:');
          console.log('   1. Go to https://app.supabase.com');
          console.log('   2. Select your project');
          console.log('   3. Go to SQL Editor');
          console.log('   4. Copy and paste the contents of sql/add-dynamic-badges.sql');
          console.log('   5. Click "Run"\n');
          process.exit(1);
        }
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n✨ Migration completed successfully!');
      
      // Show next steps
      console.log('\n📋 Next Steps:');
      console.log('   1. Test with a single user:');
      console.log('      node scripts/retroactive-badge-check.js --user <user-id> --dry-run');
      console.log('   2. Test with first 10 users:');
      console.log('      node scripts/retroactive-badge-check.js --limit 10 --dry-run');
      console.log('   3. Run for all users:');
      console.log('      node scripts/retroactive-badge-check.js');
    } else {
      console.log('\n⚠️  Migration completed with errors');
      console.log('   Some statements failed - please check the errors above');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Alternative approach - provide SQL for manual execution
async function generateSQL() {
  console.log('\n📋 Generating SQL for manual execution...\n');
  
  try {
    const sqlPath = path.join(__dirname, '..', 'sql', 'add-dynamic-badges.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf-8');
    
    console.log('-- Badge System Migration SQL');
    console.log('-- Run this in your Supabase SQL Editor');
    console.log('-- ' + '='.repeat(50));
    console.log(sqlContent);
    console.log('-- ' + '='.repeat(50));
    console.log('-- End of SQL');
    
  } catch (error) {
    console.error('❌ Error reading SQL file:', error.message);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
Usage: node run-badge-migration.js [options]

Options:
  --generate-sql     Output SQL for manual execution
  --help            Show this help message

Examples:
  # Run migration automatically
  node run-badge-migration.js

  # Generate SQL for manual execution
  node run-badge-migration.js --generate-sql
`);
  process.exit(0);
}

if (args.includes('--generate-sql')) {
  generateSQL();
} else {
  console.log('⚠️  Direct SQL execution via JavaScript is limited in Supabase\n');
  console.log('Option 1: Run the SQL manually in Supabase dashboard');
  console.log('Option 2: Use --generate-sql flag to see the SQL\n');
  generateSQL();
}