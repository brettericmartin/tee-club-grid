/**
 * Mock data for testing waitlist and beta access features
 */

// Mock feature flags
export const mockFeatureFlags = {
  betaEnabled: {
    id: 1,
    public_beta_enabled: false,
    beta_cap: 150,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  publicBetaEnabled: {
    id: 1,
    public_beta_enabled: true,
    beta_cap: 150,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  atCapacity: {
    id: 1,
    public_beta_enabled: false,
    beta_cap: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
};

// Mock user profiles
export const mockProfiles = {
  betaUser: {
    id: 'user-beta-123',
    email: 'beta@example.com',
    display_name: 'Beta User',
    beta_access: true,
    invite_quota: 3,
    invites_used: 0,
    city_region: 'San Francisco, CA',
    is_admin: false,
    created_at: '2024-01-01T00:00:00Z'
  },
  regularUser: {
    id: 'user-regular-456',
    email: 'regular@example.com',
    display_name: 'Regular User',
    beta_access: false,
    invite_quota: 0,
    invites_used: 0,
    city_region: 'Austin, TX',
    is_admin: false,
    created_at: '2024-01-01T00:00:00Z'
  },
  adminUser: {
    id: 'user-admin-789',
    email: 'admin@example.com',
    display_name: 'Admin User',
    beta_access: true,
    invite_quota: 10,
    invites_used: 2,
    city_region: 'New York, NY',
    is_admin: true,
    created_at: '2024-01-01T00:00:00Z'
  }
};

// Mock waitlist applications
export const mockApplications = {
  pending: {
    id: 'app-pending-1',
    email: 'pending@example.com',
    display_name: 'Pending User',
    role: 'weekend_warrior',
    city_region: 'Miami, FL',
    handicap: '15',
    favorite_golfer: 'Tiger Woods',
    best_achievement: 'Broke 80',
    why_join: 'Want to share my equipment',
    social_media_handle: '@pendinguser',
    invite_code: null,
    score: 2,
    status: 'pending',
    created_at: '2024-01-15T10:00:00Z'
  },
  highScore: {
    id: 'app-high-2',
    email: 'proscore@example.com',
    display_name: 'Pro Golfer',
    role: 'competitive_player',
    city_region: 'Augusta, GA',
    handicap: '2',
    favorite_golfer: 'Ben Hogan',
    best_achievement: 'Won state championship',
    why_join: 'Connect with serious golfers and showcase tour-level equipment',
    social_media_handle: '@progolfer',
    invite_code: null,
    score: 8,
    status: 'pending',
    created_at: '2024-01-15T11:00:00Z'
  },
  approved: {
    id: 'app-approved-3',
    email: 'approved@example.com',
    display_name: 'Approved User',
    role: 'course_owner',
    city_region: 'Pebble Beach, CA',
    handicap: '5',
    favorite_golfer: 'Jack Nicklaus',
    best_achievement: 'Course record 65',
    why_join: 'Promote our course',
    social_media_handle: '@courseowner',
    invite_code: 'SPECIAL1',
    score: 9,
    status: 'approved',
    approved_at: '2024-01-16T09:00:00Z',
    approved_by: 'user-admin-789',
    created_at: '2024-01-15T12:00:00Z'
  }
};

// Mock invite codes
export const mockInviteCodes = {
  valid: {
    id: 'code-valid-1',
    code: 'GOLF-2024',
    created_by: 'user-beta-123',
    note: 'For friend',
    max_uses: 1,
    uses: 0,
    active: true,
    created_at: '2024-01-10T00:00:00Z'
  },
  used: {
    id: 'code-used-2',
    code: 'USED-CODE',
    created_by: 'user-beta-123',
    note: 'Already used',
    max_uses: 1,
    uses: 1,
    active: true,
    created_at: '2024-01-09T00:00:00Z'
  },
  inactive: {
    id: 'code-inactive-3',
    code: 'DEAD-CODE',
    created_by: 'user-admin-789',
    note: 'Deactivated',
    max_uses: 5,
    uses: 0,
    active: false,
    created_at: '2024-01-08T00:00:00Z'
  },
  multiUse: {
    id: 'code-multi-4',
    code: 'MULTI-USE',
    created_by: 'user-admin-789',
    note: 'Can be used 5 times',
    max_uses: 5,
    uses: 2,
    active: true,
    created_at: '2024-01-07T00:00:00Z'
  }
};

// Mock beta summary responses
export const mockBetaSummary = {
  open: {
    approved: 75,
    pending: 120,
    cap: 150,
    isOpen: true
  },
  nearCapacity: {
    approved: 145,
    pending: 200,
    cap: 150,
    isOpen: true
  },
  atCapacity: {
    approved: 150,
    pending: 250,
    cap: 150,
    isOpen: false
  }
};

// Mock API responses
export const mockApiResponses = {
  submitSuccess: {
    ok: true,
    applicationId: 'app-new-123',
    score: 3,
    status: 'pending',
    message: 'Application submitted successfully'
  },
  submitApproved: {
    ok: true,
    applicationId: 'app-new-456',
    score: 7,
    status: 'approved',
    message: 'Congratulations! You have been approved for beta access'
  },
  submitAtCapacity: {
    ok: true,
    applicationId: 'app-new-789',
    score: 5,
    status: 'at_capacity',
    message: 'Beta is at capacity, but you are on the waitlist'
  },
  approveSuccess: {
    ok: true,
    message: 'Successfully approved user@example.com for beta access',
    profileId: 'profile-new-123'
  },
  redeemSuccess: {
    ok: true,
    status: 'approved',
    message: 'Invite code redeemed successfully'
  },
  validationError: {
    ok: false,
    error: 'Validation failed',
    details: {
      email: 'Invalid email address',
      display_name: 'Display name is required'
    }
  },
  rateLimitError: {
    ok: false,
    error: 'Too many requests',
    message: 'Please wait 60 seconds before trying again',
    retryAfter: 60
  },
  capacityError: {
    ok: false,
    error: 'at_capacity',
    message: 'Beta is at capacity (150/150). Cannot approve more users.'
  }
};

// Mock form data
export const mockFormData = {
  minimal: {
    display_name: 'Test User',
    email: 'test@example.com',
    role: 'casual_player',
    city_region: 'Test City, ST'
  },
  complete: {
    display_name: 'Complete User',
    email: 'complete@example.com',
    role: 'competitive_player',
    city_region: 'Full City, ST',
    handicap: '5',
    favorite_golfer: 'Tiger Woods',
    best_achievement: 'Hole in one on par 4',
    why_join: 'Love the game and want to share my passion',
    social_media_handle: '@completegolfer',
    invite_code: 'TEST-CODE'
  },
  invalid: {
    display_name: '',
    email: 'not-an-email',
    role: 'invalid_role',
    city_region: ''
  }
};

// Mock analytics events
export const mockAnalyticsEvents = {
  waitlistView: {
    eventName: 'waitlist_view',
    properties: {
      source: 'direct',
      referrer: null
    }
  },
  waitlistSubmit: {
    eventName: 'waitlist_submit',
    properties: {
      role: 'weekend_warrior',
      score: 3,
      hasInviteCode: false,
      city: 'San Francisco, CA'
    }
  },
  waitlistApproved: {
    eventName: 'waitlist_approved',
    properties: {
      score: 7,
      autoApproved: true
    }
  },
  inviteRedeemed: {
    eventName: 'invite_redeemed',
    properties: {
      code: 'GOLF-2024',
      success: true
    }
  },
  betaSummaryView: {
    eventName: 'beta_summary_view',
    properties: {
      approved: 75,
      pending: 120,
      cap: 150,
      isOpen: true
    }
  }
};

// Mock email templates data
export const mockEmailData = {
  pending: {
    email: 'pending@example.com',
    displayName: 'Pending User',
    score: 3,
    position: 42
  },
  approved: {
    email: 'approved@example.com',
    displayName: 'Approved User',
    inviteCode: 'WELCOME1'
  },
  invitePack: {
    email: 'inviter@example.com',
    displayName: 'Inviter User',
    inviteCodes: ['CODE-1234', 'CODE-5678', 'CODE-9012']
  }
};

// Mock test scenarios
export const testScenarios = {
  newUserFlow: {
    description: 'New user applies and gets pending status',
    input: mockFormData.minimal,
    expectedResponse: mockApiResponses.submitSuccess,
    expectedAnalytics: [
      mockAnalyticsEvents.waitlistView,
      mockAnalyticsEvents.waitlistSubmit
    ]
  },
  highScoreAutoApproval: {
    description: 'High score user gets auto-approved',
    input: mockFormData.complete,
    expectedResponse: mockApiResponses.submitApproved,
    expectedAnalytics: [
      mockAnalyticsEvents.waitlistView,
      mockAnalyticsEvents.waitlistSubmit,
      mockAnalyticsEvents.waitlistApproved
    ]
  },
  capacityLimit: {
    description: 'User applies when beta is at capacity',
    input: mockFormData.minimal,
    expectedResponse: mockApiResponses.submitAtCapacity,
    expectedAnalytics: [
      mockAnalyticsEvents.waitlistView,
      mockAnalyticsEvents.waitlistSubmit
    ]
  },
  inviteCodeRedemption: {
    description: 'User redeems valid invite code',
    input: {
      code: 'GOLF-2024',
      email: 'invited@example.com'
    },
    expectedResponse: mockApiResponses.redeemSuccess,
    expectedAnalytics: [
      mockAnalyticsEvents.inviteRedeemed
    ]
  }
};

// Export all mock data
export default {
  featureFlags: mockFeatureFlags,
  profiles: mockProfiles,
  applications: mockApplications,
  inviteCodes: mockInviteCodes,
  betaSummary: mockBetaSummary,
  apiResponses: mockApiResponses,
  formData: mockFormData,
  analyticsEvents: mockAnalyticsEvents,
  emailData: mockEmailData,
  scenarios: testScenarios
};