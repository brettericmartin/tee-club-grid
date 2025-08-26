# Beta Waitlist & Referral System Audit - Teed.club

## Executive Summary
Current implementation is a mistaken external API access program that needs correction to a proper beta USER waitlist + referral system with visible demand-supply tension (Daniel Priestley style).

## 🗂️ Current System Inventory

### Database Tables & Schema

#### Core Tables
1. **profiles**
   - `id` (UUID) - Primary key, references auth.users
   - `email` (TEXT) - User email
   - `display_name` (TEXT) - User display name  
   - `beta_access` (BOOLEAN) - Whether user has beta access
   - `is_admin` (BOOLEAN) - Admin flag
   - `invite_quota` (INT) - Number of invites user can send (default: 3)
   - `invites_used` (INT) - Number of invites used (default: 0)
   - `referral_code` (TEXT UNIQUE) - User's unique referral code
   - `deleted_at` (TIMESTAMPTZ) - Soft delete timestamp
   - `tips_enabled` (BOOLEAN) - Feature flag for tips (default: true)

2. **invite_codes**
   - `code` (TEXT) - Primary key, invite code
   - `created_by` (UUID) - References profiles(id)
   - `note` (TEXT) - Optional note
   - `max_uses` (INT) - Maximum uses allowed (default: 1)
   - `uses` (INT) - Current uses (default: 0)
   - `active` (BOOLEAN) - Whether code is active
   - `expires_at` (TIMESTAMPTZ) - Expiration date
   - `created_at` (TIMESTAMPTZ) - Creation timestamp

3. **waitlist_applications**
   - `id` (UUID) - Primary key
   - `email` (TEXT) - Applicant email (unique, case-insensitive)
   - `display_name` (TEXT) - Desired display name
   - `city_region` (TEXT) - Location
   - `answers` (JSONB) - Full application answers
   - `score` (INT) - Application score (0-100)
   - `status` (TEXT) - 'pending', 'approved', 'rejected'
   - `referred_by` (UUID) - References profiles(id)
   - `created_at` (TIMESTAMPTZ)
   - `approved_at` (TIMESTAMPTZ) - When approved

4. **feature_flags**
   - `id` (INT) - Singleton (always 1)
   - `public_beta_enabled` (BOOLEAN) - Whether beta is public
   - `beta_cap` (INT) - Maximum beta users (default: 150)
   - `updated_at` (TIMESTAMPTZ)

### API Endpoints

#### `/api/waitlist/submit` (POST)
- Handles waitlist form submissions
- Scoring system (0-100 points based on answers)
- Auto-approval for high scores if capacity available
- Invite code validation
- Honeypot protection
- Rate limiting (10/min, burst 30)
- Email confirmation check for authenticated users

#### `/api/beta/redeem` (POST) - **AUTHENTICATED**
- Redeems invite codes for authenticated users
- Atomic operations with optimistic locking
- Grants beta access + 3 invites
- Tracks referrer's invites_used

#### `/api/beta/summary` (GET) - **PUBLIC**
- Returns beta statistics:
  - Current capacity and usage
  - Active vs total users (soft delete aware)
  - Waitlist count
  - Public beta status
- 1-minute cache

#### `/api/waitlist/approve` (POST) - **ADMIN ONLY**
- Manually approve waitlist applications
- Sends approval emails with invite codes

### Frontend Components

#### Auth Guards
- **`BetaGuard`** (`/src/components/auth/BetaGuard.tsx`)
  - Protects routes requiring beta access
  - Checks feature_flags.public_beta_enabled
  - Grants access to admins automatically
  - 5-minute cache for feature flags
  - Currently only protects `/my-bag` route

- **`AdminGuard`** (`/src/components/auth/AdminGuard.tsx`)
  - Protects admin routes
  - Checks profile.is_admin

#### Waitlist UI
- **`WaitlistPage`** (`/src/pages/Waitlist.tsx`)
  - Main waitlist landing page
  - Captures invite codes from URL params
  - Stores codes in localStorage for later redemption
  - Shows success states after submission

- **`WaitlistForm`** (`/src/components/waitlist/WaitlistForm.tsx`)
  - Multi-question application form
  - Honeypot field protection
  - Terms acceptance required

- **`WaitlistBanner`** (`/src/components/waitlist/WaitlistBanner.tsx`)
  - Live counter showing spots remaining
  - Fetches from `/api/beta/summary`

- **`WaitlistAdmin`** (`/src/pages/admin/WaitlistAdmin.tsx`)
  - Admin dashboard for managing applications
  - Filtering, sorting, bulk actions
  - Manual approval/rejection

### Utility Systems

#### Referral Capture (`/src/utils/referralCapture.ts`)
- Captures URL params: `?code=`, `?invite=`, `?ref=`, `?referral=`
- Stores in localStorage for post-auth redemption
- 30-day expiration
- Auto-cleans URL after capture

#### Scoring System (`/src/lib/waitlist.ts`)
- Point allocation:
  - Role (player/coach/pro): 20-40 points
  - Sharing frequency: 0-15 points
  - Equipment spending: 5-15 points
  - Social channels: 5-10 points
  - Location (major cities): 5 points
  - Invite code: +20 bonus
- Auto-approval threshold: 75+ points

### Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_KEY` - Service role key (server-side only)

## 🚨 Critical Gaps & Issues

### 1. **Limited Route Protection**
- Only `/my-bag` is protected by BetaGuard
- Most app features are publicly accessible
- No systematic feature gating

### 2. **Missing Referral Tracking**
- `referral_code` column exists but unused
- No generation of user referral codes
- No tracking of referral chains
- No rewards for successful referrals

