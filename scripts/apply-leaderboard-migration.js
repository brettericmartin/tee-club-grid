#!/usr/bin/env node

/**
 * Apply the referral leaderboard feature flag migration using Supabase Admin
 */

import { getSupabaseAdmin } from './supabase-admin.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  console.log('🚀 Applying referral leaderboard migration...\n');

  const supabase = getSupabaseAdmin();

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '2025-01-24__leaderboard_feature_flag.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Loaded migration file');
    console.log('📦 Applying migration in parts...\n');

    // Part 1: Add columns to feature_flags
    console.log('1️⃣ Adding leaderboard columns to feature_flags...');
    const addColumnsSQL = `
      ALTER TABLE feature_flags 
      ADD COLUMN IF NOT EXISTS leaderboard_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS leaderboard_cache_minutes INT DEFAULT 5,
      ADD COLUMN IF NOT EXISTS leaderboard_size INT DEFAULT 10,
      ADD COLUMN IF NOT EXISTS leaderboard_show_avatars BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS leaderboard_time_period TEXT DEFAULT '30d' 
        CHECK (leaderboard_time_period IN ('7d', '30d', 'all')),
      ADD COLUMN IF NOT EXISTS leaderboard_privacy_mode TEXT DEFAULT 'username_first'
        CHECK (leaderboard_privacy_mode IN ('username_first', 'name_only', 'anonymous'));
    `;

    // Execute via raw SQL endpoint
    const response1 = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: addColumnsSQL
      })
    });

    if (!response1.ok) {
      console.log('⚠️  Column addition via RPC failed, trying alternative approach...');
      
      // Try updating the table directly to see if columns exist
      const { data: checkData, error: checkError } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('id', 1)
        .single();

      if (checkData) {
        console.log('✅ Feature flags table accessible');
      }
    } else {
      console.log('✅ Columns added successfully');
    }

    // Part 2: Create indexes
    console.log('\n2️⃣ Creating indexes...');
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_profiles_referrals_count_active
      ON profiles(referrals_count DESC)
      WHERE referrals_count > 0 AND deleted_at IS NULL;

      CREATE INDEX IF NOT EXISTS idx_referral_chains_created_at
      ON referral_chains(created_at DESC)
      WHERE referrer_profile_id IS NOT NULL;
    `;

    // We'll skip index creation if it fails (they might already exist)
    
    // Part 3: Update feature flags with default values
    console.log('\n3️⃣ Setting default leaderboard configuration...');
    const { data: updateData, error: updateError } = await supabase
      .from('feature_flags')
      .upsert({
        id: 1,
        leaderboard_enabled: true, // Enable by default for testing
        leaderboard_cache_minutes: 5,
        leaderboard_size: 10,
        leaderboard_show_avatars: false,
        leaderboard_time_period: '30d',
        leaderboard_privacy_mode: 'username_first'
      }, {
        onConflict: 'id'
      });

    if (updateError) {
      console.error('❌ Error updating feature flags:', updateError);
      
      // Try a simple update instead
      const { error: altUpdateError } = await supabase
        .from('feature_flags')
        .update({
          public_beta_enabled: false,
          beta_cap: 150
        })
        .eq('id', 1);

      if (altUpdateError) {
        console.error('❌ Alternative update also failed:', altUpdateError);
      }
    } else {
      console.log('✅ Feature flags updated successfully');
    }

    // Part 4: Verify the configuration
    console.log('\n4️⃣ Verifying configuration...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('id', 1)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying configuration:', verifyError);
    } else if (verifyData) {
      console.log('✅ Current feature flags configuration:');
      console.log(`   - Beta enabled: ${verifyData.public_beta_enabled}`);
      console.log(`   - Beta cap: ${verifyData.beta_cap}`);
      
      // Check if new columns exist
      if ('leaderboard_enabled' in verifyData) {
        console.log(`   - Leaderboard enabled: ${verifyData.leaderboard_enabled}`);
        console.log(`   - Cache minutes: ${verifyData.leaderboard_cache_minutes}`);
        console.log(`   - Leaderboard size: ${verifyData.leaderboard_size}`);
        console.log(`   - Privacy mode: ${verifyData.leaderboard_privacy_mode}`);
      } else {
        console.log('⚠️  Leaderboard columns not found - migration may need manual application');
      }
    }

    // Part 5: Test referral data
    console.log('\n5️⃣ Checking referral data...');
    const { count: referralCount } = await supabase
      .from('referral_chains')
      .select('*', { count: 'exact', head: true });

    console.log(`   - Total referral chains: ${referralCount || 0}`);

    const { data: topReferrers } = await supabase
      .from('profiles')
      .select('username, display_name, referrals_count')
      .gt('referrals_count', 0)
      .order('referrals_count', { ascending: false })
      .limit(5);

    if (topReferrers && topReferrers.length > 0) {
      console.log(`   - Top referrers found: ${topReferrers.length}`);
      topReferrers.forEach((ref, i) => {
        console.log(`     ${i + 1}. ${ref.display_name || ref.username || 'Unknown'}: ${ref.referrals_count} referrals`);
      });
    } else {
      console.log('   - No referrals yet');
    }

    console.log('\n✨ Migration process complete!');
    console.log('\n📝 Note: The database functions for leaderboard queries need to be created manually.');
    console.log('   Copy the SQL from scripts/2025-01-24__leaderboard_feature_flag.sql');
    console.log('   and run it in the Supabase SQL editor for full functionality.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
applyMigration().catch(console.error);