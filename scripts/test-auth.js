import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('\n🔐 Testing Supabase Authentication\n');
console.log('==================================\n');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test auth with a dummy sign up (won't actually create user)
async function testAuth() {
  console.log('1. Testing Auth Configuration:');
  console.log('-----------------------------');
  
  // Check current session
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.log(`❌ Session Error: ${sessionError.message}`);
    console.log('\nPossible causes:');
    console.log('- Invalid anon key');
    console.log('- Wrong project URL');
    console.log('- CORS not configured');
  } else {
    console.log('✅ Auth client connected successfully');
    console.log(`   Current session: ${sessionData.session ? 'Active' : 'None'}`);
  }

  // Test sign in with invalid credentials (expected to fail)
  console.log('\n2. Testing Sign In Flow:');
  console.log('-----------------------');
  
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword123'
  });
  
  if (signInError) {
    if (signInError.message.includes('Invalid login credentials')) {
      console.log('✅ Auth endpoint working (invalid credentials as expected)');
    } else if (signInError.message.includes('Invalid API key')) {
      console.log('❌ Invalid API Key!');
      console.log('\nThis means your VITE_SUPABASE_ANON_KEY is incorrect.');
      console.log('\nTo fix:');
      console.log('1. Go to Supabase Dashboard > Settings > API');
      console.log('2. Copy the "anon public" key');
      console.log('3. Update VITE_SUPABASE_ANON_KEY in .env.local');
    } else {
      console.log(`❌ Unexpected error: ${signInError.message}`);
    }
  }

  // Check if email auth is enabled
  console.log('\n3. Auth Provider Status:');
  console.log('-----------------------');
  console.log('Check in Supabase Dashboard:');
  console.log('- Authentication > Providers > Email should be enabled');
  console.log('- Authentication > URL Configuration > Site URL should match your dev URL');
  
  console.log('\n==================================\n');
}

testAuth().catch(console.error);