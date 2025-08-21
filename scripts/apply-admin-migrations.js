#!/usr/bin/env node
/**
 * Apply Admin System Migrations
 * Runs the SQL scripts to set up the admin system
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.log('Required: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigrations() {
  console.log('🚀 Applying Admin System Migrations');
  console.log('===================================\n');

  try {
    // Read the admin table creation script
    const createAdminsSQL = await readFile(
      join(__dirname, 'create-admins-table.sql'), 
      'utf-8'
    );

    console.log('📄 Applying create-admins-table.sql...');
    
    // Split the SQL into individual statements and execute them
    const statements = createAdminsSQL
      .split(/;(?=\s*(?:--|\n|\r\n|$))/)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`   Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('sql', { query: statement });
        
        if (error) {
          // Some errors are expected (like "already exists")
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist')) {
            console.log(`   ⚠️  ${error.message}`);
          } else {
            throw error;
          }
        } else {
          console.log('   ✅ Success');
        }
      }
    }

    console.log('\n✅ Admin system migrations applied successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Update email in scripts/seed-admin.sql');
    console.log('2. Run: node scripts/seed-admin.sql');
    console.log('3. Test: node scripts/test-admin-auth-simple.js');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migrations
applyMigrations().catch(console.error);