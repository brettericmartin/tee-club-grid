#!/usr/bin/env node
/**
 * Test Admin Authorization System
 * Tests the new admin table-based authorization
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase clients
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  console.log('Required: SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY');
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
const anonSupabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Test Results Tracker
 */
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  async test(name, testFn) {
    console.log(`\n🧪 Testing: ${name}`);
    try {
      await testFn();
      console.log(`✅ PASS: ${name}`);
      this.passed++;
    } catch (error) {
      console.log(`❌ FAIL: ${name}`);
      console.log(`   Error: ${error.message}`);
      this.failed++;
    }
    this.tests.push({ name, passed: this.tests.length < this.passed + this.failed });
  }

  summary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📝 Total:  ${this.passed + this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    
    if (this.failed > 0) {
      console.log('\n⚠️  Some tests failed. Check the output above for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
    }
  }
}

/**
 * Helper Functions
 */
async function createTestUser(email, isAdmin = false) {
  // Create user via auth admin API
  const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password: 'test123456',
    email_confirm: true
  });

  if (authError) throw new Error(`Failed to create auth user: ${authError.message}`);

  // Create profile
  const { error: profileError } = await adminSupabase
    .from('profiles')
    .insert({
      id: authUser.user.id,
      email: email,
      display_name: email.split('@')[0]
    });

  if (profileError) throw new Error(`Failed to create profile: ${profileError.message}`);

  // Add to admins table if needed
  if (isAdmin) {
    const { error: adminError } = await adminSupabase
      .from('admins')
      .insert({
        user_id: authUser.user.id,
        notes: 'Test admin user'
      });

    if (adminError) throw new Error(`Failed to create admin: ${adminError.message}`);
  }

  return authUser.user;
}

async function signInUser(email, password = 'test123456') {
  const { data, error } = await anonSupabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw new Error(`Failed to sign in: ${error.message}`);
  return data;
}

async function cleanupTestUsers() {
  // Get all test users
  const { data: users } = await adminSupabase.auth.admin.listUsers();
  
  if (users?.users) {
    for (const user of users.users) {
      if (user.email?.includes('test-admin-auth')) {
        await adminSupabase.auth.admin.deleteUser(user.id);
      }
    }
  }
}

/**
 * Test Admin Table Functions
 */
async function testAdminTableFunctions(runner) {
  await runner.test('Admin table exists and has correct structure', async () => {
    const { data, error } = await adminSupabase
      .from('admins')
      .select('user_id, created_at, notes')
      .limit(1);

    if (error) throw new Error(`Admin table query failed: ${error.message}`);
  });

  await runner.test('current_user_is_admin() function exists', async () => {
    const { data, error } = await adminSupabase.rpc('current_user_is_admin');
    
    // Should return false for service key (no auth.uid())
    if (error) throw new Error(`Function call failed: ${error.message}`);
  });

  await runner.test('is_admin(uuid) function exists', async () => {
    const dummyUuid = '00000000-0000-0000-0000-000000000000';
    const { data, error } = await adminSupabase.rpc('is_admin', { 
      check_user_id: dummyUuid 
    });
    
    if (error) throw new Error(`Function call failed: ${error.message}`);
    if (data !== false) throw new Error('Expected false for non-existent user');
  });
}

/**
 * Test API Endpoint Authorization
 */
async function testAPIAuthorization(runner) {
  // Create test users
  const adminUser = await createTestUser('test-admin-auth-admin@example.com', true);
  const regularUser = await createTestUser('test-admin-auth-regular@example.com', false);

  await runner.test('Admin can access approve endpoint', async () => {
    const { session } = await signInUser('test-admin-auth-admin@example.com');
    
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/waitlist/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        email: 'test-nonexistent@example.com'
      })
    });

    // Should get a 400 or 404 (application not found), not 403 (forbidden)
    if (response.status === 403) {
      throw new Error('Admin was rejected with 403 Forbidden');
    }
  });

  await runner.test('Non-admin gets 403 on approve endpoint', async () => {
    const { session } = await signInUser('test-admin-auth-regular@example.com');
    
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/waitlist/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        email: 'test-nonexistent@example.com'
      })
    });

    if (response.status !== 403) {
      const text = await response.text();
      throw new Error(`Expected 403, got ${response.status}: ${text}`);
    }

    const result = await response.json();
    if (!result.error || result.error !== 'Forbidden') {
      throw new Error('Expected Forbidden error message');
    }
  });

  await runner.test('Unauthenticated request gets 401', async () => {
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/waitlist/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test-nonexistent@example.com'
      })
    });

    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  });
}

/**
 * Test Admin Service Functions
 */
async function testAdminService(runner) {
  const adminUser = await createTestUser('test-admin-auth-service@example.com', true);

  await runner.test('Admin can check their own status', async () => {
    const { session } = await signInUser('test-admin-auth-service@example.com');
    
    // Set up authenticated supabase client
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${session.access_token}` } }
    });

    const { data, error } = await userSupabase
      .from('admins')
      .select('user_id')
      .eq('user_id', adminUser.id)
      .single();

    if (error) throw new Error(`Admin status check failed: ${error.message}`);
    if (!data) throw new Error('Admin not found in admins table');
  });

  await runner.test('RLS prevents non-admin from viewing admins table', async () => {
    const regularUser = await createTestUser('test-admin-auth-rls@example.com', false);
    const { session } = await signInUser('test-admin-auth-rls@example.com');
    
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${session.access_token}` } }
    });

    const { data, error } = await userSupabase
      .from('admins')
      .select('user_id');

    // Should get no data due to RLS, not necessarily an error
    if (data && data.length > 0) {
      throw new Error('Non-admin could view admins table (RLS failed)');
    }
  });
}

/**
 * Test Abuse Metrics Logging
 */
async function testAbuseMetrics(runner) {
  await runner.test('Unauthorized access attempts are logged', async () => {
    const beforeCount = await adminSupabase
      .from('abuse_metrics')
      .select('*', { count: 'exact', head: true })
      .eq('metric_type', 'unauthorized_admin_access');

    // Make unauthorized request
    const regularUser = await createTestUser('test-admin-auth-abuse@example.com', false);
    const { session } = await signInUser('test-admin-auth-abuse@example.com');
    
    await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/waitlist/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ email: 'test@example.com' })
    });

    // Check if logged
    const afterCount = await adminSupabase
      .from('abuse_metrics')
      .select('*', { count: 'exact', head: true })
      .eq('metric_type', 'unauthorized_admin_access');

    if ((afterCount.count || 0) <= (beforeCount.count || 0)) {
      throw new Error('Unauthorized access was not logged to abuse_metrics');
    }
  });
}

/**
 * Main Test Runner
 */
async function runTests() {
  const runner = new TestRunner();

  console.log('🚀 Starting Admin Authorization Tests');
  console.log('=====================================\n');

  try {
    // Clean up any existing test data
    await cleanupTestUsers();

    // Run test suites
    await testAdminTableFunctions(runner);
    await testAPIAuthorization(runner);
    await testAdminService(runner);
    await testAbuseMetrics(runner);

  } catch (error) {
    console.error('💥 Unexpected error in test runner:', error);
    runner.failed++;
  } finally {
    // Cleanup
    await cleanupTestUsers();
    
    // Show summary
    runner.summary();
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}