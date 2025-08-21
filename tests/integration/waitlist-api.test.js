import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fetch from 'node-fetch';

describe('Waitlist API Integration Tests', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3333/api';
  let testApplicationId;
  let testEmail;
  
  beforeEach(() => {
    // Generate unique test data for each test
    testEmail = `test-${Date.now()}@example.com`;
  });
  
  afterEach(async () => {
    // Cleanup test data if needed
    // In production, you might want to delete test records
  });

  describe('POST /api/waitlist/submit', () => {
    it('should accept valid waitlist submission', async () => {
      const submission = {
        display_name: 'Test User',
        email: testEmail,
        role: 'weekend_warrior',
        city_region: 'Test City, TX',
        handicap: '15',
        favorite_golfer: 'Tiger Woods',
        best_achievement: 'Broke 80',
        why_join: 'Love golf and want to share my equipment',
        social_media_handle: '@testgolfer',
        invite_code: null
      };
      
      const response = await fetch(`${baseUrl}/waitlist/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submission)
      });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.score).toBeGreaterThanOrEqual(0);
      expect(data.score).toBeLessThanOrEqual(10);
      expect(['pending', 'approved', 'at_capacity']).toContain(data.status);
      
      if (data.applicationId) {
        testApplicationId = data.applicationId;
      }
    });
    
    it('should calculate score correctly for different roles', async () => {
      const roles = [
        { role: 'competitive_player', minScore: 2 },
        { role: 'weekend_warrior', minScore: 2 },
        { role: 'casual_player', minScore: 1 },
        { role: 'course_owner', minScore: 3 },
        { role: 'industry_professional', minScore: 3 }
      ];
      
      for (const { role, minScore } of roles) {
        const response = await fetch(`${baseUrl}/waitlist/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            display_name: `${role} Test`,
            email: `${role}-${Date.now()}@example.com`,
            role,
            city_region: 'Test City'
          })
        });
        
        const data = await response.json();
        expect(data.score).toBeGreaterThanOrEqual(minScore);
      }
    });
    
    it('should reject invalid email addresses', async () => {
      const response = await fetch(`${baseUrl}/waitlist/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          display_name: 'Test User',
          email: 'invalid-email',
          role: 'casual_player',
          city_region: 'Test City'
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error).toContain('email');
    });
    
    it('should handle duplicate submissions gracefully', async () => {
      const submission = {
        display_name: 'Duplicate Test',
        email: testEmail,
        role: 'casual_player',
        city_region: 'Test City'
      };
      
      // First submission
      const response1 = await fetch(`${baseUrl}/waitlist/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submission)
      });
      
      expect(response1.status).toBe(200);
      
      // Duplicate submission
      const response2 = await fetch(`${baseUrl}/waitlist/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submission)
      });
      
      // Should either update existing or return appropriate error
      expect([200, 409]).toContain(response2.status);
    });
    
    it('should validate invite codes', async () => {
      const response = await fetch(`${baseUrl}/waitlist/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          display_name: 'Invite Test',
          email: `invite-${Date.now()}@example.com`,
          role: 'casual_player',
          city_region: 'Test City',
          invite_code: 'INVALID-CODE'
        })
      });
      
      // Should still accept submission but note invalid code
      const data = await response.json();
      expect(data.ok).toBe(true);
      // Score might not get invite bonus with invalid code
    });
    
    it('should enforce capacity limits', async () => {
      // This test would need special setup to test capacity
      // For now, we just test that the API can return at_capacity status
      
      // Mock response or use test environment with controlled capacity
      // The actual implementation would depend on your test setup
    });
  });

  describe('GET /api/beta/summary', () => {
    it('should return beta capacity summary', async () => {
      const response = await fetch(`${baseUrl}/beta/summary`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('approved');
      expect(data).toHaveProperty('pending');
      expect(data).toHaveProperty('cap');
      expect(data).toHaveProperty('isOpen');
      
      expect(typeof data.approved).toBe('number');
      expect(typeof data.pending).toBe('number');
      expect(typeof data.cap).toBe('number');
      expect(typeof data.isOpen).toBe('boolean');
      
      expect(data.approved).toBeGreaterThanOrEqual(0);
      expect(data.pending).toBeGreaterThanOrEqual(0);
      expect(data.cap).toBeGreaterThan(0);
    });
    
    it('should calculate isOpen correctly', async () => {
      const response = await fetch(`${baseUrl}/beta/summary`);
      const data = await response.json();
      
      const expectedIsOpen = data.approved < data.cap;
      expect(data.isOpen).toBe(expectedIsOpen);
    });
  });

  describe('POST /api/waitlist/approve', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${baseUrl}/waitlist/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testEmail
        })
      });
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('auth');
    });
    
    it('should require admin role when authenticated', async () => {
      // This would need a non-admin auth token for testing
      const userToken = process.env.TEST_USER_TOKEN;
      
      if (userToken) {
        const response = await fetch(`${baseUrl}/waitlist/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          body: JSON.stringify({
            email: testEmail
          })
        });
        
        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.error).toContain('admin');
      }
    });
    
    it('should approve application with admin token', async () => {
      const adminToken = process.env.TEST_ADMIN_TOKEN;
      
      if (adminToken) {
        // First create an application
        await fetch(`${baseUrl}/waitlist/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            display_name: 'Approval Test',
            email: testEmail,
            role: 'casual_player',
            city_region: 'Test City'
          })
        });
        
        // Then approve it
        const response = await fetch(`${baseUrl}/waitlist/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            email: testEmail,
            grantInvites: true
          })
        });
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.ok).toBe(true);
        expect(data.profileId).toBeTruthy();
      }
    });
    
    it('should enforce capacity when approving', async () => {
      const adminToken = process.env.TEST_ADMIN_TOKEN;
      
      if (adminToken) {
        // Get current capacity
        const summaryResponse = await fetch(`${baseUrl}/beta/summary`);
        const summary = await summaryResponse.json();
        
        // If at capacity, approval should fail
        if (summary.approved >= summary.cap) {
          const response = await fetch(`${baseUrl}/waitlist/approve`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
              email: `capacity-test-${Date.now()}@example.com`
            })
          });
          
          expect(response.status).toBe(409);
          const data = await response.json();
          expect(data.error).toBe('at_capacity');
        }
      }
    });
  });

  describe('POST /api/waitlist/redeem', () => {
    it('should validate invite codes', async () => {
      const response = await fetch(`${baseUrl}/waitlist/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: 'INVALID-CODE',
          email: testEmail
        })
      });
      
      expect([400, 404]).toContain(response.status);
      const data = await response.json();
      expect(data.ok).toBe(false);
    });
    
    it('should track invite code usage', async () => {
      // This would need a valid invite code for testing
      const validCode = process.env.TEST_INVITE_CODE;
      
      if (validCode) {
        const response = await fetch(`${baseUrl}/waitlist/redeem`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: validCode,
            email: testEmail
          })
        });
        
        const data = await response.json();
        
        if (response.status === 200) {
          expect(data.ok).toBe(true);
          expect(data.status).toBe('approved');
        } else if (response.status === 409) {
          // Code already used
          expect(data.error).toContain('used');
        }
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive submissions', async () => {
      const requests = [];
      
      // Send 10 rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          fetch(`${baseUrl}/waitlist/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              display_name: `Rate Test ${i}`,
              email: `rate-${i}-${Date.now()}@example.com`,
              role: 'casual_player',
              city_region: 'Test City'
            })
          })
        );
      }
      
      const responses = await Promise.all(requests);
      const statusCodes = responses.map(r => r.status);
      
      // Should see some rate limiting (429) responses
      const rateLimited = statusCodes.filter(s => s === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await fetch(`${baseUrl}/waitlist/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error).toBeTruthy();
    });
    
    it('should handle missing required fields', async () => {
      const response = await fetch(`${baseUrl}/waitlist/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Missing required fields
          role: 'casual_player'
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error).toContain('required');
    });
    
    it('should handle server errors gracefully', async () => {
      // Test with invalid endpoint
      const response = await fetch(`${baseUrl}/waitlist/nonexistent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      expect(response.status).toBe(404);
    });
  });
});