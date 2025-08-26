#!/usr/bin/env node

/**
 * Simple script to enable the referral leaderboard feature
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function enableLeaderboard() {
  console.log('🚀 Configuring referral leaderboard...\n');

  try {
    // First, check current feature flags
    console.log('📊 Checking current feature flags...');
    const { data: currentFlags, error: checkError } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('id', 1)
      .single();

    if (checkError) {
      console.error('❌ Error checking feature flags:', checkError);
      
      // Try to create the record
      console.log('📝 Creating feature flags record...');
      const { error: createError } = await supabase
        .from('feature_flags')
        .insert({
          id: 1,
          public_beta_enabled: false,
          beta_cap: 150
        });

      if (createError) {
        console.error('❌ Error creating feature flags:', createError);
      }
    } else {
      console.log('✅ Current configuration:');
      console.log(`   - Beta enabled: ${currentFlags.public_beta_enabled}`);
      console.log(`   - Beta cap: ${currentFlags.beta_cap}`);
    }

    // Check referral data
    console.log('\n📈 Checking referral data...');
    
    // Count referral chains
    const { count: chainCount } = await supabase
      .from('referral_chains')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   - Total referral chains: ${chainCount || 0}`);

    // Get top referrers
    const { data: topReferrers, error: referrerError } = await supabase
      .from('profiles')
      .select('id, username, display_name, referrals_count')
      .gt('referrals_count', 0)
      .order('referrals_count', { ascending: false })
      .limit(10);

    if (referrerError) {
      console.error('⚠️  Error fetching top referrers:', referrerError);
    } else if (topReferrers && topReferrers.length > 0) {
      console.log(`   - Top referrers (${topReferrers.length} total):`);
      topReferrers.forEach((ref, i) => {
        const name = ref.display_name || ref.username || 'User';
        console.log(`     ${i + 1}. ${name}: ${ref.referrals_count} referrals`);
      });
    } else {
      console.log('   - No referrals recorded yet');
    }

    // Check if we have users with show_referrer preference
    const { count: privacyCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('show_referrer', true);

    console.log(`   - Users allowing referrer display: ${privacyCount || 0}`);

    console.log('\n✨ Leaderboard data check complete!');
    console.log('\n📝 Notes:');
    console.log('1. The leaderboard component will work with the existing data');
    console.log('2. Leaderboard columns need to be added to feature_flags table manually');
    console.log('3. Copy the ALTER TABLE statements from scripts/2025-01-24__leaderboard_feature_flag.sql');
    console.log('4. Run them in the Supabase SQL editor to add configuration options');
    console.log('\n💡 The leaderboard will display even without the feature flag columns,');
    console.log('   using default settings (enabled, 5min cache, top 10, 30-day period)');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the check
enableLeaderboard().catch(console.error);