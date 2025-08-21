/**
 * Test utilities and helpers for waitlist/beta testing
 */

import { createClient } from '@supabase/supabase-js';

// Initialize test Supabase client
export function createTestSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'test-service-key';
  return createClient(supabaseUrl, supabaseKey);
}

// Generate test user data
export function generateTestUser(overrides = {}) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  
  return {
    email: `test-${timestamp}-${random}@example.com`,
    display_name: `Test User ${random}`,
    password: 'TestPassword123!',
    ...overrides
  };
}

// Generate waitlist application data
export function generateWaitlistApplication(overrides = {}) {
  const roles = ['competitive_player', 'weekend_warrior', 'casual_player', 'course_owner', 'industry_professional'];
  const cities = ['San Francisco, CA', 'Austin, TX', 'New York, NY', 'Miami, FL', 'Seattle, WA'];
  
  return {
    display_name: `Applicant ${Date.now()}`,
    email: `applicant-${Date.now()}@example.com`,
    role: roles[Math.floor(Math.random() * roles.length)],
    city_region: cities[Math.floor(Math.random() * cities.length)],
    handicap: Math.floor(Math.random() * 36).toString(),
    favorite_golfer: 'Tiger Woods',
    best_achievement: 'Broke 80 for the first time',
    why_join: 'Love golf and want to share my equipment setup',
    social_media_handle: '@testgolfer',
    invite_code: null,
    ...overrides
  };
}

// Generate high-score application (auto-approval candidate)
export function generateHighScoreApplication(overrides = {}) {
  return generateWaitlistApplication({
    role: 'course_owner',
    handicap: '2',
    best_achievement: 'Won multiple club championships',
    why_join: 'Want to promote our course and connect with serious golfers',
    social_media_handle: '@progolfcourse',
    ...overrides
  });
}

// Generate invite code
export function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Clean up test data
export async function cleanupTestData(supabase, testEmails = []) {
  const cleanup = [];
  
  // Delete test waitlist applications
  if (testEmails.length > 0) {
    cleanup.push(
      supabase
        .from('waitlist_applications')
        .delete()
        .in('email', testEmails)
    );
    
    // Delete test profiles
    cleanup.push(
      supabase
        .from('profiles')
        .delete()
        .in('email', testEmails)
    );
  }
  
  await Promise.all(cleanup);
}

// Wait for condition with timeout
export async function waitForCondition(
  conditionFn,
  timeoutMs = 5000,
  intervalMs = 100
) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (await conditionFn()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

// Mock API responses
export function mockApiResponse(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({
      'content-type': 'application/json'
    })
  };
}

// Create mock fetch for testing
export function createMockFetch(responses = {}) {
  return async (url, options = {}) => {
    const method = options.method || 'GET';
    const path = new URL(url).pathname;
    const key = `${method} ${path}`;
    
    if (responses[key]) {
      const response = responses[key];
      if (typeof response === 'function') {
        return response(url, options);
      }
      return mockApiResponse(200, response);
    }
    
    // Default 404 for unmocked endpoints
    return mockApiResponse(404, { error: 'Not found' });
  };
}

// Analytics event tracker for testing
export class TestAnalyticsTracker {
  constructor() {
    this.events = [];
  }
  
  track(eventName, properties = {}) {
    this.events.push({
      eventName,
      properties,
      timestamp: new Date().toISOString()
    });
  }
  
  getEvents(eventName = null) {
    if (eventName) {
      return this.events.filter(e => e.eventName === eventName);
    }
    return this.events;
  }
  
  clear() {
    this.events = [];
  }
  
  hasEvent(eventName, properties = null) {
    const events = this.getEvents(eventName);
    if (properties) {
      return events.some(e => 
        Object.entries(properties).every(([key, value]) => 
          e.properties[key] === value
        )
      );
    }
    return events.length > 0;
  }
}

// Test authentication helper
export async function authenticateTestUser(supabase, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
  
  return data;
}

// Create test admin user
export async function createTestAdmin(supabase) {
  const user = generateTestUser({
    email: `admin-${Date.now()}@example.com`,
    display_name: 'Test Admin'
  });
  
  // Create user account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: user.email,
    password: user.password
  });
  
  if (authError) {
    throw new Error(`Failed to create admin user: ${authError.message}`);
  }
  
  // Update profile to be admin
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_admin: true })
    .eq('id', authData.user.id);
  
  if (profileError) {
    throw new Error(`Failed to set admin status: ${profileError.message}`);
  }
  
  return {
    ...user,
    id: authData.user.id,
    session: authData.session
  };
}

// Seed test data
export async function seedTestData(supabase, options = {}) {
  const {
    numApplications = 10,
    numApproved = 3,
    numInviteCodes = 5
  } = options;
  
  const testData = {
    applications: [],
    profiles: [],
    inviteCodes: []
  };
  
  // Create waitlist applications
  for (let i = 0; i < numApplications; i++) {
    const app = generateWaitlistApplication();
    const { data, error } = await supabase
      .from('waitlist_applications')
      .insert(app)
      .select()
      .single();
    
    if (!error) {
      testData.applications.push(data);
    }
  }
  
  // Approve some applications
  for (let i = 0; i < Math.min(numApproved, testData.applications.length); i++) {
    const app = testData.applications[i];
    
    // Create profile with beta access
    const { data: profile } = await supabase
      .from('profiles')
      .insert({
        email: app.email,
        display_name: app.display_name,
        beta_access: true,
        invite_quota: 3
      })
      .select()
      .single();
    
    if (profile) {
      testData.profiles.push(profile);
    }
    
    // Update application status
    await supabase
      .from('waitlist_applications')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', app.id);
  }
  
  // Create invite codes
  for (let i = 0; i < numInviteCodes; i++) {
    const code = generateInviteCode();
    const { data } = await supabase
      .from('invite_codes')
      .insert({
        code,
        created_by: testData.profiles[0]?.id,
        max_uses: 1,
        uses: 0,
        active: true
      })
      .select()
      .single();
    
    if (data) {
      testData.inviteCodes.push(data);
    }
  }
  
  return testData;
}

// Performance measurement helper
export class PerformanceMonitor {
  constructor() {
    this.marks = {};
    this.measures = [];
  }
  
  mark(name) {
    this.marks[name] = performance.now();
  }
  
  measure(name, startMark, endMark = null) {
    const start = this.marks[startMark];
    const end = endMark ? this.marks[endMark] : performance.now();
    
    if (!start) {
      throw new Error(`Start mark '${startMark}' not found`);
    }
    
    const duration = end - start;
    this.measures.push({
      name,
      duration,
      start,
      end
    });
    
    return duration;
  }
  
  getMeasure(name) {
    return this.measures.find(m => m.name === name);
  }
  
  getAllMeasures() {
    return this.measures;
  }
  
  clear() {
    this.marks = {};
    this.measures = [];
  }
}

// Export all utilities
export default {
  createTestSupabaseClient,
  generateTestUser,
  generateWaitlistApplication,
  generateHighScoreApplication,
  generateInviteCode,
  cleanupTestData,
  waitForCondition,
  mockApiResponse,
  createMockFetch,
  TestAnalyticsTracker,
  authenticateTestUser,
  createTestAdmin,
  seedTestData,
  PerformanceMonitor
};