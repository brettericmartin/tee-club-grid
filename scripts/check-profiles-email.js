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

async function checkProfilesTable() {
  console.log('🔍 Checking profiles table structure...\n');
  
  // Try to get a sample profile
  const { data: sample, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
    .single();
  
  if (sample) {
    console.log('✅ Profiles table columns found:');
    console.log('  ', Object.keys(sample).join(', '));
    
    // Check for critical columns
    const hasEmail = 'email' in sample;
    const hasId = 'id' in sample;
    const hasBetaAccess = 'beta_access' in sample;
    
    console.log('\n📊 Column Check:');
    console.log(`   id (UUID): ${hasId ? '✅' : '❌'}`);
    console.log(`   email: ${hasEmail ? '✅' : '❌ MISSING'}`);
    console.log(`   beta_access: ${hasBetaAccess ? '✅' : '❌'}`);
    
    if (!hasEmail) {
      console.log('\n⚠️  ISSUE FOUND: Email column missing from profiles table!');
      console.log('\n💡 This is why approval fails. The profiles table structure is:');
      console.log('   - Primary key: id (UUID) - links to auth.users.id');
      console.log('   - No email column - emails are stored in auth.users table');
      console.log('\n🔧 Solution: The approve function needs to be updated to:');
      console.log('   1. First create the user in auth.users (if not exists)');
      console.log('   2. Then update/create the profile using the UUID');
    }
  } else if (error) {
    console.log('❌ Error fetching profile:', error.message);
  }
  
  // Check if we can query by email through auth.users
  console.log('\n🔍 Checking auth.users access...');
  const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.log('⚠️  Cannot access auth.users directly (expected - requires admin API)');
  } else {
    console.log('✅ Can access auth.users');
  }
}

checkProfilesTable()
  .then(() => {
    console.log('\n✨ Check complete!');
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
  });