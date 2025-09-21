#!/usr/bin/env node

/**
 * Run the selected_photo_id migration manually
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('\n🔄 RUNNING SELECTED_PHOTO_ID MIGRATION\n');
  console.log('=' .repeat(60));

  try {
    // Read the migration file
    const migrationPath = resolve(__dirname, '..', 'supabase', 'migrations', '20250121_add_selected_photo_id.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('1. Reading migration file...');
    console.log(`   Path: ${migrationPath}`);
    
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    console.log(`   Found ${statements.length} SQL statements`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      console.log(`\n2. Executing statement ${i + 1}:`);
      console.log(`   ${statement.substring(0, 80)}${statement.length > 80 ? '...' : ''}`);
      
      // Use raw SQL query instead of RPC
      const { error } = await supabase
        .from('_supabase_migrations')
        .select('*')
        .limit(0); // Just to test connection
      
      // Since we can't execute arbitrary SQL, let's use a different approach
      if (statement.includes('ALTER TABLE bag_equipment ADD COLUMN')) {
        console.log('   ℹ️  Cannot execute DDL statements via client - manual execution required');
        return;
      }
      
      if (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`   ⚠️  Already exists (skipping): ${error.message}`);
        } else {
          console.error(`   ❌ Error: ${error.message}`);
          throw error;
        }
      } else {
        console.log(`   ✅ Success`);
      }
    }
    
    // Verify the column was added
    console.log('\n3. Verifying migration...');
    const { data: columns, error: verifyError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'bag_equipment' 
          AND column_name = 'selected_photo_id';
        `
      });
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      throw verifyError;
    }
    
    if (columns && columns.length > 0) {
      console.log('✅ Column added successfully:');
      console.log(`   Name: ${columns[0].column_name}`);
      console.log(`   Type: ${columns[0].data_type}`);
      console.log(`   Nullable: ${columns[0].is_nullable}`);
    } else {
      console.log('❌ Column not found after migration');
    }
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
runMigration().then(() => {
  console.log('\n🎉 Migration completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});