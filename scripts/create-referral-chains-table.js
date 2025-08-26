import { supabase } from './supabase-admin.js';

async function createReferralChainsTable() {
  console.log('🚀 Creating referral_chains table...\n');
  
  try {
    // First check if table exists
    const { data: existingCheck } = await supabase
      .from('referral_chains')
      .select('id')
      .limit(1);
    
    if (existingCheck !== null) {
      console.log('✅ Table referral_chains already exists!');
      
      const { count } = await supabase
        .from('referral_chains')
        .select('*', { count: 'exact', head: true });
      
      console.log(`📊 Current referral chains: ${count || 0}`);
      return;
    }
  } catch (err) {
    // Table doesn't exist, proceed with creation
    console.log('📦 Table does not exist, creating now...\n');
  }
  
  // Since we can't execute raw SQL through the client, we'll create the table
  // by using the Supabase dashboard or provide instructions
  
  console.log('⚠️  The Supabase JS client cannot execute DDL statements directly.\n');
  console.log('Please run the following SQL in your Supabase SQL Editor:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new');
  console.log('2. Copy and paste the contents of: scripts/2025-01-24__referral_chains.sql');
  console.log('3. Click "Run"\n');
  
  console.log('Or if you have psql configured, run:');
  console.log('psql $DATABASE_URL < scripts/2025-01-24__referral_chains.sql\n');
  
  console.log('The SQL will create:');
  console.log('- referral_chains table');
  console.log('- Indexes for performance');
  console.log('- Foreign key constraints');
  console.log('- RLS policies for security');
  console.log('- Helper functions for attribution\n');
  
  // For now, let's simulate that the table exists by showing what would be tracked
  console.log('📋 Sample referral chain structure:');
  console.log(JSON.stringify({
    id: 'uuid',
    referrer_profile_id: 'user-who-referred',
    referred_profile_id: 'user-who-was-referred',
    referral_code: 'ABC123DE',
    attribution_type: 'signup',
    created_at: new Date().toISOString()
  }, null, 2));
  
  console.log('\n✨ Once created, the referral system will:');
  console.log('- Track who referred each user');
  console.log('- Count successful referrals per user');
  console.log('- Grant bonus invites every 3 referrals');
  console.log('- Show referral badges on profiles');
  console.log('- Display top referrers on leaderboards');
}

createReferralChainsTable().catch(console.error);