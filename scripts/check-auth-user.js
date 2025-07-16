import './supabase-admin.mjs';

async function checkAuthUser() {
  console.log('=== CHECKING AUTHENTICATION ===\n');
  
  // Get all users
  const { data: users } = await supabase
    .from('profiles')
    .select('id, username, email')
    .order('created_at', { ascending: false });
  
  console.log('Users in database:');
  users?.forEach(user => {
    console.log(`- ${user.username} (${user.id})`);
    console.log(`  Email: ${user.email || 'N/A'}`);
  });
  
  console.log('\n\nTo debug in the browser console:');
  console.log('1. Open http://localhost:3333');
  console.log('2. Open browser DevTools (F12)');
  console.log('3. In the console, run:');
  console.log('   const { data: { user } } = await supabase.auth.getUser()');
  console.log('   console.log("Logged in as:", user?.id, user?.email)');
  console.log('\n4. Then navigate to My Bag > Feed tab and check console logs');
}

checkAuthUser();