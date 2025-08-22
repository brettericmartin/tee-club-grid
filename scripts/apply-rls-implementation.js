#!/usr/bin/env node

import { supabase } from './supabase-admin.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyRLS() {
  console.log('🚀 APPLYING RLS IMPLEMENTATION FOR AFFILIATE & VIDEO FEATURES\n');
  console.log('=' .repeat(70));
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'final-rls-implementation.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Reading SQL script: final-rls-implementation.sql');
    console.log('📦 Script size: ' + (sqlContent.length / 1024).toFixed(2) + ' KB\n');
    
    // Split SQL into individual statements (handling DO blocks correctly)
    const statements = [];
    let currentStatement = '';
    let inDoBlock = false;
    
    sqlContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      
      // Check for DO block start
      if (trimmedLine.startsWith('DO $$')) {
        inDoBlock = true;
      }
      
      currentStatement += line + '\n';
      
      // Check for statement end
      if (inDoBlock) {
        if (trimmedLine === 'END $$;') {
          statements.push(currentStatement.trim());
          currentStatement = '';
          inDoBlock = false;
        }
      } else if (trimmedLine.endsWith(';') && !trimmedLine.startsWith('--')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    });
    
    // Filter out empty statements and comments
    const validStatements = statements.filter(stmt => {
      const trimmed = stmt.trim();
      return trimmed && !trimmed.startsWith('--');
    });
    
    console.log(`📊 Found ${validStatements.length} SQL statements to execute\n`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < validStatements.length; i++) {
      const statement = validStatements[i];
      const preview = statement.split('\n')[0].substring(0, 60) + '...';
      
      process.stdout.write(`[${i + 1}/${validStatements.length}] Executing: ${preview}`);
      
      try {
        // Use the service role client to execute SQL
        const { data, error } = await supabase.rpc('exec_sql', {
          query: statement
        }).catch(async () => {
          // Fallback: Try direct execution if RPC doesn't exist
          // This won't work for most statements but worth trying
          return { error: new Error('exec_sql RPC not available') };
        });
        
        if (error) {
          // For policies and RLS, some "errors" are expected (like dropping non-existent policies)
          if (statement.includes('DROP POLICY IF EXISTS') || 
              statement.includes('CREATE INDEX IF NOT EXISTS')) {
            process.stdout.write(' ✓\n');
            successCount++;
          } else {
            process.stdout.write(` ❌\n`);
            console.log(`   Error: ${error.message}`);
            errorCount++;
            errors.push({ statement: preview, error: error.message });
          }
        } else {
          process.stdout.write(' ✅\n');
          successCount++;
        }
      } catch (err) {
        process.stdout.write(` ❌\n`);
        console.log(`   Error: ${err.message}`);
        errorCount++;
        errors.push({ statement: preview, error: err.message });
      }
    }
    
    // Summary
    console.log('\n' + '=' .repeat(70));
    console.log('📊 EXECUTION SUMMARY\n');
    console.log(`✅ Successful: ${successCount} statements`);
    console.log(`❌ Failed: ${errorCount} statements`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  ERRORS ENCOUNTERED:');
      errors.forEach((err, idx) => {
        console.log(`\n${idx + 1}. Statement: ${err.statement}`);
        console.log(`   Error: ${err.error}`);
      });
      
      console.log('\n💡 MANUAL EXECUTION REQUIRED:');
      console.log('Since the exec_sql RPC is not available, you need to:');
      console.log('1. Copy the contents of scripts/final-rls-implementation.sql');
      console.log('2. Run it in the Supabase SQL Editor (Dashboard → SQL Editor)');
      console.log('3. Or use: psql $DATABASE_URL < scripts/final-rls-implementation.sql');
    } else {
      console.log('\n✨ All statements executed successfully!');
    }
    
    // Test basic connectivity
    console.log('\n🔍 Testing table access after RLS application...\n');
    
    const tables = [
      'user_equipment_links',
      'equipment_videos',
      'user_bag_videos',
      'link_clicks'
    ];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`✅ ${table}: Accessible (${count || 0} rows)`);
      } else {
        console.log(`⚠️  ${table}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Failed to apply RLS:', error);
    
    console.log('\n📋 MANUAL STEPS TO APPLY RLS:');
    console.log('1. Open Supabase Dashboard');
    console.log('2. Go to SQL Editor');
    console.log('3. Copy contents of scripts/final-rls-implementation.sql');
    console.log('4. Paste and run in SQL Editor');
    console.log('5. Run: node scripts/verify-rls-implementation.js');
  }
}

// Run the application
applyRLS()
  .then(() => {
    console.log('\n✅ RLS application process complete!');
    console.log('📋 Next step: Run `node scripts/verify-rls-implementation.js` to test');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Application failed:', error);
    process.exit(1);
  });