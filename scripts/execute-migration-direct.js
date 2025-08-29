#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function executeMigrationDirect() {
  console.log('🎯 EXECUTING INVITE SYSTEM MIGRATION');
  console.log('===================================\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250828_fix_invite_system_properly.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log('📏 SQL length:', migrationSQL.length, 'characters');
    
    // Split the SQL into individual statements, preserving function bodies
    let statements = [];
    let currentStatement = '';
    let inFunction = false;
    let dollarQuoteTag = null;
    
    const lines = migrationSQL.split('\n');
    
    for (const line of lines) {
      // Skip empty lines and comments outside of functions
      if (!inFunction && (line.trim() === '' || line.trim().startsWith('--'))) {
        continue;
      }
      
      currentStatement += line + '\n';
      
      // Check for dollar-quoted strings (function bodies)
      const dollarQuoteMatch = line.match(/\$([A-Za-z0-9_]*)\$/g);
      if (dollarQuoteMatch) {
        for (const match of dollarQuoteMatch) {
          if (!inFunction && !dollarQuoteTag) {
            // Starting a function
            inFunction = true;
            dollarQuoteTag = match;
          } else if (inFunction && match === dollarQuoteTag) {
            // Ending the current function
            inFunction = false;
            dollarQuoteTag = null;
          }
        }
      }
      
      // Check for statement end (semicolon not in function)
      if (!inFunction && line.trim().endsWith(';')) {
        const statement = currentStatement.trim();
        if (statement && !statement.startsWith('--')) {
          statements.push(statement);
        }
        currentStatement = '';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      const statement = currentStatement.trim();
      if (statement && !statement.startsWith('--')) {
        statements.push(statement);
      }
    }
    
    console.log(`📝 Split into ${statements.length} SQL statements\n`);
    
    // Execute each statement
    let successCount = 0;
    const errors = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        // Use rpc to execute raw SQL
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`❌ Statement ${i + 1} failed:`, error.message);
          errors.push({ statement: i + 1, error: error.message });
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
        
      } catch (err) {
        console.error(`💥 Statement ${i + 1} failed:`, err.message);
        errors.push({ statement: i + 1, error: err.message });
      }
      
      // Small delay between statements
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n📊 MIGRATION RESULTS:');
    console.log('=====================');
    console.log(`✅ Successful: ${successCount}/${statements.length}`);
    console.log(`❌ Failed: ${errors.length}/${statements.length}`);
    
    if (errors.length > 0) {
      console.log('\n🚫 ERRORS:');
      errors.forEach(e => {
        console.log(`   Statement ${e.statement}: ${e.error}`);
      });
      
      console.log('\n🔧 MANUAL EXECUTION REQUIRED:');
      console.log('=============================');
      console.log('Please execute the migration manually in Supabase SQL Editor:');
      console.log('1. Go to https://app.supabase.com/project/YOUR_PROJECT/sql');
      console.log('2. Copy and paste the migration file contents');
      console.log('3. Execute in the SQL editor');
      
      return false;
    } else {
      console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
      console.log('====================================');
      console.log('✅ All invite system functions are now properly configured');
      console.log('✅ RLS policies are in place');
      console.log('✅ Permissions are granted');
      
      return true;
    }
    
  } catch (err) {
    console.error('💥 Fatal error:', err);
    return false;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  executeMigrationDirect().then(success => {
    process.exit(success ? 0 : 1);
  });
}