import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function applyTeeMigration() {
  console.log('🔧 Applying Tee System Migration...\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250109_fix_tee_system.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('📊 Migration file loaded, applying changes...');
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const statement of statements) {
      try {
        // For CREATE TABLE, ALTER TABLE, CREATE INDEX, CREATE POLICY, etc.
        // we need to execute them directly via SQL
        console.log(`\n📝 Executing: ${statement.substring(0, 50)}...`);
        
        // Use raw SQL execution through Supabase
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';'
        });

        if (error) {
          // If exec_sql doesn't exist, try alternative approach
          if (error.message?.includes('exec_sql')) {
            console.log('⚠️  Direct SQL execution not available, statement will be handled manually');
            errors.push({ statement: statement.substring(0, 100), error: 'Requires manual execution' });
            errorCount++;
          } else {
            throw error;
          }
        } else {
          console.log('✅ Success');
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Error: ${err.message}`);
        errors.push({ statement: statement.substring(0, 100), error: err.message });
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Migration Results:`);
    console.log(`  ✅ Successful statements: ${successCount}`);
    console.log(`  ❌ Failed statements: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  Some statements could not be applied automatically.');
      console.log('These may need to be run manually in Supabase Dashboard SQL Editor:');
      errors.forEach((e, i) => {
        console.log(`\n${i + 1}. ${e.statement}...`);
        console.log(`   Error: ${e.error}`);
      });
      
      console.log('\n📌 To apply manually:');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy the migration file contents and execute');
      console.log(`4. Migration file: ${migrationPath}`);
    } else {
      console.log('\n✅ All migration statements applied successfully!');
    }

    // Test if equipment_photo_likes table was created
    console.log('\n🔍 Verifying equipment_photo_likes table...');
    const { data: testData, error: testError } = await supabase
      .from('equipment_photo_likes')
      .select('id')
      .limit(1);

    if (!testError || testError.code === 'PGRST116') {
      console.log('✅ equipment_photo_likes table exists!');
    } else {
      console.log('⚠️  equipment_photo_likes table may not exist yet');
      console.log('   Please run the migration manually in Supabase Dashboard');
    }

  } catch (error) {
    console.error('❌ Critical error:', error);
    process.exit(1);
  }
}

// Run the migration
applyTeeMigration();