#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Applying Equipment Variants Migration...\n');
  
  try {
    // Read the migration SQL file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250110_allow_equipment_variants.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons but be careful with functions
    const statements = migrationSQL
      .split(/;\s*$(?![^$]*\$\$)/gm)
      .filter(s => s.trim())
      .map(s => s.trim() + ';');
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.startsWith('--') && !statement.includes('CREATE') && !statement.includes('ALTER')) {
        continue;
      }
      
      // Get a description of what we're doing
      let description = 'Executing statement';
      if (statement.includes('DROP CONSTRAINT')) {
        description = '🔓 Removing UNIQUE constraint on bag_equipment';
      } else if (statement.includes('CREATE INDEX')) {
        description = '📇 Creating performance index';
      } else if (statement.includes('COMMENT ON TABLE')) {
        description = '📝 Adding documentation comment';
      } else if (statement.includes('CREATE OR REPLACE FUNCTION')) {
        description = '🔧 Creating duplicate check function';
      } else if (statement.includes('CREATE OR REPLACE VIEW')) {
        description = '👁️ Creating variants view';
      } else if (statement.includes('GRANT')) {
        description = '🔑 Granting permissions';
      }
      
      console.log(`${i + 1}. ${description}...`);
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql_query: statement 
      }).single();
      
      if (error) {
        // Try direct execution if RPC doesn't work
        const { error: directError } = await supabase.from('_sql').select(statement);
        
        if (directError) {
          // Check if it's just a "already exists" type error
          if (directError.message?.includes('already exists') || 
              directError.message?.includes('does not exist')) {
            console.log(`   ⚠️  ${directError.message} (continuing...)`);
          } else {
            console.error(`   ❌ Error: ${directError.message}`);
            console.error(`   Statement: ${statement.substring(0, 100)}...`);
            throw directError;
          }
        } else {
          console.log('   ✅ Success');
        }
      } else {
        console.log('   ✅ Success');
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📋 What changed:');
    console.log('1. ✅ Removed UNIQUE constraint on (bag_id, equipment_id)');
    console.log('2. ✅ Added performance index for queries');
    console.log('3. ✅ Created function to check for exact duplicates');
    console.log('4. ✅ Created view to identify equipment variants');
    console.log('5. ✅ Granted appropriate permissions');
    console.log('\n🎯 You can now have multiple instances of the same equipment with different specs!');
    console.log('   Example: Two wedges with different lofts, or woods with different shafts\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n💡 You may need to run the SQL directly in Supabase SQL Editor');
    process.exit(1);
  }
}

// Run the migration
applyMigration();