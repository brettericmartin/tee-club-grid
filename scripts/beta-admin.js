#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function showMenu() {
  console.clear();
  console.log('🎯 TEED.CLUB BETA ADMIN TOOLS\n');
  console.log('=' .repeat(80));
  console.log('\n📊 Beta System Management:\n');
  console.log('  1. View Beta Status');
  console.log('  2. View Waitlist Queue');
  console.log('  3. Approve User(s)');
  console.log('  4. Adjust Beta Cap');
  console.log('  5. Toggle Public Beta');
  console.log('  6. Generate Invite Codes');
  console.log('  7. View Referral Leaderboard');
  console.log('  8. Export Waitlist Data');
  console.log('  9. Send Test Emails');
  console.log('  0. Exit\n');
}

async function viewBetaStatus() {
  console.log('\n📊 BETA STATUS\n');
  console.log('=' .repeat(80));
  
  // Get feature flags
  const { data: flags } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('id', 1)
    .single();
  
  // Count beta users
  const { count: activeUsers } = await supabase
    .from('profiles')
    .select('id', { count: 'exact' })
    .eq('beta_access', true)
    .is('deleted_at', null);
  
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('id', { count: 'exact' })
    .eq('beta_access', true);
  
  // Count waitlist
  const { count: pendingCount } = await supabase
    .from('waitlist_applications')
    .select('id', { count: 'exact' })
    .eq('status', 'pending');
  
  const { count: approvedCount } = await supabase
    .from('waitlist_applications')
    .select('id', { count: 'exact' })
    .eq('status', 'approved');
  
  console.log(`Beta Cap: ${flags?.beta_cap || 150}`);
  console.log(`Public Beta: ${flags?.public_beta_enabled ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`Active Beta Users: ${activeUsers || 0}`);
  console.log(`Total Beta Users (incl. deleted): ${totalUsers || 0}`);
  console.log(`Spots Remaining: ${Math.max(0, (flags?.beta_cap || 150) - (activeUsers || 0))}`);
  console.log(`\nWaitlist Applications:`);
  console.log(`  Pending: ${pendingCount || 0}`);
  console.log(`  Approved: ${approvedCount || 0}`);
  
  console.log('\n🚩 Feature Flags:');
  console.log(`  Auto-approval Threshold: ${flags?.captcha_auto_threshold || 75}`);
  console.log(`  Rate Limiting: ${flags?.rate_limit_enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`  Leaderboard: ${flags?.leaderboard_enabled ? 'Enabled' : 'Disabled'}`);
}

async function viewWaitlistQueue() {
  console.log('\n📝 WAITLIST QUEUE\n');
  console.log('=' .repeat(80));
  
  const { data: applications } = await supabase
    .from('waitlist_applications')
    .select('*')
    .eq('status', 'pending')
    .order('score', { ascending: false })
    .limit(20);
  
  if (!applications || applications.length === 0) {
    console.log('No pending applications');
    return;
  }
  
  console.log('Top 20 Pending Applications (by score):\n');
  console.log('Score | Email                          | Name                 | City              | Applied');
  console.log('-'.repeat(100));
  
  for (const app of applications) {
    const email = app.email.padEnd(30);
    const name = (app.display_name || '-').substring(0, 20).padEnd(20);
    const city = (app.city_region || '-').substring(0, 17).padEnd(17);
    const date = new Date(app.created_at).toLocaleDateString();
    console.log(`${String(app.score).padStart(5)} | ${email} | ${name} | ${city} | ${date}`);
  }
}

async function approveUsers() {
  console.log('\n✅ APPROVE USERS\n');
  console.log('=' .repeat(80));
  
  console.log('Options:');
  console.log('  1. Approve by email');
  console.log('  2. Approve top N by score');
  console.log('  3. Approve all above score threshold');
  
  const choice = await question('\nChoice (1-3): ');
  
  if (choice === '1') {
    const email = await question('Enter email to approve: ');
    
    // Get application
    const { data: app } = await supabase
      .from('waitlist_applications')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (!app) {
      console.log('❌ Application not found');
      return;
    }
    
    // Update application
    await supabase
      .from('waitlist_applications')
      .update({ 
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('email', email.toLowerCase());
    
    // Create/update profile
    await supabase
      .from('profiles')
      .upsert({
        email: email.toLowerCase(),
        display_name: app.display_name,
        beta_access: true,
        invite_quota: 3,
        invites_sent: 0
      }, {
        onConflict: 'email'
      });
    
    console.log(`✅ Approved: ${email}`);
    
  } else if (choice === '2') {
    const count = parseInt(await question('How many to approve: '));
    
    // Get top N pending applications
    const { data: apps } = await supabase
      .from('waitlist_applications')
      .select('*')
      .eq('status', 'pending')
      .order('score', { ascending: false })
      .limit(count);
    
    if (!apps || apps.length === 0) {
      console.log('No pending applications');
      return;
    }
    
    console.log(`\nApproving ${apps.length} users...`);
    
    for (const app of apps) {
      // Update application
      await supabase
        .from('waitlist_applications')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', app.id);
      
      // Create/update profile
      await supabase
        .from('profiles')
        .upsert({
          email: app.email,
          display_name: app.display_name,
          beta_access: true,
          invite_quota: 3,
          invites_sent: 0
        }, {
          onConflict: 'email'
        });
      
      console.log(`  ✅ ${app.email} (score: ${app.score})`);
    }
    
    console.log(`\n✅ Approved ${apps.length} users`);
    
  } else if (choice === '3') {
    const threshold = parseInt(await question('Minimum score to approve: '));
    
    // Get applications above threshold
    const { data: apps } = await supabase
      .from('waitlist_applications')
      .select('*')
      .eq('status', 'pending')
      .gte('score', threshold);
    
    if (!apps || apps.length === 0) {
      console.log('No applications meet criteria');
      return;
    }
    
    console.log(`\nFound ${apps.length} applications with score >= ${threshold}`);
    const confirm = await question('Approve all? (y/n): ');
    
    if (confirm.toLowerCase() !== 'y') {
      console.log('Cancelled');
      return;
    }
    
    for (const app of apps) {
      // Update application
      await supabase
        .from('waitlist_applications')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', app.id);
      
      // Create/update profile
      await supabase
        .from('profiles')
        .upsert({
          email: app.email,
          display_name: app.display_name,
          beta_access: true,
          invite_quota: 3,
          invites_sent: 0
        }, {
          onConflict: 'email'
        });
      
      console.log(`  ✅ ${app.email} (score: ${app.score})`);
    }
    
    console.log(`\n✅ Approved ${apps.length} users`);
  }
}

async function adjustBetaCap() {
  console.log('\n⚙️  ADJUST BETA CAP\n');
  console.log('=' .repeat(80));
  
  const { data: current } = await supabase
    .from('feature_flags')
    .select('beta_cap')
    .eq('id', 1)
    .single();
  
  console.log(`Current beta cap: ${current?.beta_cap || 150}`);
  
  const newCap = parseInt(await question('Enter new beta cap: '));
  
  if (isNaN(newCap) || newCap < 1) {
    console.log('❌ Invalid value');
    return;
  }
  
  const { error } = await supabase
    .from('feature_flags')
    .update({ beta_cap: newCap })
    .eq('id', 1);
  
  if (error) {
    console.log(`❌ Error: ${error.message}`);
  } else {
    console.log(`✅ Beta cap updated to ${newCap}`);
  }
}

async function togglePublicBeta() {
  console.log('\n🌐 TOGGLE PUBLIC BETA\n');
  console.log('=' .repeat(80));
  
  const { data: current } = await supabase
    .from('feature_flags')
    .select('public_beta_enabled')
    .eq('id', 1)
    .single();
  
  const currentStatus = current?.public_beta_enabled || false;
  console.log(`Current status: ${currentStatus ? '✅ Enabled' : '❌ Disabled'}`);
  
  const newStatus = !currentStatus;
  const confirm = await question(`${newStatus ? 'Enable' : 'Disable'} public beta? (y/n): `);
  
  if (confirm.toLowerCase() !== 'y') {
    console.log('Cancelled');
    return;
  }
  
  const { error } = await supabase
    .from('feature_flags')
    .update({ public_beta_enabled: newStatus })
    .eq('id', 1);
  
  if (error) {
    console.log(`❌ Error: ${error.message}`);
  } else {
    console.log(`✅ Public beta ${newStatus ? 'enabled' : 'disabled'}`);
    if (newStatus) {
      console.log('⚠️  Warning: All new sign-ups will automatically get beta access!');
    }
  }
}

async function generateInviteCodes() {
  console.log('\n🎟️ GENERATE INVITE CODES\n');
  console.log('=' .repeat(80));
  
  const count = parseInt(await question('How many codes to generate: '));
  const maxUses = parseInt(await question('Max uses per code (default 1): ') || '1');
  
  const codes = [];
  
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const { error } = await supabase
      .from('invite_codes')
      .insert({
        code,
        max_uses: maxUses,
        uses: 0,
        active: true
      });
    
    if (!error) {
      codes.push(code);
    }
  }
  
  console.log(`\n✅ Generated ${codes.length} invite codes:\n`);
  for (const code of codes) {
    console.log(`  ${code}`);
  }
  
  console.log('\nShare these URLs:');
  for (const code of codes) {
    console.log(`  https://teed.club/waitlist?code=${code}`);
  }
}

async function exportWaitlistData() {
  console.log('\n📊 EXPORT WAITLIST DATA\n');
  console.log('=' .repeat(80));
  
  const { data: applications } = await supabase
    .from('waitlist_applications')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (!applications || applications.length === 0) {
    console.log('No applications to export');
    return;
  }
  
  const filename = `waitlist-export-${new Date().toISOString().split('T')[0]}.csv`;
  
  // Create CSV
  const headers = ['Email', 'Name', 'City', 'Score', 'Status', 'Applied', 'Approved'];
  const rows = applications.map(app => [
    app.email,
    app.display_name || '',
    app.city_region || '',
    app.score,
    app.status,
    new Date(app.created_at).toISOString(),
    app.approved_at ? new Date(app.approved_at).toISOString() : ''
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  // Write to file
  const fs = await import('fs');
  fs.writeFileSync(filename, csv);
  
  console.log(`✅ Exported ${applications.length} applications to ${filename}`);
}

async function main() {
  let running = true;
  
  while (running) {
    await showMenu();
    const choice = await question('Select option (0-9): ');
    
    switch (choice) {
      case '1':
        await viewBetaStatus();
        break;
      case '2':
        await viewWaitlistQueue();
        break;
      case '3':
        await approveUsers();
        break;
      case '4':
        await adjustBetaCap();
        break;
      case '5':
        await togglePublicBeta();
        break;
      case '6':
        await generateInviteCodes();
        break;
      case '7':
        console.log('\n📊 View referral leaderboard at: http://localhost:3334/waitlist');
        break;
      case '8':
        await exportWaitlistData();
        break;
      case '9':
        console.log('\n📧 Email testing not yet implemented');
        break;
      case '0':
        running = false;
        break;
      default:
        console.log('Invalid option');
    }
    
    if (running) {
      await question('\nPress Enter to continue...');
    }
  }
  
  rl.close();
  console.log('\n👋 Goodbye!\n');
}

main().catch(console.error);