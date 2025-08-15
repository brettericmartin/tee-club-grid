import { promises as fs } from 'fs';
import { supabase } from './supabase-admin.js';

async function runMigration(migrationPath) {
  try {
    console.log(`Reading migration file: ${migrationPath}`);
    const sqlContent = await fs.readFile(migrationPath, 'utf8');
    
    console.log('Executing migration...\n');
    
    // Execute the SQL migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    });
    
    if (error) {
      console.log('⚠️  Direct SQL execution not available via RPC.');
      console.log('\n📋 Please run the following SQL manually in your Supabase SQL editor:\n');
      console.log('='.repeat(60));
      console.log(sqlContent);
      console.log('='.repeat(60));
      console.log('\nSteps to execute:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the SQL above');
      console.log('4. Click "Run" to execute the migration\n');
      return;
    }
    
    console.log('✅ Migration executed successfully!');
    
    if (data && data.length > 0) {
      console.log('\nMigration output:');
      console.log(data);
    }
    
    // Verify the changes by checking the profiles table structure
    console.log('\n📋 Verifying table structure...');
    const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
        AND column_name IN ('username', 'display_name')
        ORDER BY column_name;
      `
    });
    
    if (columnsError) {
      console.error('❌ Error verifying table structure:', columnsError);
    } else {
      console.log('\nProfiles table column information:');
      console.table(columns);
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

// Get migration path from command line argument or use default
const migrationPath = process.argv[2] || 'supabase/migrations/fix-display-name-constraint.sql';

console.log('🚀 Running SQL migration...\n');
runMigration(migrationPath);