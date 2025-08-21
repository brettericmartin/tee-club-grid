import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fetch from 'node-fetch';
import { createTestSupabaseClient, generateInviteCode, generateTestUser } from '../utils/test-helpers.js';

describe('Invite Code Redemption - Race Conditions & Idempotency', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3333/api';
  let supabase;
  let testInviteCode;
  let testUserId;
  let authToken;
  
  beforeEach(async () => {
    // Initialize test Supabase client
    supabase = createTestSupabaseClient();
    
    // Create a test user
    const testUser = generateTestUser();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password
    });
    
    if (authData?.user) {
      testUserId = authData.user.id;
      authToken = authData.session?.access_token;
    }
    
    // Create a test invite code
    testInviteCode = generateInviteCode();
    const { error: inviteError } = await supabase
      .from('invite_codes')
      .insert({
        code: testInviteCode,
        created_by: testUserId,
        max_uses: 1,
        uses: 0,
        active: true,
        note: 'Test code for race condition testing'
      });
    
    if (inviteError) {
      console.error('Failed to create test invite code:', inviteError);
    }
  });
  
  afterEach(async () => {
    // Cleanup test data
    if (testInviteCode) {
      await supabase
        .from('invite_codes')
        .delete()
        .eq('code', testInviteCode);
    }
    
    if (testUserId) {
      await supabase
        .from('profiles')
        .update({ beta_access: false, invite_code_used: null })
        .eq('id', testUserId);
    }
  });

  describe('Double-Submit Protection', () => {
    it('should handle rapid double-submit of same invite code', async () => {
      // Simulate user clicking submit button twice rapidly
      const requests = [
        fetch(`${baseUrl}/waitlist/redeem`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ code: testInviteCode })
        }),
        fetch(`${baseUrl}/waitlist/redeem`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ code: testInviteCode })
        })
      ];
      
      // Execute both requests simultaneously
      const responses = await Promise.all(requests);
      const results = await Promise.all(responses.map(r => r.json()));
      
      // One should succeed, one should either succeed (idempotent) or fail gracefully
      const successCount = results.filter(r => r.ok === true).length;
      const successResults = results.filter(r => r.ok === true);
      
      // Should have at least one success
      expect(successCount).toBeGreaterThanOrEqual(1);
      
      // If both succeeded, they should both indicate success (idempotent)
      if (successCount === 2) {
        expect(successResults[0].status).toBeDefined();
        expect(successResults[1].status).toBeDefined();
        
        // At least one should be 'already_approved' (idempotent response)
        const alreadyApproved = successResults.filter(r => r.status === 'already_approved');
        expect(alreadyApproved.length).toBeGreaterThanOrEqual(1);
      }
      
      // Check that the code was only used once
      const { data: inviteCode } = await supabase
        .from('invite_codes')
        .select('uses')
        .eq('code', testInviteCode)
        .single();
      
      expect(inviteCode.uses).toBe(1);
      
      // Check that user has beta access
      const { data: profile } = await supabase
        .from('profiles')
        .select('beta_access')
        .eq('id', testUserId)
        .single();
      
      expect(profile?.beta_access).toBe(true);
    });
    
    it('should be idempotent for already approved users', async () => {
      // First, grant beta access to the user
      await supabase
        .from('profiles')
        .upsert({
          id: testUserId,
          beta_access: true
        });
      
      // Try to redeem an invite code
      const response = await fetch(`${baseUrl}/waitlist/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ code: testInviteCode })
      });
      
      const result = await response.json();
      
      // Should succeed with already_approved status
      expect(response.status).toBe(200);
      expect(result.ok).toBe(true);
      expect(result.status).toBe('already_approved');
      
      // Code should not be used
      const { data: inviteCode } = await supabase
        .from('invite_codes')
        .select('uses')
        .eq('code', testInviteCode)
        .single();
      
      expect(inviteCode.uses).toBe(0);
    });
  });

  describe('Two-Tabs Scenario', () => {
    it('should handle user submitting from two browser tabs', async () => {
      // Create a second test user to simulate two different sessions
      const testUser2 = generateTestUser();
      const { data: authData2 } = await supabase.auth.signUp({
        email: testUser2.email,
        password: testUser2.password
      });
      
      const authToken2 = authData2?.session?.access_token;
      
      // Both users try to redeem the same single-use code simultaneously
      const requests = [
        fetch(`${baseUrl}/waitlist/redeem`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ code: testInviteCode })
        }),
        fetch(`${baseUrl}/waitlist/redeem`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken2}`
          },
          body: JSON.stringify({ code: testInviteCode })
        })
      ];
      
      const responses = await Promise.all(requests);
      const results = await Promise.all(responses.map(r => r.json()));
      
      // Exactly one should succeed
      const successCount = results.filter(r => r.ok === true).length;
      const failureCount = results.filter(r => r.ok === false).length;
      
      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);
      
      // The failure should be due to code exhaustion
      const failure = results.find(r => r.ok === false);
      expect(['code_exhausted', 'invalid_code']).toContain(failure.error);
      
      // Code should be used exactly once
      const { data: inviteCode } = await supabase
        .from('invite_codes')
        .select('uses, last_used_by')
        .eq('code', testInviteCode)
        .single();
      
      expect(inviteCode.uses).toBe(1);
      expect(inviteCode.last_used_by).toBeTruthy();
      
      // Only one user should have beta access
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, beta_access')
        .in('id', [testUserId, authData2.user.id])
        .eq('beta_access', true);
      
      expect(profiles.length).toBe(1);
    });
    
    it('should handle multiple users racing for last spot at capacity', async () => {
      // Set beta cap to current approved + 1
      const { count: currentApproved } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('beta_access', true);
      
      await supabase
        .from('feature_flags')
        .upsert({
          id: 1,
          beta_cap: (currentApproved || 0) + 1
        });
      
      // Create multiple invite codes
      const codes = [];
      for (let i = 0; i < 3; i++) {
        const code = generateInviteCode();
        codes.push(code);
        await supabase
          .from('invite_codes')
          .insert({
            code,
            created_by: testUserId,
            max_uses: 1,
            uses: 0,
            active: true
          });
      }
      
      // Create multiple test users
      const users = [];
      for (let i = 0; i < 3; i++) {
        const user = generateTestUser();
        const { data: authData } = await supabase.auth.signUp({
          email: user.email,
          password: user.password
        });
        users.push({
          id: authData.user.id,
          token: authData.session.access_token,
          code: codes[i]
        });
      }
      
      // All users try to redeem simultaneously
      const requests = users.map(user => 
        fetch(`${baseUrl}/waitlist/redeem`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({ code: user.code })
        })
      );
      
      const responses = await Promise.all(requests);
      const results = await Promise.all(responses.map(r => r.json()));
      
      // Only one should succeed (last spot)
      const successCount = results.filter(r => r.ok === true && r.status === 'approved').length;
      const capacityErrors = results.filter(r => r.error === 'at_capacity').length;
      
      expect(successCount).toBe(1);
      expect(capacityErrors).toBeGreaterThanOrEqual(2);
      
      // Cleanup codes
      await supabase
        .from('invite_codes')
        .delete()
        .in('code', codes);
    });
  });

  describe('Transaction Integrity', () => {
    it('should maintain consistency between invite_codes and profiles tables', async () => {
      // Submit redemption
      const response = await fetch(`${baseUrl}/waitlist/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ code: testInviteCode })
      });
      
      const result = await response.json();
      expect(result.ok).toBe(true);
      
      // Check both tables are in sync
      const { data: inviteCode } = await supabase
        .from('invite_codes')
        .select('uses, last_used_by')
        .eq('code', testInviteCode)
        .single();
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('beta_access, invite_code_used')
        .eq('id', testUserId)
        .single();
      
      // Both should be updated atomically
      expect(inviteCode.uses).toBe(1);
      expect(inviteCode.last_used_by).toBe(testUserId);
      expect(profile.beta_access).toBe(true);
      expect(profile.invite_code_used).toBe(testInviteCode);
    });
    
    it('should rollback on transaction failure', async () => {
      // Create an invite code that will cause a constraint violation
      // (e.g., max_uses = 0)
      const badCode = generateInviteCode();
      await supabase
        .from('invite_codes')
        .insert({
          code: badCode,
          created_by: testUserId,
          max_uses: 0, // Will cause the redemption to fail
          uses: 0,
          active: true
        });
      
      const response = await fetch(`${baseUrl}/waitlist/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ code: badCode })
      });
      
      const result = await response.json();
      expect(result.ok).toBe(false);
      
      // Check that nothing was modified
      const { data: profile } = await supabase
        .from('profiles')
        .select('beta_access, invite_code_used')
        .eq('id', testUserId)
        .single();
      
      expect(profile?.beta_access || false).toBe(false);
      expect(profile?.invite_code_used).toBeNull();
      
      // Cleanup
      await supabase
        .from('invite_codes')
        .delete()
        .eq('code', badCode);
    });
  });

  describe('Edge Cases', () => {
    it('should handle expired invite codes', async () => {
      // Create an expired invite code
      const expiredCode = generateInviteCode();
      await supabase
        .from('invite_codes')
        .insert({
          code: expiredCode,
          created_by: testUserId,
          max_uses: 1,
          uses: 0,
          active: true,
          expires_at: new Date(Date.now() - 1000).toISOString() // Expired 1 second ago
        });
      
      const response = await fetch(`${baseUrl}/waitlist/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ code: expiredCode })
      });
      
      const result = await response.json();
      expect(result.ok).toBe(false);
      expect(result.error).toBe('invalid_code');
      
      // Cleanup
      await supabase
        .from('invite_codes')
        .delete()
        .eq('code', expiredCode);
    });
    
    it('should handle inactive invite codes', async () => {
      // Create an inactive invite code
      const inactiveCode = generateInviteCode();
      await supabase
        .from('invite_codes')
        .insert({
          code: inactiveCode,
          created_by: testUserId,
          max_uses: 1,
          uses: 0,
          active: false // Inactive
        });
      
      const response = await fetch(`${baseUrl}/waitlist/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ code: inactiveCode })
      });
      
      const result = await response.json();
      expect(result.ok).toBe(false);
      expect(result.error).toBe('invalid_code');
      
      // Cleanup
      await supabase
        .from('invite_codes')
        .delete()
        .eq('code', inactiveCode);
    });
    
    it('should handle case-insensitive code redemption', async () => {
      // Try different cases
      const variations = [
        testInviteCode.toLowerCase(),
        testInviteCode.toUpperCase(),
        testInviteCode.substring(0, 4).toLowerCase() + testInviteCode.substring(4).toUpperCase()
      ];
      
      // First variation should succeed
      const response1 = await fetch(`${baseUrl}/waitlist/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ code: variations[0] })
      });
      
      const result1 = await response1.json();
      expect(result1.ok).toBe(true);
      
      // Subsequent variations should be idempotent
      for (let i = 1; i < variations.length; i++) {
        const response = await fetch(`${baseUrl}/waitlist/redeem`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ code: variations[i] })
        });
        
        const result = await response.json();
        expect(result.ok).toBe(true);
        expect(result.status).toBe('already_approved');
      }
    });
  });
});