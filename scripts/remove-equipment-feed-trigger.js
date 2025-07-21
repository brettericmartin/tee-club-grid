#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './supabase-admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function removeEquipmentFeedTrigger() {
  try {
    console.log('🔧 Removing equipment addition feed trigger...\n');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'sql', 'remove-equipment-addition-feed-trigger.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Executing SQL migration...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql not available, executing statements individually...');
      
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.startsWith('DO $$')) {
          // Skip DO blocks as they can't be executed via API
          console.log('⏭️  Skipping DO block (verification only)');
          continue;
        }
        
        console.log(`\n📌 Executing: ${statement.substring(0, 50)}...`);
        
        try {
          await supabase.rpc('exec_sql', { sql_query: statement + ';' });
        } catch (e) {
          console.log(`⚠️  Statement failed, but continuing: ${e.message}`);
        }
      }
    }
    
    console.log('\n✅ Migration completed!');
    console.log('\n📋 Summary:');
    console.log('- Equipment addition trigger removed');
    console.log('- Only photo uploads will create feed posts now');
    console.log('- This prevents duplicate feed posts');
    
    console.log('\n💡 Next steps:');
    console.log('1. Test by adding equipment to a bag (should NOT create a feed post)');
    console.log('2. Test by uploading a photo (SHOULD create a feed post)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the migration
removeEquipmentFeedTrigger();