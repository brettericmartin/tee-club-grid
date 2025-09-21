import { supabase } from './supabase-admin.js';

async function grantBetaToAllExistingUsers() {
  console.log('🚀 Granting Beta Access to All Existing Users');
  console.log('='.repeat(50));

  try {
    // First, let's see who doesn't have beta access
    const { data: usersWithoutBeta, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, username, display_name, beta_access')
      .or('beta_access.is.null,beta_access.is.false')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError);
      return;
    }

    if (!usersWithoutBeta || usersWithoutBeta.length === 0) {
      console.log('✅ All users already have beta access!');
      return;
    }

    console.log(`\n📊 Found ${usersWithoutBeta.length} users without beta access:`);
    console.log('-'.repeat(50));
    usersWithoutBeta.forEach(user => {
      console.log(`  • ${user.email || user.username} (current beta_access: ${user.beta_access})`);
    });

    // Ask for confirmation
    console.log('\n⚠️  This will grant beta access to ALL these users.');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Update all users to have beta access
    const { data: updatedUsers, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        beta_access: true,
        beta_approved_at: new Date().toISOString()
      })
      .or('beta_access.is.null,beta_access.is.false')
      .select('id, email, username, beta_access');

    if (updateError) {
      console.error('❌ Error updating users:', updateError);
      return;
    }

    console.log(`\n✅ Successfully granted beta access to ${updatedUsers.length} users!`);
    console.log('-'.repeat(50));
    updatedUsers.forEach(user => {
      console.log(`  ✓ ${user.email || user.username}`);
    });

    // Verify the update
    const { data: allUsers, error: verifyError } = await supabase
      .from('profiles')
      .select('beta_access')
      .not('beta_access', 'is', null);

    if (!verifyError && allUsers) {
      const betaCount = allUsers.filter(u => u.beta_access === true).length;
      console.log(`\n📊 Final Status:`);
      console.log(`  • Total users with beta access: ${betaCount}`);
      console.log(`  • Total users in system: ${allUsers.length}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
grantBetaToAllExistingUsers().catch(console.error);