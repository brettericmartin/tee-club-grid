import { supabase } from './supabase-admin.js';

async function testReferralFlow() {
  console.log('🧪 Testing Referral Attribution Flow\n');
  console.log('═'.repeat(50));
  
  try {
    // 1. Check if referral_chains table exists
    console.log('\n1️⃣  Checking referral_chains table...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('referral_chains')
      .select('id')
      .limit(1);
    
    if (tableError && tableError.message.includes('does not exist')) {
      console.log('❌ Table does not exist yet');
      console.log('📝 Please run the migration first (see instructions above)\n');
      
      // Show simulation instead
      console.log('═'.repeat(50));
      console.log('\n📋 SIMULATION MODE - Here\'s how the flow would work:\n');
      await simulateFlow();
      return;
    }
    
    console.log('✅ Table exists!');
    
    // 2. Get some existing users with referral codes
    console.log('\n2️⃣  Fetching users with referral codes...');
    const { data: users } = await supabase
      .from('profiles')
      .select('id, username, display_name, referral_code')
      .not('referral_code', 'is', null)
      .limit(3);
    
    if (users && users.length > 0) {
      console.log(`Found ${users.length} users with referral codes:`);
      users.forEach(user => {
        console.log(`  - @${user.username || 'unknown'}: ${user.referral_code}`);
      });
      
      // 3. Check existing referral chains
      console.log('\n3️⃣  Checking existing referral chains...');
      const { data: chains, count } = await supabase
        .from('referral_chains')
        .select('*, referrer:referrer_profile_id(username, display_name), referred:referred_profile_id(username, display_name)', { count: 'exact' });
      
      console.log(`Total referral chains: ${count || 0}`);
      
      if (chains && chains.length > 0) {
        console.log('\nExisting chains:');
        chains.forEach(chain => {
          const referrerName = chain.referrer?.username || chain.referrer?.display_name || 'Unknown';
          const referredName = chain.referred?.username || chain.referred?.display_name || 'Unknown';
          console.log(`  - ${referrerName} → ${referredName} (${chain.attribution_type})`);
        });
      }
      
      // 4. Show referral stats
      console.log('\n4️⃣  Referral Statistics:');
      const { data: topReferrers } = await supabase
        .from('profiles')
        .select('username, display_name, referrals_count')
        .gt('referrals_count', 0)
        .order('referrals_count', { ascending: false })
        .limit(5);
      
      if (topReferrers && topReferrers.length > 0) {
        console.log('Top Referrers:');
        topReferrers.forEach((ref, i) => {
          console.log(`  ${i + 1}. @${ref.username || 'unknown'}: ${ref.referrals_count} referrals`);
        });
      } else {
        console.log('No referrals tracked yet');
      }
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

async function simulateFlow() {
  // Simulate the referral flow
  console.log('🔄 Step 1: User visits site with referral link');
  console.log('   URL: https://teed.club?ref=0V93OT6B');
  console.log('   ↓');
  console.log('   Referral code captured in localStorage\n');
  
  console.log('🔄 Step 2: User signs up');
  console.log('   Email: newuser@example.com');
  console.log('   ↓');
  console.log('   Account created in Supabase Auth\n');
  
  console.log('🔄 Step 3: Attribution triggered');
  console.log('   POST /api/referral/attribute');
  console.log('   Body: { referral_code: "0V93OT6B" }');
  console.log('   ↓');
  console.log('   Referral chain created\n');
  
  console.log('🔄 Step 4: Referrer rewarded');
  console.log('   - referrals_count incremented');
  console.log('   - invites_used updated');
  console.log('   - Bonus invite granted (every 3 referrals)');
  console.log('   ↓');
  console.log('   Success response with referrer info\n');
  
  console.log('🔄 Step 5: UI Updates');
  console.log('   - ReferrerTag shows on new user\'s profile');
  console.log('   - Referrer appears in leaderboard');
  console.log('   - Stats updated in /api/beta/summary\n');
  
  console.log('═'.repeat(50));
  console.log('\n📊 Expected Data Structure:\n');
  
  console.log('referral_chains table:');
  console.log(JSON.stringify({
    id: '123e4567-e89b-12d3-a456-426614174000',
    referrer_profile_id: 'abc123-referrer-user-id',
    referred_profile_id: 'def456-new-user-id',
    referral_code: '0V93OT6B',
    attribution_type: 'signup',
    created_at: '2025-01-24T12:00:00Z'
  }, null, 2));
  
  console.log('\nprofiles table update:');
  console.log(JSON.stringify({
    id: 'abc123-referrer-user-id',
    referrals_count: 1,  // incremented
    invites_used: 1,     // incremented
    invite_quota: 3      // may increase if bonus earned
  }, null, 2));
  
  console.log('\n✨ Benefits:');
  console.log('- Viral growth tracking');
  console.log('- User acquisition metrics');
  console.log('- Referral leaderboards');
  console.log('- Automatic invite management');
  console.log('- Social proof badges');
}

testReferralFlow().catch(console.error);