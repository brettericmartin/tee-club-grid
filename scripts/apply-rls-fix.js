#!/usr/bin/env node

import { supabase } from './supabase-admin.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyRLSFix() {
  console.log('🔧 Applying RLS recursion fixes...\n');

  // Read the SQL file
  const sqlPath = path.join(__dirname, 'fix-rls-recursion.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split SQL into individual statements (basic split, works for our case)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    // Skip DO blocks and comments
    if (statement.startsWith('DO $$') || statement.startsWith('--')) {
      continue;
    }

    // Add semicolon back
    const fullStatement = statement + ';';
    
    console.log(`Executing: ${fullStatement.substring(0, 50)}...`);
    
    try {
      // Use raw SQL execution through Supabase admin client
      const { error } = await supabase.rpc('exec_sql', { 
        sql: fullStatement 
      });

      if (error) {
        // If exec_sql doesn't exist, try direct execution
        const { error: directError } = await supabase.rpc('execute_sql', {
          query: fullStatement
        });

        if (directError) {
          // Final attempt - use the supabase client directly
          // This works for simpler statements
          console.log(`  ⚠️  Standard execution failed, trying alternative...`);
          
          // For policy operations, we need to use the admin API
          const response = await fetch(
            `${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_admin_sql`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
              },
              body: JSON.stringify({ sql: fullStatement })
            }
          );

          if (!response.ok) {
            errorCount++;
            console.log(`  ❌ Failed: ${response.statusText}`);
          } else {
            successCount++;
            console.log(`  ✅ Success (via API)`);
          }
        } else {
          successCount++;
          console.log(`  ✅ Success`);
        }
      } else {
        successCount++;
        console.log(`  ✅ Success`);
      }
    } catch (err) {
      errorCount++;
      console.log(`  ❌ Error: ${err.message}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Successful statements: ${successCount}`);
  console.log(`  ❌ Failed statements: ${errorCount}`);

  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. You may need to run the SQL directly in Supabase dashboard.');
    console.log('   Copy the contents of scripts/fix-rls-recursion.sql and run in SQL editor.');
  }

  // Test if the fixes worked
  console.log('\n🧪 Testing if recursion is fixed...\n');
  
  const testTables = ['profiles', 'forum_threads', 'forum_posts', 'feed_posts'];
  let allFixed = true;

  for (const table of testTables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error && error.message.includes('infinite recursion')) {
      console.log(`  ❌ ${table}: Still has recursion issue`);
      allFixed = false;
    } else if (error) {
      console.log(`  ⚠️  ${table}: ${error.message}`);
    } else {
      console.log(`  ✅ ${table}: Accessible (${data?.length || 0} rows)`);
    }
  }

  if (allFixed) {
    console.log('\n✨ All recursion issues appear to be fixed!');
  } else {
    console.log('\n⚠️  Some tables still have issues. Please run the SQL directly in Supabase.');
  }
}

// Run the fix
applyRLSFix()
  .then(() => {
    console.log('\n✨ RLS fix application complete!');
  })
  .catch(error => {
    console.error('\n❌ Fix failed:', error);
    console.error('Stack:', error.stack);
  });