### 3. **✅ IMPLEMENTED - Invite System**
- ✅ Full "My Invites" dashboard at `/my-invites`
- ✅ Generate and manage invite codes with quota enforcement
- ✅ Track referred users with privacy controls
- ✅ Real-time statistics and viral coefficient tracking
- ✅ Social sharing integration
- ✅ Revoke functionality for unused codes
- ✅ Progress tracking toward bonus invites

### 4. **No Demand-Supply Visibility**
- Live counter exists but hidden on most pages
- No public leaderboard or queue position
- No urgency creation mechanisms

### 5. **Missing Email Flows**
- Basic approval/pending emails exist
- No referral success notifications
- No milestone celebration emails
- No re-engagement campaigns

### 6. **Analytics Gaps**
- Basic tracking exists but incomplete
- No cohort analysis
- No referral attribution tracking
- No conversion funnel metrics

## 🎯 Recommended Action Plan

### Phase 1: Foundation (Week 1)
1. **Expand BetaGuard Coverage**
   - Protect all create/write features
   - Add feature-specific gating
   - Implement progressive access levels

2. **Generate User Referral Codes**
   - Auto-generate on profile creation
   - Add to user profiles/settings
   - Create shareable referral URLs

3. **✅ COMPLETED - Build Invite Dashboard**
   - ✅ "My Invites" page accessible from profile dropdown
   - ✅ Shows remaining quota with visual progress bar
   - ✅ Lists invited users with privacy controls
   - ✅ Generate, manage, and revoke invite codes
   - ✅ Social sharing integration
   - ✅ Real-time statistics dashboard

### Phase 2: Visibility (Week 2)
4. **Create Public Waitlist Page**
   - Live queue position for pending users
   - Animated progress bar to capacity
   - Recent approvals feed
   - "X spots left today" urgency

5. **Add Referral Leaderboard**
   - Top referrers showcase
   - Badges for referral milestones
   - Social proof elements

6. **Implement Smart Notifications**
   - "Your friend joined!" alerts
   - "You're next in line" emails
   - "Last chance" capacity warnings

### Phase 3: Gamification (Week 3)
7. **Referral Rewards System**
   - +1 invite for each successful referral
   - Special badges for top referrers
   - Early access to new features
   - Potential revenue share for affiliates

8. **Queue Jumping Mechanics**
   - Share to skip ahead
   - Complete profile for bonus points
   - Add equipment for priority

9. **Social Proof Integration**
   - "Invited by @username" tags
   - Referral chains visualization
   - Community growth metrics

### Phase 4: Optimization (Week 4)
10. **A/B Testing Framework**
    - Test auto-approval thresholds
    - Optimize scoring weights
    - Experiment with capacity limits

11. **Advanced Analytics**
    - Referral attribution tracking
    - Cohort retention analysis
    - Viral coefficient calculation
    - LTV by acquisition channel

12. **Automated Campaigns**
    - Drip campaigns for pending users
    - Re-engagement for stale applications
    - Celebration emails for milestones

## 📊 Success Metrics

### Primary KPIs
- **Viral Coefficient**: Aim for >1.0
- **Invite Acceptance Rate**: Target 40%+
- **Time to Activation**: <24 hours
- **Referral-Driven Signups**: >50%

### Secondary Metrics
- Queue abandonment rate
- Average queue time
- Referrals per user
- Social share rate
- Email engagement rates

## 🛠️ Technical Debt to Address

1. **Database Migrations**
   - Add missing indexes on email columns
   - Create referral_chains table
   - Add analytics event tables

2. **API Improvements**
   - Implement proper transaction handling
   - Add webhook support for events
   - Create batch operations for admin

3. **Frontend Refactoring**
   - Extract waitlist logic to custom hooks
   - Implement proper error boundaries
   - Add optimistic UI updates

4. **Testing Coverage**
   - Unit tests for scoring algorithm
   - E2E tests for referral flows
   - Load testing for capacity limits

## 🚀 Quick Wins (Implement Today)

1. **Make BetaGuard protect more routes**
   - `/feed` (posting only)
   - `/equipment` (submissions)
   - `/forum` (creating threads)

2. **Add waitlist position to pending page**
   - Simple "You're #X in line"
   - "Approximately X days wait"

3. **Show referral code in user profile**
   - Generate if missing
   - Copy button with toast
   - Share buttons for social

4. **Add capacity widget to landing page**
   - "Only X spots left!"
   - Live countdown
   - Recent joins ticker

5. **Email subject line optimization**
   - A/B test urgency vs exclusivity
   - Personalize with name/location
   - Add emoji for mobile visibility

## Risk Mitigation

### Privacy Concerns
- Hash emails in logs
- Allow anonymous referrals
- GDPR-compliant data handling
- Clear data retention policies

### Spam Prevention
- Rate limiting on all endpoints
- Honeypot fields in forms
- Email verification required
- IP-based abuse detection

### Scalability
- Database connection pooling
- Redis caching for counters
- CDN for static assets
- Queue system for emails

## Implementation Priority

**MUST HAVE (P0)**
- Expand route protection
- Generate referral codes
- Basic invite dashboard
- Waitlist position display

**SHOULD HAVE (P1)**
- Public leaderboard
- Email notifications
- Social sharing
- Queue jumping

**NICE TO HAVE (P2)**
- Advanced analytics
- A/B testing
- Automated campaigns
- Gamification badges

## Conclusion

The current system has solid foundations but lacks the viral mechanics and visibility needed for a Priestley-style waitlist. The recommended changes will create genuine scarcity, social proof, and referral incentives while maintaining the existing scoring and approval logic.

Key success factor: Make the waitlist itself a desirable product through gamification, community, and visible progress toward access.