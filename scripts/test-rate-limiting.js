/**
 * Test script for rate limiting functionality
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';
const ENDPOINT = '/api/waitlist/submit';

// Test data for submissions
const generateTestData = () => ({
  role: 'golfer',
  share_channels: ['reddit', 'instagram'],
  learn_channels: ['youtube', 'friends'],
  spend_bracket: '750_1500',
  uses: ['discover gear', 'share setup'],
  buy_frequency: 'few_per_year',
  share_frequency: 'monthly',
  display_name: `Test User ${Date.now()}`,
  city_region: 'Test City',
  email: `test${Date.now()}@example.com`,
  termsAccepted: true,
  contact_phone: '' // Honeypot field - keep empty for normal tests
});

async function makeRequest(data = generateTestData()) {
  try {
    const response = await fetch(`${API_URL}${ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '192.168.1.100' // Simulate consistent IP
      },
      body: JSON.stringify(data)
    });
    
    const rateLimitHeaders = {
      limit: response.headers.get('X-RateLimit-Limit'),
      remaining: response.headers.get('X-RateLimit-Remaining'),
      reset: response.headers.get('X-RateLimit-Reset'),
      retryAfter: response.headers.get('Retry-After')
    };
    
    const body = await response.json();
    
    return {
      status: response.status,
      headers: rateLimitHeaders,
      body
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message
    };
  }
}

async function testRateLimiting() {
  console.log('🧪 Testing Rate Limiting\n');
  console.log('=' .repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Burst capacity (30 requests should succeed)
  console.log('\n📊 Test 1: Burst Capacity (30 requests)');
  console.log('-'.repeat(40));
  
  const burstResults = [];
  for (let i = 1; i <= 31; i++) {
    const result = await makeRequest();
    burstResults.push(result);
    
    if (i <= 30) {
      if (result.status === 200 || result.status === 201) {
        console.log(`✅ Request ${i}: Success (${result.headers.remaining} tokens remaining)`);
        passed++;
      } else if (result.status === 429) {
        console.log(`❌ Request ${i}: Failed - Should have succeeded (burst capacity)`);
        failed++;
      } else {
        console.log(`⚠️  Request ${i}: Status ${result.status} - ${result.body?.error || 'Unknown'}`);
      }
    } else {
      // 31st request should fail
      if (result.status === 429) {
        console.log(`✅ Request ${i}: Correctly rate limited`);
        console.log(`   Retry after: ${result.headers.retryAfter} seconds`);
        passed++;
      } else {
        console.log(`❌ Request ${i}: Should have been rate limited`);
        failed++;
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Test 2: Token refill after waiting
  console.log('\n⏱️  Test 2: Token Refill');
  console.log('-'.repeat(40));
  console.log('Waiting 6 seconds for token refill...');
  await new Promise(resolve => setTimeout(resolve, 6000));
  
  const refillResult = await makeRequest();
  if (refillResult.status === 200 || refillResult.status === 201) {
    console.log('✅ Request succeeded after refill');
    console.log(`   Tokens available: ${refillResult.headers.remaining}`);
    passed++;
  } else {
    console.log('❌ Request failed after refill');
    failed++;
  }
  
  // Test 3: Different IPs are limited independently
  console.log('\n🌐 Test 3: Per-IP Rate Limiting');
  console.log('-'.repeat(40));
  
  // Make request with different IP
  const differentIpData = generateTestData();
  const response = await fetch(`${API_URL}${ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': '192.168.1.200' // Different IP
    },
    body: JSON.stringify(differentIpData)
  });
  
  if (response.status === 200 || response.status === 201) {
    console.log('✅ Different IP has its own rate limit');
    console.log(`   Tokens: ${response.headers.get('X-RateLimit-Remaining')}`);
    passed++;
  } else {
    console.log('❌ Different IP was incorrectly rate limited');
    failed++;
  }
  
  // Test 4: Rate limit headers
  console.log('\n📋 Test 4: Rate Limit Headers');
  console.log('-'.repeat(40));
  
  const headerTest = await makeRequest();
  const headers = headerTest.headers;
  
  if (headers.limit && headers.remaining !== null && headers.reset) {
    console.log('✅ All rate limit headers present');
    console.log(`   Limit: ${headers.limit}`);
    console.log(`   Remaining: ${headers.remaining}`);
    console.log(`   Reset: ${headers.reset}`);
    passed++;
  } else {
    console.log('❌ Missing rate limit headers');
    failed++;
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('\n📊 Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All rate limiting tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
    process.exit(1);
  }
}

// Test honeypot functionality
async function testHoneypot() {
  console.log('\n\n🍯 Testing Honeypot Field\n');
  console.log('=' .repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Normal submission (honeypot empty)
  console.log('\n✅ Test 1: Normal Submission (Honeypot Empty)');
  console.log('-'.repeat(40));
  
  const normalData = generateTestData();
  normalData.contact_phone = ''; // Empty honeypot
  
  const normalResult = await makeRequest(normalData);
  
  // Should get either approved or pending based on score, but not blocked
  if (normalResult.status === 200 && 
      (normalResult.body.status === 'approved' || 
       normalResult.body.status === 'pending' ||
       normalResult.body.status === 'at_capacity')) {
    console.log('✅ Normal submission processed correctly');
    console.log(`   Status: ${normalResult.body.status}`);
    passed++;
  } else {
    console.log('❌ Normal submission failed');
    console.log(`   Response: ${JSON.stringify(normalResult.body)}`);
    failed++;
  }
  
  // Test 2: Honeypot filled (should force pending)
  console.log('\n🚫 Test 2: Honeypot Triggered');
  console.log('-'.repeat(40));
  
  const honeypotData = generateTestData();
  honeypotData.contact_phone = '555-1234'; // Fill honeypot
  honeypotData.email = `honeypot${Date.now()}@example.com`;
  // Even with high-scoring answers, should be forced to pending
  honeypotData.role = 'creator';
  honeypotData.share_frequency = 'weekly_plus';
  honeypotData.spend_bracket = '5000_plus';
  
  const honeypotResult = await makeRequest(honeypotData);
  
  if (honeypotResult.status === 200 && honeypotResult.body.status === 'pending') {
    console.log('✅ Honeypot correctly forced pending status');
    console.log(`   Status: ${honeypotResult.body.status}`);
    passed++;
  } else if (honeypotResult.status === 200 && honeypotResult.body.status === 'approved') {
    console.log('❌ Honeypot failed - submission was approved');
    failed++;
  } else {
    console.log('⚠️  Unexpected response for honeypot submission');
    console.log(`   Response: ${JSON.stringify(honeypotResult.body)}`);
  }
  
  // Test 3: Honeypot with whitespace
  console.log('\n📝 Test 3: Honeypot with Whitespace');
  console.log('-'.repeat(40));
  
  const whitespaceData = generateTestData();
  whitespaceData.contact_phone = '   '; // Just whitespace
  whitespaceData.email = `whitespace${Date.now()}@example.com`;
  
  const whitespaceResult = await makeRequest(whitespaceData);
  
  if (whitespaceResult.status === 200 && 
      (whitespaceResult.body.status === 'approved' || 
       whitespaceResult.body.status === 'pending' ||
       whitespaceResult.body.status === 'at_capacity')) {
    console.log('✅ Whitespace-only honeypot treated as empty');
    passed++;
  } else {
    console.log('❌ Whitespace honeypot incorrectly triggered');
    failed++;
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('\n📊 Honeypot Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All honeypot tests passed!');
  } else {
    console.log('\n⚠️  Some honeypot tests failed.');
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Anti-Abuse Tests\n');
  console.log('API URL:', `${API_URL}${ENDPOINT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  
  try {
    await testRateLimiting();
    await testHoneypot();
    
    console.log('\n\n🏁 All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    process.exit(1);
  }
}

// Check if node-fetch is installed
try {
  runAllTests().catch(console.error);
} catch (error) {
  console.error('Please install node-fetch: npm install node-fetch');
  process.exit(1);
}