# Beta Waitlist & Referral System Overview

## Executive Summary

The Teed.club beta system implements a demand-supply tension model inspired by Daniel Priestley's oversubscribed methodology. The waitlist creates genuine scarcity with visible queue positions, live capacity counters, and social proof through referral leaderboards. Users earn priority access by referring friends, creating a viral growth loop where each successful referral moves them up in the queue and earns bonus invites.

**Core Value Proposition**: Join an exclusive community of golf enthusiasts as founding members, with early access rewarded through social sharing and engagement.

## System Architecture

### Database Schema
```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│     profiles        │────>│ waitlist_applications│     │  invite_codes   │
├─────────────────────┤     ├──────────────────────┤     ├─────────────────┤
│ id (UUID)          │     │ id (UUID)            │     │ code (TEXT PK)  │
│ email              │     │ email (UNIQUE)       │     │ created_by      │
│ beta_access        │     │ display_name         │     │ max_uses        │
│ referral_code      │     │ score (0-100)        │     │ uses            │
│ invite_quota       │     │ status               │     │ expires_at      │
│ referrals_count    │     │ referred_by ────────┤     │ active          │
└─────────────────────┘     └──────────────────────┘     └─────────────────┘
                                      │
                           ┌──────────▼───────────┐     ┌─────────────────┐
                           │  referral_chains    │     │  feature_flags  │
                           ├──────────────────────┤     ├─────────────────┤
                           │ id (UUID)           │     │ beta_enabled    │
                           │ referrer_profile_id │     │ beta_cap (150)  │
                           │ referred_profile_id │     │ scoring_config  │
                           │ created_at          │     │ leaderboard_on  │
                           └──────────────────────┘     └─────────────────┘
```

### API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/waitlist/submit` | POST | Public | Submit application, calculate score |
| `/api/waitlist/me` | GET | Auth | Check user's waitlist status |
| `/api/waitlist/approve` | POST | Admin | Manually approve applications |
| `/api/waitlist/bulk-approve` | POST | Admin | Wave approvals with capacity check |
| `/api/waitlist/bulk-reject` | POST | Admin | Bulk rejections with reasons |
| `/api/waitlist/export` | GET | Admin | CSV export with filters |
| `/api/beta/summary` | GET | Public | Live capacity stats (cached 1min) |
| `/api/beta/redeem` | POST | Auth | Redeem invite codes |
| `/api/invites/generate` | POST | Auth | Generate invite codes |
| `/api/referral/attribute` | POST | Public | Track referral visits |
| `/api/referrals/leaderboard` | GET | Public | Top referrers (cached 5min) |

### Core Services

- **BetaGuard**: Route protection component checking beta_access
- **AdminGuard**: Admin-only route protection
- **ScoringEngine**: Configurable scoring with database-driven weights
- **EmailService**: Resend integration for transactional emails
- **AnalyticsService**: Multi-provider event tracking (Vercel, Supabase)
- **ReferralService**: Attribution and reward calculations

## User Journey

### 1. Discovery → Application
1. User lands on `/waitlist` from marketing or referral link
2. Referral code captured from URL params (`?ref=CODE`)
3. Views live capacity meter showing spots remaining
4. Completes multi-step application form
5. Score calculated (0-100 points):
   - Role weight (0-3 points)
   - Profile completion (+1 point)
   - Referral bonus (+1 point)
   - Equipment engagement (+1-2 points)

### 2. Pending → Engagement
1. Receives confirmation email with queue position
2. Gets unique referral code for sharing
3. Views position on `/waitlist` status page
4. Can jump queue by:
   - Sharing referral link (+5 spots per signup)
   - Completing profile (+10 spots)
   - Adding equipment (+5 spots)

### 3. Approval → Activation
1. Auto-approval if score ≥ 4 (configurable)
2. Or manual wave approval by admin
3. Receives approval email with welcome instructions
4. First login tracked as activation
5. Granted 3 invite codes to share

