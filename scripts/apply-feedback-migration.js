#!/usr/bin/env node

/**
 * Apply the feedback tracking migration to the database
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('📦 Applying feedback tracking migration...\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'add-feedback-tracking.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    // Split by semicolons but be careful with functions
    const statements = migrationSQL
      .split(/;(?=\s*(?:--|CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|GRANT|$))/gi)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      
      if (!statement || statement.startsWith('--')) {
        continue;
      }
      
      // Log what we're doing
      const firstLine = statement.split('\n')[0].substring(0, 60);
      console.log(`[${i + 1}/${statements.length}] Executing: ${firstLine}...`);
      
      try {
        // For RPC calls we need to use different approach
        if (statement.includes('CREATE OR REPLACE FUNCTION') || 
            statement.includes('CREATE TRIGGER')) {
          // These need to be run as raw SQL through Supabase SQL editor
          console.log('  ⚠️  Complex statement - may need manual execution');
          skipCount++;
        } else {
          // Try to execute the statement
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            // Try alternative approach for simple statements
            if (statement.startsWith('CREATE TABLE IF NOT EXISTS')) {
              console.log('  ⚠️  Table creation - checking if exists...');
              // Extract table name
              const tableMatch = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
              if (tableMatch) {
                const tableName = tableMatch[1];
                const { error: checkError } = await supabase
                  .from(tableName)
                  .select('*')
                  .limit(1);
                
                if (!checkError || checkError.message.includes('does not exist')) {
                  console.log(`  ℹ️  Table ${tableName} needs creation`);
                  skipCount++;
                } else {
                  console.log(`  ✅ Table ${tableName} already exists`);
                  successCount++;
                }
              }
            } else if (statement.includes('ALTER TABLE') && error.message.includes('already exists')) {
              console.log('  ✅ Already applied');
              successCount++;
            } else {
              console.log(`  ⚠️  ${error.message}`);
              skipCount++;
            }
          } else {
            console.log('  ✅ Success');
            successCount++;
          }
        }
      } catch (err) {
        console.log(`  ❌ Error: ${err.message}`);
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ⚠️  Skipped/Manual: ${skipCount}`);
    
    if (skipCount > 0) {
      console.log('\n⚠️  Some statements require manual execution in Supabase SQL editor:');
      console.log('  1. Go to your Supabase dashboard');
      console.log('  2. Navigate to SQL Editor');
      console.log('  3. Copy and run the migration file: supabase/migrations/add-feedback-tracking.sql');
    }
    
  } catch (error) {
    console.error('❌ Failed to apply migration:', error.message);
    process.exit(1);
  }
}

// Simple version that just logs what needs to be done
async function showMigrationInstructions() {
  console.log('\n📋 To apply the feedback tracking migration:\n');
  console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Navigate to the SQL Editor (left sidebar)');
  console.log('4. Click "New query"');
  console.log('5. Copy the contents of: supabase/migrations/add-feedback-tracking.sql');
  console.log('6. Paste into the editor and click "Run"\n');
  console.log('The migration will:');
  console.log('  - Add "fixed" reaction type to forum_reactions');
  console.log('  - Create feedback_tracking table');
  console.log('  - Create feedback_sessions table');
  console.log('  - Create forum_feedback_status view');
  console.log('  - Set up necessary indexes and policies\n');
}

// Main execution
async function main() {
  if (process.argv.includes('--instructions')) {
    await showMigrationInstructions();
  } else {
    console.log('⚠️  Note: Some migrations require service role key or manual execution\n');
    await applyMigration();
    console.log('\n💡 If any statements failed, run with --instructions flag for manual steps');
  }
}

main().catch(console.error);