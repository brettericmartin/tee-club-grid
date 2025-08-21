#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function grantBetaAccess(email) {
  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: node scripts/grant-beta-access.js <email>');
    process.exit(1);
  }

  console.log(`🔧 Granting beta access to: ${email}\n`);

  try {
    // First, check if the user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name, beta_access, is_admin')
      .eq('email', email.toLowerCase())
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        console.error(`❌ No user found with email: ${email}`);
        console.log('\n💡 Tip: User must have an account first before granting beta access');
      } else {
        console.error('❌ Error finding user:', profileError.message);
      }
      process.exit(1);
    }

    // Check current status
    console.log('📋 Current user status:');
    console.log(`   ID: ${profile.id}`);
    console.log(`   Username: ${profile.username}`);
    console.log(`   Display Name: ${profile.display_name || 'Not set'}`);
    console.log(`   Beta Access: ${profile.beta_access ? '✅ Yes' : '❌ No'}`);
    console.log(`   Admin: ${profile.is_admin ? '✅ Yes' : '❌ No'}`);

    if (profile.beta_access) {
      console.log('\n✅ User already has beta access!');
      process.exit(0);
    }

    // Grant beta access
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        beta_access: true,
        invite_quota: 3,
        invites_used: 0
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('❌ Error granting beta access:', updateError.message);
      process.exit(1);
    }

    console.log('\n✅ Beta access granted successfully!');
    console.log('   - Beta access: Enabled');
    console.log('   - Invite quota: 3');
    console.log('   - User can now access /my-bag');

    // Generate invite codes for the user
    console.log('\n🎫 Generating invite codes...');
    
    const inviteCodes = [];
    for (let i = 0; i < 3; i++) {
      const code = generateInviteCode();
      const { error: inviteError } = await supabase
        .from('invite_codes')
        .insert({
          code,
          created_by: profile.id,
          max_uses: 1,
          uses: 0,
          active: true
        });

      if (!inviteError) {
        inviteCodes.push(code);
      }
    }

    if (inviteCodes.length > 0) {
      console.log(`✅ Generated ${inviteCodes.length} invite codes:`);
      inviteCodes.forEach(code => console.log(`   - ${code}`));
    }

    console.log('\n🎉 All done! User now has full beta access.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Get email from command line arguments
const email = process.argv[2];
grantBetaAccess(email);