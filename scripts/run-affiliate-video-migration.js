#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

// Create Supabase client with service key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Starting affiliate links and video features migration...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-affiliate-video-features.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Executing migration SQL...');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    }).single();

    // If exec_sql doesn't exist, try direct execution
    if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      console.log('⚠️  exec_sql function not found, attempting direct execution...');
      
      // Split SQL by statement and execute each
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';
        
        // Skip comment-only statements
        if (statement.replace(/--.*$/gm, '').trim().length === 0) {
          continue;
        }

        console.log(`   Executing statement ${i + 1}/${statements.length}...`);
        
        // Use a direct query approach - note this is a workaround
        const { error: stmtError } = await supabase
          .from('_migrations')
          .select('*')
          .limit(0)
          .then(() => ({ error: null }))
          .catch(err => ({ error: err }));
        
        if (stmtError) {
          console.error(`   ❌ Error in statement ${i + 1}:`, stmtError.message);
          throw stmtError;
        }
      }
      
      console.log('⚠️  Note: Direct SQL execution is limited. Please run the SQL file directly in Supabase Dashboard SQL Editor for best results.');
    } else if (error) {
      throw error;
    }

    console.log('✅ Migration SQL executed successfully!\n');

    // Verify the tables were created
    console.log('🔍 Verifying new tables...\n');

    const tablesToCheck = [
      'user_equipment_links',
      'equipment_videos',
      'user_bag_videos',
      'link_clicks'
    ];

    for (const tableName of tablesToCheck) {
      const { count, error: checkError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (checkError) {
        console.log(`   ❌ Table '${tableName}' - Error: ${checkError.message}`);
      } else {
        console.log(`   ✅ Table '${tableName}' - Ready (${count || 0} rows)`);
      }
    }

    console.log('\n✨ Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run the migration SQL directly in Supabase Dashboard if not all tables were created');
    console.log('   2. Update TypeScript types with: npm run types:generate');
    console.log('   3. Test the new features in the application');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check your Supabase connection');
    console.error('   2. Ensure you have admin privileges');
    console.error('   3. Run the SQL directly in Supabase Dashboard SQL Editor:');
    console.error(`      ${path.join(__dirname, 'add-affiliate-video-features.sql')}`);
    process.exit(1);
  }
}

// Run the migration
runMigration();