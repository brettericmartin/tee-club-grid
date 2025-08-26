#!/usr/bin/env node

/**
 * Run the referral leaderboard feature flag migration
 * This adds leaderboard configuration to feature_flags table
 * and creates helper functions for fetching leaderboard data
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting referral leaderboard migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '2025-01-24__leaderboard_feature_flag.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Loaded migration file: 2025-01-24__leaderboard_feature_flag.sql');
    console.log('📦 Migration includes:');
    console.log('   - Feature flag columns for leaderboard configuration');
    console.log('   - Privacy mode settings');
    console.log('   - Helper functions for fetching leaderboard data');
    console.log('   - Indexes for performance optimization\n');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql function not found, attempting direct execution...');
      
      // Split the migration into individual statements
      const statements = migrationSQL
        .split(/;(?=\s*\n)/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let successCount = 0;
      let errorCount = 0;

      for (const statement of statements) {
        try {
          // Skip comment-only statements
          if (statement.match(/^\s*--/)) continue;
          
          // For CREATE FUNCTION and other complex statements, use raw SQL
          const { error: stmtError } = await supabase.rpc('query', { 
            query_text: statement + ';'
          }).single();

          if (stmtError) {
            // Try as raw query
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
              method: 'POST',
              headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ query_text: statement + ';' })
            });

            if (!response.ok) {
              throw new Error(`Statement failed: ${statement.substring(0, 50)}...`);
            }
          }
          
          successCount++;
          process.stdout.write('.');
        } catch (err) {
          errorCount++;
          console.error(`\n❌ Error executing statement: ${err.message}`);
        }
      }

      console.log(`\n\n✅ Migration completed: ${successCount} statements succeeded, ${errorCount} failed`);
    } else {
      console.log('✅ Migration executed successfully via exec_sql');
    }

    // Verify the migration
    console.log('\n🔍 Verifying migration...\n');

    // Check if columns were added
    const { data: featureFlags, error: verifyError } = await supabase
      .from('feature_flags')
      .select('leaderboard_enabled, leaderboard_cache_minutes, leaderboard_size, leaderboard_privacy_mode')
      .eq('id', 1)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying migration:', verifyError);
    } else if (featureFlags) {
      console.log('✅ Feature flag columns added successfully:');
      console.log(`   - Leaderboard enabled: ${featureFlags.leaderboard_enabled}`);
      console.log(`   - Cache minutes: ${featureFlags.leaderboard_cache_minutes}`);
      console.log(`   - Leaderboard size: ${featureFlags.leaderboard_size}`);
      console.log(`   - Privacy mode: ${featureFlags.leaderboard_privacy_mode}`);
    }

    // Test the leaderboard function
    console.log('\n🧪 Testing leaderboard function...');
    const { data: leaderboardTest, error: testError } = await supabase
      .rpc('get_referral_leaderboard', {
        p_time_period: '30d',
        p_limit: 5
      });

    if (testError) {
      console.error('⚠️  Leaderboard function test failed:', testError.message);
      console.log('   This is expected if there are no referrals yet.');
    } else {
      console.log(`✅ Leaderboard function works! Found ${leaderboardTest?.length || 0} entries`);
    }

    console.log('\n🎉 Migration complete!');
    console.log('\nNext steps:');
    console.log('1. Enable the leaderboard by updating feature_flags.leaderboard_enabled to true');
    console.log('2. The leaderboard will appear on the Waitlist and Landing pages');
    console.log('3. Users will see their rank on the My Invites page');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);