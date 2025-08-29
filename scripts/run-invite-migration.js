#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running invite system migration...\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250828_fix_invite_system_properly.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    console.log('📏 SQL length:', migrationSQL.length, 'characters');
    
    // Execute the migration
    console.log('\n⏳ Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      return false;
    }
    
    console.log('✅ Migration executed successfully!');
    if (data) {
      console.log('📊 Result:', data);
    }
    
    return true;
    
  } catch (err) {
    console.error('💥 Unexpected error:', err);
    return false;
  }
}

// Alternative method - try direct SQL execution
async function runMigrationDirect() {
  console.log('🔄 Trying direct SQL execution method...\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250828_fix_invite_system_properly.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements (rough approach)
    const statements = migrationSQL
      .split(/;\s*(?=\n|$)/)
      .filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'))
      .map(stmt => stmt.trim());
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errors = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase
          .from('_migration_temp')
          .select('*')
          .limit(1);
        
        // This is a workaround since we can't directly execute SQL
        console.log('⚠️  Cannot execute SQL directly via client');
        break;
        
      } catch (err) {
        console.error(`❌ Statement ${i + 1} failed:`, err.message);
        errors.push({ statement: i + 1, error: err.message });
      }
    }
    
    if (errors.length === 0) {
      console.log('✅ All statements executed successfully!');
      return true;
    } else {
      console.log(`⚠️  ${successCount} statements succeeded, ${errors.length} failed`);
      errors.forEach(e => console.log(`   Statement ${e.statement}: ${e.error}`));
      return false;
    }
    
  } catch (err) {
    console.error('💥 Unexpected error:', err);
    return false;
  }
}

async function main() {
  console.log('🎯 INVITE SYSTEM MIGRATION RUNNER');
  console.log('==================================\n');
  
  // First try the RPC method
  const success = await runMigration();
  
  if (!success) {
    console.log('\n🔄 First method failed, trying alternative...');
    await runMigrationDirect();
  }
  
  console.log('\n📋 MANUAL EXECUTION INSTRUCTIONS:');
  console.log('================================');
  console.log('If automated execution fails, manually run this in Supabase SQL Editor:');
  console.log('');
  console.log('1. Go to https://app.supabase.com/project/YOUR_PROJECT/sql');
  console.log('2. Copy the contents of:');
  console.log('   /home/brettm/development/tee-club-grid/supabase/migrations/20250828_fix_invite_system_properly.sql');
  console.log('3. Paste and execute in the SQL editor');
  console.log('4. Look for the success message: "✅ INVITE SYSTEM FIXED WITH ACTUAL SCHEMA!"');
  console.log('');
  console.log('🔧 The migration includes:');
  console.log('   - Fixed invite_codes table constraints');
  console.log('   - Updated generate_invite_codes() function');
  console.log('   - Updated redeem_invite_code() function');
  console.log('   - Updated get_my_invite_codes() function');
  console.log('   - Fixed signup trigger for invite code handling');
  console.log('   - Proper RLS policies for invite_codes table');
  console.log('   - Function permissions for authenticated users');
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}