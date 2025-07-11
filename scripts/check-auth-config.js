import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

console.log('\n🔐 Supabase Auth Configuration Check\n');
console.log('=====================================\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log('-------------------------');
console.log(`VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? '✓ Set' : '✗ Missing'}`);
console.log(`VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}`);
console.log(`SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing'}`);

// Check if URL matches expected format
const url = process.env.VITE_SUPABASE_URL;
if (url) {
  const urlPattern = /https:\/\/[a-z0-9]+\.supabase\.co/;
  console.log(`\nURL Format: ${urlPattern.test(url) ? '✓ Valid' : '✗ Invalid'}`);
  console.log(`Project Ref: ${url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] || 'Not found'}`);
}

// Test anon key (for client-side auth)
console.log('\n2. Testing Anonymous Key (Client Auth):');
console.log('---------------------------------------');
try {
  const anonClient = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  
  // Try to access auth
  const { data: authData, error: authError } = await anonClient.auth.getSession();
  
  if (authError) {
    console.log(`✗ Auth Error: ${authError.message}`);
  } else {
    console.log('✓ Anonymous client initialized successfully');
    console.log(`  Session: ${authData.session ? 'Active' : 'None'}`);
  }
  
  // Test if we can query a public table
  const { error: queryError } = await anonClient
    .from('profiles')
    .select('count')
    .limit(1);
    
  if (queryError) {
    console.log(`✗ Query Error: ${queryError.message}`);
  } else {
    console.log('✓ Can query public tables');
  }
  
} catch (e) {
  console.log(`✗ Client Error: ${e.message}`);
}

// Test service key (for admin operations)
console.log('\n3. Testing Service Key (Admin):');
console.log('-------------------------------');
try {
  const serviceClient = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  const { count, error } = await serviceClient
    .from('profiles')
    .select('*', { count: 'exact', head: true });
    
  if (error) {
    console.log(`✗ Service Key Error: ${error.message}`);
  } else {
    console.log('✓ Service key working');
    console.log(`  Can access profiles table (${count} users)`);
  }
} catch (e) {
  console.log(`✗ Service Client Error: ${e.message}`);
}

// Check auth configuration in Supabase
console.log('\n4. Auth Provider Configuration:');
console.log('-------------------------------');
console.log('Make sure in your Supabase dashboard:');
console.log('  • Email auth is enabled');
console.log('  • Site URL is set correctly');
console.log('  • Redirect URLs include your dev URL');
console.log('  • API keys match your .env.local file');

console.log('\n5. Common Issues:');
console.log('-----------------');
console.log('• Wrong project URL or keys');
console.log('• Keys from different projects');
console.log('• Expired or revoked keys');
console.log('• CORS issues (check allowed origins)');
console.log('• Row Level Security blocking access');

console.log('\n=====================================\n');