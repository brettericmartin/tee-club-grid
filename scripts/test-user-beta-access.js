import { supabase } from './supabase-admin.js';

async function testUserBetaAccess() {
  console.log('🔍 Testing User Beta Access Redirects');
  console.log('=' .repeat(50));

  // Check all users and their beta access status
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, username, display_name, beta_access, is_admin')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log(`\n📊 Total users: ${profiles.length}\n`);

  // Group users by access level
  const betaUsers = profiles.filter(p => p.beta_access);
  const adminUsers = profiles.filter(p => p.is_admin);
  const noAccessUsers = profiles.filter(p => !p.beta_access && !p.is_admin);

  console.log('✅ Users WITH beta access (should go to /my-bag):');
  console.log('-'.repeat(50));
  betaUsers.forEach(user => {
    console.log(`  • ${user.email || user.username} (beta_access: ${user.beta_access})`);
  });

  console.log('\n👨‍💼 Admin users (should go to /my-bag):');
  console.log('-'.repeat(50));
  adminUsers.forEach(user => {
    console.log(`  • ${user.email || user.username} (is_admin: ${user.is_admin})`);
  });

  console.log('\n❌ Users WITHOUT beta access (should go to /waitlist):');
  console.log('-'.repeat(50));
  noAccessUsers.forEach(user => {
    console.log(`  • ${user.email || user.username}`);
  });

  console.log('\n📝 Summary:');
  console.log(`  • ${betaUsers.length} users have beta access`);
  console.log(`  • ${adminUsers.length} users are admins`);
  console.log(`  • ${noAccessUsers.length} users need waitlist`);

  console.log('\n✅ Expected Behavior After Login:');
  console.log('-'.repeat(50));
  console.log('1. User logs in via Google/email');
  console.log('2. AuthCallback checks beta_access and is_admin');
  console.log('3. If beta_access=true OR is_admin=true → redirect to /my-bag');
  console.log('4. If both are false/null → redirect to /waitlist');
  console.log('5. Waitlist page also checks and redirects if user has access');
}

testUserBetaAccess().catch(console.error);