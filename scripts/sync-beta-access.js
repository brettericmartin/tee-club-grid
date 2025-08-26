import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function syncBetaAccess() {
  console.log('🔄 SYNCING BETA ACCESS\n');
  console.log('=' .repeat(80));
  
  try {
    // 1. Get all approved applications
    const { data: approvedApps, error: appsError } = await supabase
      .from('waitlist_applications')
      .select('*')
      .eq('status', 'approved');
    
    if (appsError) {
      throw appsError;
    }
    
    console.log(`Found ${approvedApps.length} approved applications\n`);
    
    let syncCount = 0;
    let errorCount = 0;
    
    for (const app of approvedApps) {
      console.log(`Processing: ${app.email}`);
      
      // Find or create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', app.email.toLowerCase())
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error(`  ❌ Error finding profile: ${profileError.message}`);
        errorCount++;
        continue;
      }
      
      if (!profile) {
        console.log(`  ⚠️ No profile found for ${app.email} - user needs to sign up`);
        continue;
      }
      
      // Check if already has beta access
      if (profile.beta_access) {
        console.log(`  ✓ Already has beta access`);
        continue;
      }
      
      // Grant beta access
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          beta_access: true,
          beta_granted_at: new Date().toISOString(),
          // Generate referral code if they don't have one
          referral_code: profile.referral_code || generateReferralCode(profile.display_name || profile.username)
        })
        .eq('id', profile.id);
      
      if (updateError) {
        console.error(`  ❌ Failed to grant beta access: ${updateError.message}`);
        errorCount++;
      } else {
        console.log(`  ✅ Beta access granted!`);
        syncCount++;
      }
    }
    
    console.log('\n' + '=' .repeat(80));
    console.log('SYNC COMPLETE\n');
    console.log(`✅ Synced: ${syncCount} users`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`⏭️ Skipped: ${approvedApps.length - syncCount - errorCount} (already had access or no profile)`);
    
    // 2. Also ensure all beta users have referral codes
    console.log('\n📝 CHECKING REFERRAL CODES\n');
    console.log('=' .repeat(80));
    
    const { data: betaUsers, error: betaError } = await supabase
      .from('profiles')
      .select('id, email, display_name, username, referral_code')
      .eq('beta_access', true)
      .is('referral_code', null);
    
    if (betaError) {
      console.error('Failed to fetch beta users:', betaError);
      return;
    }
    
    console.log(`Found ${betaUsers.length} beta users without referral codes\n`);
    
    for (const user of betaUsers) {
      const code = generateReferralCode(user.display_name || user.username || user.email);
      
      const { error } = await supabase
        .from('profiles')
        .update({ referral_code: code })
        .eq('id', user.id);
      
      if (error) {
        console.error(`Failed to add referral code for ${user.email}: ${error.message}`);
      } else {
        console.log(`✅ Added referral code ${code} for ${user.email}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
  }
}

function generateReferralCode(seed) {
  // Generate a simple 8-character code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  // Use seed to make it somewhat predictable
  const seedNum = seed ? 
    seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 
    Math.random() * 1000;
  
  for (let i = 0; i < 8; i++) {
    const index = (seedNum * (i + 1) + Date.now()) % chars.length;
    code += chars[Math.floor(index)];
  }
  
  return code;
}

syncBetaAccess()
  .then(() => {
    console.log('\n✨ Sync complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  });