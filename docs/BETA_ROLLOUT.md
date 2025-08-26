# Beta Rollout Guide for Teed.club

## Table of Contents
1. [Pre-Launch Checklist](#pre-launch-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Feature Flag Settings](#feature-flag-settings)
4. [Staging Test Plan](#staging-test-plan)
5. [Wave Rollout Strategy](#wave-rollout-strategy)
6. [KPI Monitoring](#kpi-monitoring)
7. [Emergency Procedures](#emergency-procedures)
8. [Support Scripts](#support-scripts)

---

## Pre-Launch Checklist

### Infrastructure ✓
- [ ] **Database**
  - [ ] All migrations applied: `supabase migration up`
  - [ ] RLS policies verified: `node scripts/check-rls-policies.js`
  - [ ] Indexes optimized: Check slow query log
  - [ ] Backup created: `supabase db dump -f backup-$(date +%Y%m%d).sql`

- [ ] **API Endpoints**
  - [ ] Rate limiting configured (10 req/min for waitlist submit)
  - [ ] Admin authentication working
  - [ ] Email service tested (SendGrid/Resend)
  - [ ] Error tracking enabled (Sentry)

- [ ] **Frontend**
  - [ ] BetaGuard on all protected routes
  - [ ] Loading states for all async operations
  - [ ] Error boundaries in place
  - [ ] Mobile responsiveness verified

### Data Integrity ✓
- [ ] **Scoring System**
  - [ ] Configuration loaded from database
  - [ ] Auto-approval threshold set (current: 4)
  - [ ] Test scoring with simulator
  - [ ] Verify score distribution

- [ ] **Capacity Management**
  - [ ] Beta cap set in feature_flags (150 for Wave 1)
  - [ ] Capacity checks working
  - [ ] Over-capacity handling tested

- [ ] **Email Templates**
  - [ ] Approval email tested
  - [ ] Rejection email tested
  - [ ] Referral success email tested
  - [ ] Queue update email tested

### Analytics ✓
- [ ] **Event Tracking**
  - [ ] Funnel events firing correctly
  - [ ] User properties set
  - [ ] Conversion tracking enabled
  - [ ] Dashboard accessible

- [ ] **Monitoring**
  - [ ] Error alerts configured
  - [ ] Capacity alerts set (80%, 90%, 100%)
  - [ ] Approval rate tracking
  - [ ] API performance monitoring

---

## Environment Configuration

### Required Environment Variables

```bash
# .env.production
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Email Service
SENDGRID_API_KEY=your-sendgrid-key
EMAIL_FROM=hello@teed.club

# Analytics
VITE_VERCEL_ANALYTICS_ID=your-analytics-id
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Feature Flags
VITE_BETA_ENABLED=true
VITE_PUBLIC_BETA=false
VITE_REFERRAL_SYSTEM_ENABLED=true

# Capacity
BETA_CAP=150
BETA_WAVE_SIZE=50
AUTO_APPROVAL_ENABLED=true
AUTO_APPROVAL_THRESHOLD=4
```

### Database Configuration

```sql
-- Set initial feature flags
UPDATE feature_flags SET
  beta_enabled = true,
  public_beta = false,
  beta_cap = 150,
  auto_approval_enabled = true,
  referral_system_enabled = true,
  leaderboard_enabled = false,  -- Enable after Wave 1
  scoring_config = '{
    "weights": {
      "role": {
        "fitter_builder": 3,
        "creator": 2,
        "league_captain": 1,
        "golfer": 0
      },
      "profileCompletion": {
        "threshold": 80,
        "bonus": 1
      },
      "equipmentEngagement": {
        "firstItem": 1,
        "multipleItemsBonus": 2
      }
    },
    "autoApproval": {
      "threshold": 4,
      "requireEmailVerification": true
    }
  }'::jsonb
WHERE id = 1;
```

---

## Feature Flag Settings

### Wave 1 Settings (Internal + Early Access)
```javascript
{
  beta_enabled: true,           // Master switch
  public_beta: false,           // Keep registration closed
  beta_cap: 150,               // Total capacity
  auto_approval_enabled: true,  // Score-based auto-approval
  referral_system_enabled: true,// Referral codes active
  leaderboard_enabled: false,   // Hide until stable
  invite_quota_default: 3,      // Invites per user
  waitlist_open: true,          // Accept applications
  approval_paused: false        // Emergency pause
}
```

### Wave 2 Settings (Scaled Access)
```javascript
{
  beta_cap: 500,               // Increased capacity
  leaderboard_enabled: true,   // Enable gamification
  invite_quota_default: 5      // More invites
}
```

### Wave 3 Settings (Public Beta)
```javascript
{
  public_beta: true,           // Open registration
  beta_cap: 2000,              // Large capacity
  waitlist_open: false         // Close waitlist
}
```

---

## Staging Test Plan

### 1. Core Functionality Tests

```bash
# Run automated test suite
npm run test:integration

# Specific beta tests
npm run test:waitlist
npm run test:referrals
npm run test:scoring
```

### 2. Manual Test Cases

#### Waitlist Flow
1. Submit application with score < 4 → Verify pending status
2. Submit application with score ≥ 4 → Verify auto-approval
3. Use referral code → Verify bonus points applied
4. Check queue position → Verify correct calculation

#### Admin Operations
1. Bulk approve 10 applications → Verify capacity check
2. Export CSV → Verify all fields present
3. Adjust scoring config → Verify immediate effect
4. Simulate scoring → Verify distribution

#### User Journey
1. Approved user login → Access beta features
2. Generate invite code → Share with friend
3. Friend uses code → Original user gets notification
4. Check leaderboard → Verify referral count

### 3. Load Testing

```bash
# Simulate 100 concurrent applications
node scripts/load-test-waitlist.js --concurrent=100

# Monitor performance
node scripts/monitor-api-performance.js
```

---

## Wave Rollout Strategy

### Wave 1: Internal + Early Access (Week 1)
**Target: 150 users**

#### Composition
- 50 Internal users (team, advisors, beta testers)
- 100 Early access (high-score applicants)

#### Approval Process
```bash
# 1. Approve internal list
node scripts/approve-internal-users.js --list=internal-users.csv

# 2. Auto-approve high scorers
node scripts/process-auto-approvals.js --limit=100 --min-score=4

# 3. Monitor capacity
node scripts/monitor-beta-capacity.js --alert-at=140
```

#### Success Metrics
- [ ] 80% activation rate within 48 hours
- [ ] <5% error rate
- [ ] 50+ pieces of equipment added
- [ ] 20+ feed posts created

### Wave 2: Scaled Access (Week 2-3)
**Target: 500 users**

#### Triggers for Wave 2
- Wave 1 metrics met
- No critical bugs for 72 hours
- Infrastructure stable under load

#### Approval Process
```bash
# Increase capacity
node scripts/update-beta-cap.js --cap=500

# Process next batch
node scripts/approve-wave.js --wave=2 --size=350

# Enable leaderboard
node scripts/enable-feature.js --feature=leaderboard
```

### Wave 3: Public Beta (Week 4+)
**Target: 2000+ users**

#### Triggers for Wave 3
- Referral system working (K-factor > 0.5)
- Content moderation in place
- Revenue tracking enabled

#### Launch Process
```bash
# Open public registration
node scripts/enable-public-beta.js

# Migrate waitlist to users
node scripts/migrate-waitlist-to-beta.js --batch-size=100

# Enable all features
node scripts/enable-all-features.js
```

---

## KPI Monitoring

### Critical Metrics

```sql
-- Daily dashboard query
SELECT 
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE status = 'approved') as approvals,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  AVG(score) as avg_score,
  COUNT(DISTINCT referred_by) as active_referrers,
  COUNT(*) FILTER (WHERE referred_by IS NOT NULL) as referred_signups
FROM waitlist_applications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Real-time Monitoring

```bash
# Start monitoring dashboard
node scripts/monitor-beta-kpis.js --refresh=60

# Alerts configured for:
# - Approval rate < 20% (may indicate issues)
# - Error rate > 5%
# - Response time > 2s
# - Capacity > 90%
```

### Success Indicators
- **Activation**: 80% create profile within 48h
- **Engagement**: 60% add equipment within 1 week
- **Viral**: K-factor > 0.5 (each user brings 0.5 new users)
- **Retention**: 70% return within 7 days
- **Content**: 100+ items added daily

---

## Emergency Procedures

### 1. Pause All Approvals
```bash
# Immediate pause
node scripts/pause-approvals.js --reason="investigating issue"

# Or via SQL
UPDATE feature_flags SET approval_paused = true WHERE id = 1;
```

### 2. Rollback Recent Approvals
```bash
# Rollback last hour of approvals
node scripts/rollback-approvals.js --since="1 hour ago"

# Notify affected users
node scripts/send-rollback-emails.js --template=beta-pause
```

### 3. Capacity Issues
```bash
# Emergency capacity increase
node scripts/update-beta-cap.js --cap=200 --emergency

# Or reduce if needed
node scripts/reduce-capacity.js --new-cap=100 --soft-delete
```

### 4. Scoring System Issues
```bash
# Revert to default scoring
node scripts/reset-scoring-config.js

# Recalculate all scores
node scripts/recalculate-scores.js --all
```

### 5. Complete Beta Shutdown
```bash
# Nuclear option - disable all beta features
node scripts/emergency-shutdown.js --confirm

# This will:
# - Set beta_enabled = false
# - Pause all approvals  
# - Disable invite system
# - Show maintenance message
```

---

## Support Scripts

### Daily Operations
```bash
# Morning check
node scripts/beta-rollout-check.js

# Process pending approvals
node scripts/process-daily-approvals.js --limit=50

# Send queue updates
node scripts/send-queue-updates.js
```

### Monitoring
```bash
# Real-time KPI dashboard
node scripts/monitor-beta-kpis.js

# Capacity alerts
node scripts/monitor-capacity.js --alert-email=team@teed.club

# Error tracking
node scripts/monitor-errors.js --threshold=5
```

### Data Management
```bash
# Export daily report
node scripts/export-beta-report.js --format=csv

# Clean test data
node scripts/clean-test-data.js --dry-run

# Backup before major changes
node scripts/backup-beta-data.js
```

---

## Troubleshooting Guide

### Common Issues

#### "Capacity exceeded" errors
```bash
# Check current capacity
node scripts/check-capacity.js

# Increase if needed
node scripts/update-beta-cap.js --cap=200
```

#### Emails not sending
```bash
# Test email service
node scripts/test-email.js --to=test@example.com

# Check queue
node scripts/check-email-queue.js

# Resend failed
node scripts/retry-failed-emails.js
```

#### Scoring inconsistencies
```bash
# Verify config
node scripts/verify-scoring-config.js

# Test calculation
node scripts/test-scoring.js --email=user@example.com

# Recalculate
node scripts/recalculate-score.js --email=user@example.com
```

#### Users can't access beta features
```bash
# Check user status
node scripts/check-user-beta.js --email=user@example.com

# Force sync
node scripts/sync-beta-access.js --email=user@example.com

# Clear cache
node scripts/clear-beta-cache.js
```

---

## Communication Templates

### Wave 1 Launch Email
```
Subject: 🎉 Welcome to Teed.club Beta!

You're one of the first 150 members of Teed.club!

Your access is now active. Here's what you can do:
- Create your golf bag profile
- Share equipment photos
- Connect with other golfers
- Earn badges for contributions

You also have 3 invites to share with friends.
Your referral code: [CODE]

Get started: https://teed.club
```

### Capacity Reached Message
```
We've reached our Wave 1 capacity of 150 beta users!

Don't worry - you're #[POSITION] in line.
Wave 2 opens next week with 350 more spots.

Jump the queue:
- Complete your profile (+10 spots)
- Refer a friend (+15 spots)
- Share on social (+5 spots)
```

### Emergency Pause Message
```
We're temporarily pausing new beta approvals while we scale our infrastructure.

Your position in the queue is saved.
We'll notify you as soon as we resume.

Expected timeline: 24-48 hours
```

---

## Post-Launch Review

### After Each Wave
1. **Metrics Review**
   - Compare actual vs expected KPIs
   - Identify bottlenecks
   - Calculate viral coefficient

2. **User Feedback**
   - Survey beta users
   - Analyze support tickets
   - Review feature requests

3. **Technical Assessment**
   - Performance metrics
   - Error rates
   - Database optimization needs

4. **Process Improvements**
   - Update documentation
   - Refine scripts
   - Adjust thresholds

### Success Criteria for Full Launch
- [ ] 1000+ active beta users
- [ ] <1% error rate for 7 days
- [ ] K-factor > 1.0
- [ ] 80% user satisfaction
- [ ] Revenue tracking validated

---

## Appendix: Quick Commands

```bash
# Status check
npm run beta:status

# Daily operations  
npm run beta:daily

# Emergency
npm run beta:emergency

# Reports
npm run beta:report

# Full test suite
npm run beta:test
```

## Support Contacts

- **Technical Issues**: dev@teed.club
- **Capacity Decisions**: product@teed.club
- **Emergency Escalation**: [Phone/Slack]
- **Status Page**: https://status.teed.club