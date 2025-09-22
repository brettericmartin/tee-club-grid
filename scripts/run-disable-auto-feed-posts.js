#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { supabase } from './supabase-admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  
  console.log('🔧 Running migration to disable automatic feed post creation...\n');
  
  try {
    // Read the migration SQL file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250121_disable_auto_feed_posts.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded: 20250121_disable_auto_feed_posts.sql');
    console.log('⚠️  This migration will:');
    console.log('   1. Find and drop any triggers on equipment_photos that create feed posts');
    console.log('   2. Remove orphaned functions that auto-create feed posts');
    console.log('   3. Preserve the correct trigger (feed_posts -> equipment_photos)');
    console.log('   4. Document the change in table comments\n');
    
    console.log('⚠️  IMPORTANT: This migration requires database admin access.');
    console.log('   You may need to run it directly in the Supabase SQL Editor.\n');
    
    // Since we can't execute raw SQL with triggers/functions via the client library,
    // provide instructions for manual execution
    console.log('📋 To apply this migration manually:\n');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the following SQL:');
    console.log('----------------------------------------\n');
    console.log(migrationSQL);
    console.log('\n----------------------------------------');
    console.log('\n4. Click "Run" to execute the migration');
    console.log('5. Check the output for any errors or notices\n');
    
    console.log('✅ Migration file created and ready for execution.');
    console.log('   Please run it in Supabase SQL Editor to fix the duplicate feed post issue.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runMigration();