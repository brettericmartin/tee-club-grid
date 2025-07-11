import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

console.log('\n🔑 Supabase Key Verification\n');
console.log('============================\n');

const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const url = process.env.VITE_SUPABASE_URL;

// Extract project ref from URL
const projectRef = url?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];

console.log(`Project Reference: ${projectRef || 'Not found'}`);
console.log(`Project URL: ${url || 'Not set'}\n`);

// Decode JWT to check claims
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch (e) {
    return null;
  }
}

console.log('Anon Key Analysis:');
console.log('------------------');
if (anonKey) {
  const anonPayload = decodeJWT(anonKey);
  if (anonPayload) {
    console.log(`✓ Valid JWT structure`);
    console.log(`  Role: ${anonPayload.role}`);
    console.log(`  Project Ref: ${anonPayload.ref}`);
    console.log(`  Issued: ${new Date(anonPayload.iat * 1000).toISOString()}`);
    
    if (anonPayload.ref !== projectRef) {
      console.log(`\n⚠️  WARNING: Key is for project '${anonPayload.ref}' but URL is for '${projectRef}'`);
      console.log('  This is likely causing your authentication issues!');
    }
    
    if (anonPayload.role !== 'anon') {
      console.log(`\n⚠️  WARNING: This key has role '${anonPayload.role}' but should be 'anon'`);
    }
  } else {
    console.log('✗ Invalid JWT format');
  }
} else {
  console.log('✗ Not set');
}

console.log('\n\nService Key Analysis:');
console.log('--------------------');
if (serviceKey) {
  const servicePayload = decodeJWT(serviceKey);
  if (servicePayload) {
    console.log(`✓ Valid JWT structure`);
    console.log(`  Role: ${servicePayload.role}`);
    console.log(`  Project Ref: ${servicePayload.ref}`);
    
    if (servicePayload.ref !== projectRef) {
      console.log(`\n⚠️  WARNING: Key is for project '${servicePayload.ref}' but URL is for '${projectRef}'`);
    }
    
    if (servicePayload.role !== 'service_role') {
      console.log(`\n⚠️  WARNING: This key has role '${servicePayload.role}' but should be 'service_role'`);
    }
  } else {
    console.log('✗ Invalid JWT format');
  }
} else {
  console.log('✗ Not set');
}

console.log('\n\nRecommendations:');
console.log('----------------');
console.log('1. Go to your Supabase Dashboard');
console.log('2. Navigate to Settings > API');
console.log('3. Make sure you copy:');
console.log('   - Project URL (should match your .env.local)');
console.log('   - anon (public) key for VITE_SUPABASE_ANON_KEY');
console.log('   - service_role (secret) key for SUPABASE_SERVICE_KEY');
console.log('\n============================\n');