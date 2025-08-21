import crypto from 'crypto';

/**
 * Test script for email hashing functions
 */

// Replicate the hashing function for testing
async function hashEmailForAnalytics(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const hash = crypto.createHash('sha256').update(normalizedEmail).digest('hex');
  return hash;
}

function hashEmailForAnalyticsSync(email) {
  const normalizedEmail = email.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < normalizedEmail.length; i++) {
    const char = normalizedEmail.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

async function runTests() {
  console.log('🧪 Testing Email Hashing Functions\n');
  console.log('=' .repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Consistent SHA-256 hashing
  console.log('\n1. Testing SHA-256 consistency...');
  const email1 = 'test@example.com';
  const hash1a = await hashEmailForAnalytics(email1);
  const hash1b = await hashEmailForAnalytics(email1);
  if (hash1a === hash1b && hash1a.length === 64) {
    console.log('   ✅ SHA-256 produces consistent 64-char hashes');
    passed++;
  } else {
    console.log('   ❌ SHA-256 hash inconsistent or wrong length');
    failed++;
  }
  console.log(`   Hash: ${hash1a.substring(0, 16)}...`);
  
  // Test 2: Case normalization
  console.log('\n2. Testing case normalization...');
  const hash2a = await hashEmailForAnalytics('Test@Example.COM');
  const hash2b = await hashEmailForAnalytics('test@example.com');
  const hash2c = await hashEmailForAnalytics('TEST@EXAMPLE.COM');
  if (hash2a === hash2b && hash2b === hash2c) {
    console.log('   ✅ Email case is properly normalized');
    passed++;
  } else {
    console.log('   ❌ Email case normalization failed');
    failed++;
  }
  
  // Test 3: Whitespace trimming
  console.log('\n3. Testing whitespace trimming...');
  const hash3a = await hashEmailForAnalytics('  test@example.com  ');
  const hash3b = await hashEmailForAnalytics('test@example.com');
  if (hash3a === hash3b) {
    console.log('   ✅ Whitespace is properly trimmed');
    passed++;
  } else {
    console.log('   ❌ Whitespace trimming failed');
    failed++;
  }
  
  // Test 4: Different emails produce different hashes
  console.log('\n4. Testing hash uniqueness...');
  const hash4a = await hashEmailForAnalytics('user1@example.com');
  const hash4b = await hashEmailForAnalytics('user2@example.com');
  if (hash4a !== hash4b) {
    console.log('   ✅ Different emails produce different hashes');
    passed++;
  } else {
    console.log('   ❌ Different emails produced same hash (collision!)');
    failed++;
  }
  
  // Test 5: Known hash value (regression test)
  console.log('\n5. Testing known hash value...');
  const knownEmail = 'test@example.com';
  const knownHash = await hashEmailForAnalytics(knownEmail);
  const expectedHash = '973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b';
  if (knownHash === expectedHash) {
    console.log('   ✅ Hash matches expected value');
    passed++;
  } else {
    console.log('   ❌ Hash does not match expected value');
    console.log(`   Expected: ${expectedHash}`);
    console.log(`   Got:      ${knownHash}`);
    failed++;
  }
  
  // Test 6: Legacy sync function
  console.log('\n6. Testing legacy sync function...');
  const syncHash1 = hashEmailForAnalyticsSync('test@example.com');
  const syncHash2 = hashEmailForAnalyticsSync('TEST@EXAMPLE.COM');
  if (syncHash1 === syncHash2 && typeof syncHash1 === 'string') {
    console.log('   ✅ Legacy sync function works correctly');
    console.log(`   Legacy hash: ${syncHash1}`);
    passed++;
  } else {
    console.log('   ❌ Legacy sync function failed');
    failed++;
  }
  
  // Test 7: Avalanche effect
  console.log('\n7. Testing avalanche effect...');
  const avalanche1 = await hashEmailForAnalytics('test@example.com');
  const avalanche2 = await hashEmailForAnalytics('test@example.con'); // One char different
  let differences = 0;
  for (let i = 0; i < avalanche1.length; i++) {
    if (avalanche1[i] !== avalanche2[i]) differences++;
  }
  if (differences > 30) { // At least half should differ
    console.log(`   ✅ Good avalanche effect: ${differences}/64 characters differ`);
    passed++;
  } else {
    console.log(`   ❌ Poor avalanche effect: only ${differences}/64 characters differ`);
    failed++;
  }
  
  // Test 8: Privacy check
  console.log('\n8. Testing privacy (no email leakage)...');
  const privateEmail = 'secret.user@private-domain.com';
  const privateHash = await hashEmailForAnalytics(privateEmail);
  const hasLeak = privateHash.includes('secret') || 
                  privateHash.includes('user') || 
                  privateHash.includes('private') ||
                  privateHash.includes('@') ||
                  privateHash.includes('.');
  if (!hasLeak) {
    console.log('   ✅ No email information leaked in hash');
    passed++;
  } else {
    console.log('   ❌ Email information may be leaked in hash');
    failed++;
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('\n📊 Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Email hashing is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
  }
  
  // Demonstrate usage
  console.log('\n📝 Example Usage:');
  console.log('=' .repeat(50));
  const demoEmail = 'john.doe@example.com';
  const demoHash = await hashEmailForAnalytics(demoEmail);
  console.log(`Email: ${demoEmail}`);
  console.log(`SHA-256 Hash: ${demoHash}`);
  console.log(`Truncated (first 8 chars): ${demoHash.substring(0, 8)}...`);
  console.log(`Legacy Hash: ${hashEmailForAnalyticsSync(demoEmail)}`);
}

runTests().catch(console.error);