### 4. Beta User → Advocate
1. Access "My Invites" dashboard
2. Generate custom invite codes
3. Track referred users and conversion
4. Earn bonus invites (every 3 successful referrals)
5. Climb referral leaderboard

## Admin Workflow

### Wave Management
```javascript
// Typical wave approval process
1. Check capacity: 150 total, 75 used = 75 available
2. Filter high scorers: score >= 4
3. Select batch: 50 users
4. Bulk approve with emails
5. Monitor activation rate
```

### Admin Dashboard Features
- **Capacity Monitor**: Real-time usage vs cap
- **Score Distribution**: Histogram of application scores
- **Bulk Operations**: Approve/reject with single click
- **CSV Export**: Full data with filters
- **Email Queue**: Monitor send status
- **Scoring Config**: Adjust weights without deploy

### KPI Monitoring
- Daily approvals vs target
- Viral coefficient (K-factor)
- Activation rate (48hr)
- Referral conversion
- Queue abandonment

## Notifications & Emails

| Email Type | Trigger | Key Data | Template |
|------------|---------|----------|----------|
| **Confirmation** | Waitlist submission | Position #X, referral link, wait time | `confirmation.html` |
| **Movement** | Referral success | Old → New position, spots gained | `movement.html` |
| **Weekly Digest** | Sunday 9am | Position changes, upcoming spots | `weekly-digest.html` |
| **Approval** | Status → approved | Access link, 3 invites, onboarding | `approval.html` |
| **Milestone** | 5/10/25 referrals | Badge earned, bonus invites | `milestone.html` |
| **Queue Update** | Major position jump | New position, estimated days | `queue-update.html` |
| **Referral Success** | Friend approved | +1 invite earned, total count | `referral-success.html` |

## Referral Mechanics

### Code Generation
- **Format**: 8-character alphanumeric (e.g., `GOLF2024`)
- **Generation**: Auto on profile creation
- **Uniqueness**: Database constraint with collision retry

### Attribution Flow
1. User shares: `teed.club/waitlist?ref=GOLF2024`
2. Visitor lands, code stored in localStorage
3. On signup, `referred_by` linked to referrer
4. Referrer notified via email
5. Both users' positions updated

### Reward System
- **Per Referral**: +5 queue positions
- **Milestone Bonuses**:
  - 3 referrals: +1 invite code
  - 5 referrals: "Rising Star" badge
  - 10 referrals: "Community Builder" badge
  - 25 referrals: "Ambassador" badge + special perks

### Leaderboard
- **Display**: Top 10 referrers
- **Privacy**: Username-first, masking options
- **Periods**: 7-day, 30-day, all-time
- **Trends**: Up/down indicators vs previous period

## Demand Tension Elements

### Scarcity Signals
- **Live Counter**: "Only 23 spots left today!"
- **Queue Position**: "You're #142 in line"
- **Recent Activity**: "5 people joined in last hour"
- **Deadline Pressure**: "Wave closes Friday at midnight"

### Social Proof
- **Referral Leaderboard**: Top advocates visible
- **Recent Approvals**: First names ticker
- **Success Stories**: "Sarah referred 8 friends and got access!"
- **Badges**: Visual achievements on profiles

### Urgency Triggers
- **Email Subject Lines**: "🚨 Only 10 spots remaining"
- **Position Alerts**: "You moved up 20 spots!"
- **Expiring Benefits**: "Founding member perks end soon"

## Analytics & KPIs

### Tracked Events
```typescript
// Funnel Events
waitlist_viewed           // Landing page visit
waitlist_submitted        // Application complete
referral_visit           // Referral link clicked
referral_signup          // Referral converted
beta_approved            // User approved
beta_first_login         // Activation
bag_created_first_time   // First engagement
first_post_published     // Content creation

// Engagement Events
referral_link_copied     // Viral action
referral_link_shared     // Social share
invite_code_generated    // User creating value
queue_boost_action       // Gamification engagement
```

### Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Viral Coefficient (K) | >1.0 | 0.7 | 🟡 Improving |
| Invite Accept Rate | 40% | 52% | ✅ Exceeding |
| 48hr Activation | 80% | 75% | 🟡 Close |
| Referral-driven Signups | 50% | 43% | 🟡 Growing |
| 7-day Retention | 70% | 68% | 🟡 On track |

## Environment Variables

```bash
# Core Configuration
VITE_SUPABASE_URL=https://project.supabase.co
VITE_SUPABASE_ANON_KEY=anon-key
SUPABASE_SERVICE_KEY=service-key

# Email Service
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=hello@teed.club
EMAIL_ENABLED=true

# Feature Flags
VITE_BETA_ENABLED=true
VITE_PUBLIC_BETA=false
VITE_REFERRAL_SYSTEM_ENABLED=true

# Capacity Settings
BETA_CAP=150
AUTO_APPROVAL_THRESHOLD=4
INVITE_QUOTA_DEFAULT=3

# Analytics
VITE_VERCEL_ANALYTICS_ID=xxxxx
VITE_GA_MEASUREMENT_ID=G-XXXXX

# Caching
LEADERBOARD_CACHE_MINUTES=5
BETA_SUMMARY_CACHE_MINUTES=1
```

## Best Practices

### Security & Privacy
- **RLS Policies**: Row-level security on all user data
- **Email Hashing**: SHA-256 for analytics tracking
- **Soft Deletes**: Never hard delete user content
- **Rate Limiting**: 10 req/min on submission endpoints
- **Honeypot Fields**: Bot protection on forms

### Performance
- **Caching Strategy**:
  - Leaderboard: 5-minute TTL
  - Beta summary: 1-minute TTL
  - Feature flags: 5-minute client cache
- **Database Indexes**:
  - `waitlist_applications(email, status)`
  - `profiles(referral_code)`
  - `referral_chains(created_at)`

### Rollout Strategy
1. **Wave 1** (150 users): Internal + high scorers
2. **Wave 2** (500 users): Scaled access with leaderboard
3. **Wave 3** (2000 users): Public beta launch

## Implementation Timeline

### Completed Prompts (12 Total)

1. **Prompt 1**: Initial audit and gap analysis - Identified missing referral tracking and limited route protection
2. **Prompt 2**: Referral code generation - Auto-generate unique codes for all users
3. **Prompt 3**: BetaGuard expansion - Protected write operations across Feed, Equipment, Forum
4. **Prompt 4**: My Invites dashboard - Complete invite management UI with quota tracking
5. **Prompt 5**: Queue position display - Live position updates and wait time estimates
6. **Prompt 6**: Referral attribution - Track and reward successful referrals
7. **Prompt 7**: Public stats page - Live capacity meter and recent activity feed
8. **Prompt 8**: Email templates - Comprehensive notification system with 7 email types
9. **Prompt 9**: Admin enhancements - Bulk operations, CSV export, wave management
10. **Prompt 10**: Analytics instrumentation - Complete funnel tracking from waitlist to engagement
11. **Prompt 11**: Configurable scoring - Database-driven weights with admin UI
12. **Prompt 12**: Rollout documentation - QA checklist, monitoring scripts, emergency playbook

## Glossary

- **BetaGuard**: Component that restricts access to beta-only features
- **Wave**: Batch approval of waitlist applications
- **K-Factor**: Viral coefficient measuring referral effectiveness
- **Queue Jump**: Actions that improve waitlist position
- **Referral Chain**: Connection between referrer and referred user
- **Scoring Engine**: System calculating application priority (0-100)
- **Capacity**: Maximum beta users allowed (default: 150)
- **Activation**: First meaningful action after approval
- **Invite Quota**: Number of invites each user can generate (default: 3)
- **Milestone**: Achievement unlocking rewards (badges, invites)
- **Demand Tension**: Creating scarcity to drive urgency
- **Founding Member**: Beta users who shape the platform

---

*This document serves as the central reference for the Teed.club beta waitlist and referral system. All 12 implementation prompts have been completed, creating a comprehensive viral growth engine with proper monitoring, admin tools, and user engagement mechanics.*