#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function checkUserAccess(email) {
  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: node scripts/check-user-access.js <email>');
    process.exit(1);
  }

  console.log(`🔍 Checking access for: ${email}\n`);

  try {
    // Check if the user exists in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        console.log(`❌ No profile found for email: ${email}`);
        
        // Check if user exists in auth
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError) {
          const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
          if (authUser) {
            console.log(`\n⚠️  User exists in auth but not in profiles!`);
            console.log(`   Auth ID: ${authUser.id}`);
            console.log(`   Created: ${new Date(authUser.created_at).toLocaleString()}`);
            console.log(`\n💡 User needs to complete profile setup`);
          } else {
            console.log('\n❌ User not found in auth either - they need to sign up first');
          }
        }
      } else {
        console.error('❌ Error finding user:', profileError.message);
      }
      process.exit(1);
    }

    // Display user information
    console.log('👤 USER PROFILE');
    console.log('=' .repeat(50));
    console.log(`ID:           ${profile.id}`);
    console.log(`Email:        ${profile.email || 'Not set'}`);
    console.log(`Username:     ${profile.username}`);
    console.log(`Display Name: ${profile.display_name || 'Not set'}`);
    console.log(`Created:      ${new Date(profile.created_at).toLocaleString()}`);
    
    console.log('\n🔐 ACCESS LEVELS');
    console.log('=' .repeat(50));
    console.log(`Admin:        ${profile.is_admin ? '✅ YES' : '❌ No'}`);
    console.log(`Beta Access:  ${profile.beta_access ? '✅ YES' : '❌ No'}`);
    console.log(`Deleted:      ${profile.deleted_at ? '⚠️  SOFT DELETED' : '✅ Active'}`);
    
    console.log('\n🎫 BETA FEATURES');
    console.log('=' .repeat(50));
    console.log(`Invite Quota: ${profile.invite_quota || 0}`);
    console.log(`Invites Used: ${profile.invites_used || 0}`);
    console.log(`Referral Code: ${profile.referral_code || 'None'}`);
    
    // Check what they can access
    console.log('\n🚪 CAN ACCESS');
    console.log('=' .repeat(50));
    
    const canAccessMyBag = profile.beta_access || profile.is_admin;
    const canAccessAdmin = profile.is_admin;
    
    console.log(`/my-bag:        ${canAccessMyBag ? '✅ YES' : '❌ No (needs beta)'}`);
    console.log(`/feed:          ${canAccessMyBag ? '✅ YES' : '❌ No (needs beta)'}`);
    console.log(`/admin/waitlist: ${canAccessAdmin ? '✅ YES' : '❌ No (needs admin)'}`);
    console.log(`/waitlist:      ✅ YES (always accessible)`);
    console.log(`/equipment:     ✅ YES (public)`);
    console.log(`/bags-browser:  ✅ YES (public)`);
    
    // Check for any waitlist applications
    const { data: application, error: appError } = await supabase
      .from('waitlist_applications')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (application && !appError) {
      console.log('\n📝 WAITLIST APPLICATION');
      console.log('=' .repeat(50));
      console.log(`Status:       ${application.status.toUpperCase()}`);
      console.log(`Score:        ${application.score}/15`);
      console.log(`Applied:      ${new Date(application.created_at).toLocaleString()}`);
      if (application.approved_at) {
        console.log(`Approved:     ${new Date(application.approved_at).toLocaleString()}`);
      }
    }
    
    // Summary
    console.log('\n📊 SUMMARY');
    console.log('=' .repeat(50));
    if (profile.is_admin) {
      console.log('✅ User is an ADMIN - has full access to everything');
    } else if (profile.beta_access) {
      console.log('✅ User has BETA ACCESS - can use My Bag and core features');
    } else {
      console.log('⚠️  User needs BETA ACCESS to use My Bag');
      console.log('   Options:');
      console.log('   1. Apply via /waitlist');
      console.log('   2. Admin can grant via: node scripts/grant-beta-access.js ' + email);
      console.log('   3. Use an invite code');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];
checkUserAccess(email);