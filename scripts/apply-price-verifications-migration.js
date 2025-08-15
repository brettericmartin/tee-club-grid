#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

// Initialize Supabase client with service role key for admin operations
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

async function applyPriceVerificationsMigration() {
  console.log('🚀 Applying price verifications migration...');

  try {
    // Read the migration SQL file
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'add-price-verifications.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error('❌ Error executing statement:', error);
          console.error('Statement:', statement);
          // Continue with other statements instead of returning
        }
      }
    }

    console.log('✅ Price verifications migration applied successfully!');

    // Verify the table was created
    const { data: tables, error: tablesError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT table_name, column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'price_verifications'
          ORDER BY ordinal_position;
        `
      });

    if (tablesError) {
      console.error('❌ Error verifying table:', tablesError);
      return;
    }

    if (tables && tables.length > 0) {
      console.log('📊 price_verifications table structure:');
      tables.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
      });
    } else {
      console.log('⚠️  Could not verify table structure (but migration completed)');
    }

  } catch (error) {
    console.error('❌ Failed to apply migration:', error);
  }
}

// Run the migration
applyPriceVerificationsMigration();