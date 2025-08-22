#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use service role key for admin operations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function executeSQLFile() {
  console.log('🚀 Executing RLS SQL Script...\n');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-affiliate-video-rls-policies.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split into individual statements (handling multiline properly)
    const statements = sqlContent
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      const preview = statement.substring(0, 60).replace(/\n/g, ' ') + '...';
      
      console.log(`[${i + 1}/${statements.length}] ${preview}`);
      
      try {
        // Try to execute via raw SQL (this may not work for all statement types)
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        }).catch(() => ({ error: new Error('exec_sql not available') }));
        
        if (error) {
          // Try alternative approach for specific statement types
          if (statement.includes('DROP POLICY') || statement.includes('CREATE POLICY')) {
            // These need to be run directly in the database
            console.log('  ⚠️  Policy statement - needs manual execution');
            errorCount++;
          } else if (statement.includes('ALTER TABLE') && statement.includes('ENABLE ROW LEVEL SECURITY')) {
            // Try to enable RLS via a different approach
            console.log('  ⚠️  RLS enable statement - needs manual execution');
            errorCount++;
          } else if (statement.includes('CREATE INDEX')) {
            console.log('  ⚠️  Index statement - needs manual execution');
            errorCount++;
          } else {
            console.log(`  ❌ ${error.message}`);
            errorCount++;
          }
        } else {
          console.log('  ✅ Success');
          successCount++;
        }
      } catch (err) {
        console.log(`  ❌ ${err.message}`);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 EXECUTION SUMMARY\n');
    console.log(`✅ Successful: ${successCount} statements`);
    console.log(`❌ Failed/Manual: ${errorCount} statements`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  MANUAL EXECUTION REQUIRED');
      console.log('Since direct SQL execution is not available, please:');
      console.log('\n1. Open Supabase Dashboard (https://app.supabase.com)');
      console.log('2. Navigate to your project');
      console.log('3. Go to SQL Editor');
      console.log('4. Copy the entire contents of:');
      console.log('   scripts/fix-affiliate-video-rls-policies.sql');
      console.log('5. Paste into SQL Editor');
      console.log('6. Click "Run" to execute all statements');
      console.log('\nThe SQL script will:');
      console.log('  • Drop old/incorrect policies');
      console.log('  • Enable RLS on all 4 tables');
      console.log('  • Create correct policies with proper column names');
      console.log('  • Add performance indexes');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nPlease execute the SQL manually in Supabase Dashboard');
  }
}

// Alternative: Try using the Supabase Management API
async function applyRLSViaAPI() {
  console.log('\n🔧 Attempting to apply RLS via Supabase Management API...\n');
  
  const tables = [
    'user_equipment_links',
    'equipment_videos', 
    'user_bag_videos',
    'link_clicks'
  ];
  
  for (const table of tables) {
    try {
      // This would need the Management API setup
      console.log(`Checking RLS status for ${table}...`);
      
      // Test if we can at least query the table
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(0);
      
      if (!error) {
        console.log(`  ✅ ${table} is accessible`);
      } else {
        console.log(`  ❌ ${table}: ${error.message}`);
      }
    } catch (err) {
      console.log(`  ❌ ${table}: ${err.message}`);
    }
  }
}

// Main execution
async function main() {
  console.log('=' .repeat(70));
  console.log('RLS POLICY EXECUTION SCRIPT');
  console.log('=' .repeat(70));
  
  await executeSQLFile();
  await applyRLSViaAPI();
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Script execution complete');
  console.log('\nNext step: Run verification script');
  console.log('  node scripts/verify-affiliate-rls.js');
  console.log('=' .repeat(70));
}

main().catch(console.error);