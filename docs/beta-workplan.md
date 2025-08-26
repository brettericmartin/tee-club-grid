# Beta Waitlist & Referral System Work Plan

## Executive Summary
This work plan breaks down the beta reform from `beta-reform.md` into 12 small, PR-sized tasks (≤400 lines each) based on the actual inventory and gaps identified.

## 🎯 Key Deltas from Current State

### What We Have ✅
- Database tables: `profiles`, `invite_codes`, `waitlist_applications`, `feature_flags`
- API endpoints: `/api/waitlist/submit`, `/api/beta/redeem`, `/api/beta/summary`
- BetaGuard component (only protects `/my-bag`)
- Basic waitlist form and admin panel
- Referral capture utility (stores in localStorage)
- Scoring system (0-100 points)

### What's Missing ❌
1. **Referral code generation** - `profiles.referral_code` exists but never populated
2. **Route protection** - Only `/my-bag` uses BetaGuard
3. **User invite dashboard** - No UI for users to manage invites
4. **Queue position display** - No visibility of waitlist position
5. **Referral tracking** - `referred_by` column unused
6. **Public stats page** - Live capacity hidden except on waitlist
7. **Email notifications** - Missing referral success, queue updates
8. **Social sharing** - No referral link generation or sharing UI
9. **Analytics events** - Incomplete tracking of referral flows
10. **Gamification** - No badges or rewards for referrals

---

## 📋 Task Breakdown (Build Order)

### Task 1: Generate Referral Codes for All Users
**Title:** Auto-generate unique referral codes on profile creation  
**Rationale:** Foundation for entire referral system - must exist before sharing  
**Definition of Done:**
- All existing profiles have unique 8-character referral codes
- New profiles auto-generate codes on creation
- Codes are URL-safe (alphanumeric only)

**Files:**
- `scripts/2025-01-24__generate-referral-codes.sql` (new migration)
- `src/lib/supabase.ts` (add helper function)
- `scripts/run-referral-code-migration.js` (new runner)

**SQL Migration:**
```sql
-- Generate referral codes for existing users
UPDATE profiles 
SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT), 1, 8))
WHERE referral_code IS NULL;

-- Function to auto-generate on insert
CREATE OR REPLACE FUNCTION generate_referral_code()...
```

**Test:** Unit test code generation, E2E test new signups get codes  
**Analytics:** Track `referral_code_generated` event  
**Unknowns:** Check for code collisions (use UNIQUE constraint)

---

### Task 2: Expand BetaGuard to Core Features
**Title:** Apply beta access requirements to write operations  
**Rationale:** Prevent non-beta users from creating content  
**Definition of Done:**
- Feed posting requires beta access
- Equipment submissions require beta access  
- Forum thread creation requires beta access
- Read operations remain public

**Files:**
- `src/pages/Feed.tsx` (wrap CreatePostModal)
- `src/pages/Equipment.tsx` (wrap SubmitEquipmentModal)
- `src/pages/Forum.tsx` (wrap CreateThread)
- `src/components/auth/BetaGuard.tsx` (add `softBlock` prop for read+write split)

**Changes:**
```tsx
// In Feed.tsx
{showCreatePost && (
  <BetaGuard softBlock>
    <CreatePostModal />
  </BetaGuard>
)}
```

**Test:** E2E test non-beta users see "Join waitlist" instead of create buttons  
**Analytics:** Track `beta_guard_soft_block` events  
**Copy:** "Join the beta to share your golf journey"

---

### Task 3: Add Referral Code Display to Profile
**Title:** Show user's referral code with copy functionality  
**Rationale:** Users need to see and share their codes  
**Definition of Done:**
- Referral code shows in user profile/settings
- Copy button with toast confirmation
- Shareable URL format: `teed.club/waitlist?ref=CODE`

**Files:**
- `src/pages/Profile.tsx` or `src/components/profile/ProfileDialog.tsx`
- `src/hooks/useReferralCode.ts` (new)
- `src/components/profile/ReferralCodeCard.tsx` (new)

**Component:**
```tsx
<Card>
  <CardTitle>Your Referral Code</CardTitle>
  <div className="flex items-center gap-2">
    <code>{referralCode}</code>
    <Button onClick={copyToClipboard}>Copy Link</Button>
  </div>
</Card>
```

**Test:** Unit test copy functionality, E2E test code display  
**Analytics:** Track `referral_link_copied` event  
**Copy:** "Invite friends to skip the line"

---

### Task 4: Implement Queue Position Display
**Title:** Show waitlist position and estimated wait time  
**Rationale:** Creates transparency and urgency  
**Definition of Done:**
- Pending users see "You're #X in line"
- Show estimated days based on approval rate
- Update on page refresh

**Files:**
- `src/pages/Waitlist.tsx` (add position display)
- `api/waitlist/position.ts` (new endpoint)
- `src/hooks/useWaitlistPosition.ts` (new)

**API Response:**
```json
{
  "position": 42,
  "totalAhead": 41,
  "estimatedDays": 7,
  "recentApprovals": 5
}
```

**Test:** Unit test position calculation, E2E test display updates  
**Analytics:** Track `waitlist_position_viewed` event  
**Unknowns:** Calculate approval rate from historical data

---

### Task 5: Create User Invite Dashboard
**Title:** Build "My Invites" section for managing invite codes  
**Rationale:** Users need visibility into their invite quota and usage  
**Definition of Done:**
- Shows remaining invites (quota - used)
- Lists generated invite codes with usage
- Button to generate new codes
- Shows invited users (privacy-aware, only show count)

**Files:**
- `src/pages/MyInvites.tsx` (new page)
- `src/components/invites/InviteDashboard.tsx` (new)
- `src/services/invites.ts` (new service)
- `api/invites/generate.ts` (new endpoint)
- `src/App.tsx` (add route)

**UI Structure:**
```
- Quota: 3 invites remaining
- Active Codes:
  - ABC123 (0/1 uses) [Copy]
  - XYZ789 (1/3 uses) [Copy]
- [Generate New Code] button
```

**Test:** E2E test code generation and display  
**Analytics:** Track `invite_code_generated`, `invite_dashboard_viewed`  
**Unknowns:** Resolve how to handle multi-use codes

---

### Task 6: Add Referral Attribution Tracking
**Title:** Track who referred whom using referral codes  
**Rationale:** Essential for rewards and viral metrics  
**Definition of Done:**
- Waitlist form captures and validates referral codes
- Updates `waitlist_applications.referred_by` 
- Shows "Invited by @username" in admin panel

**Files:**
- `api/waitlist/submit.ts` (add referral code validation)
- `src/components/waitlist/WaitlistForm.tsx` (add referral field)
- `scripts/2025-01-24__add-referral-tracking-function.sql` (new)

**Logic:**
```typescript
// In submit endpoint
if (body.referral_code) {
  const referrer = await findUserByReferralCode(body.referral_code);
  if (referrer) {
    applicationData.referred_by = referrer.id;
    applicationData.score += 10; // Referral bonus
  }
}
```

**Test:** Unit test referral validation, E2E test attribution  
**Analytics:** Track `referral_attributed` event  
**Unknowns:** Handle invalid/expired referral codes gracefully

---

### Task 7: Build Public Beta Stats Page
**Title:** Create live capacity and waitlist stats page  
**Rationale:** Creates social proof and urgency  
**Definition of Done:**
- Public page showing spots remaining
- Live counter animation
- Recent joins feed (first name only)
- Top referrers leaderboard (anonymous option)

**Files:**
- `src/pages/BetaStats.tsx` (new)
- `src/components/beta/CapacityMeter.tsx` (new)
- `src/components/beta/RecentJoins.tsx` (new)
- `api/beta/public-stats.ts` (new endpoint)

**Component Features:**
- Animated progress bar (e.g., 127/150 spots filled)
- "Last 5 joins" ticker
- "Top Referrers This Week" board

**Test:** E2E test data updates, unit test animations  
**Analytics:** Track `beta_stats_viewed`, `urgency_displayed`  
**Copy:** "Only 23 spots left today!"

---

### Task 8: Implement Referral Success Emails
**Title:** Send notifications when referrals succeed  
**Rationale:** Reinforces viral loop and rewards referrers  
**Definition of Done:**
- Email sent when referred user gets approved
- Shows referrer they earned +1 invite
- Includes share buttons for more referrals

**Files:**
- `src/services/emailService.ts` (add new templates)
- `api/waitlist/approve.ts` (trigger email on approval)
- `email-templates/referral-success.html` (new)

**Email Content:**
```
Subject: 🎉 Your friend just joined Teed.club!
Body: [Name] used your invite! You've earned +1 invite.
      You've now invited 3 friends. Share more: [buttons]
```

**Test:** Unit test email trigger logic  
**Analytics:** Track `referral_success_email_sent`  
**Unknowns:** Check SendGrid template limits

---

### Task 9: Add Social Sharing Components
**Title:** Build share buttons and Open Graph tags  
**Rationale:** Makes sharing frictionless and trackable  
**Definition of Done:**
- Share buttons for Twitter/X, WhatsApp, Email
- Custom OG tags for referral links
- URL shortener integration (optional)

**Files:**
- `src/components/sharing/ShareButtons.tsx` (new)
- `src/utils/socialSharing.ts` (new)
- `index.html` (add OG meta tags)
- `api/share/track.ts` (new endpoint for analytics)

**Share URLs:**
```typescript
const shareUrls = {
  twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `Join me on Teed.club! Use my code ${code} to skip the waitlist`
  )}&url=${referralUrl}`,
  whatsapp: `https://wa.me/?text=${encodeURIComponent(...)}`
}
```

**Test:** Unit test URL generation, E2E test share flows  
**Analytics:** Track `share_button_clicked` by platform  
**Copy:** Platform-specific messages optimized for engagement

---

### Task 10: Create Referral Rewards System
**Title:** Award bonus invites for successful referrals  
**Rationale:** Incentivizes sharing and creates viral growth  
**Definition of Done:**
- +1 invite per successful referral
- Badge for 5+ successful referrals
- Leaderboard points system

**Files:**
- `scripts/2025-01-24__add-referral-rewards-function.sql` (new)
- `src/services/referralRewards.ts` (new)
- `api/cron/process-referral-rewards.ts` (new)

**SQL Function:**
```sql
CREATE OR REPLACE FUNCTION award_referral_bonus(referrer_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET invite_quota = invite_quota + 1,
      referrals_count = COALESCE(referrals_count, 0) + 1
  WHERE id = referrer_id;
END;
$$ LANGUAGE plpgsql;
```

**Test:** Unit test reward calculation, E2E test bonus awards  
**Analytics:** Track `referral_reward_earned`  
**Unknowns:** Set max invites cap? Anti-gaming measures?

---

### Task 11: Add Queue Jumping Mechanics
**Title:** Allow users to improve waitlist position through actions  
**Rationale:** Increases engagement and viral sharing  
**Definition of Done:**
- Share on social = +5 points
- Complete profile = +10 points
- Add equipment = +5 points
- Points affect queue position

**Files:**
- `src/services/queueJumping.ts` (new)
- `api/waitlist/boost-score.ts` (new endpoint)
- `src/components/waitlist/QueueBoostActions.tsx` (new)

**Boost Actions UI:**
```tsx
<Card>
  <h3>Jump the Queue!</h3>
  <ul>
    <li>✅ Complete profile (+10 spots)</li>
    <li>⬜ Share on Twitter (+5 spots)</li>
    <li>⬜ Refer a friend (+15 spots)</li>
  </ul>
</Card>
```

**Test:** E2E test score updates affect position  
**Analytics:** Track `queue_boost_action` by type  
**Unknowns:** Balance points to prevent gaming

---

### Task 12: Implement Waitlist Analytics Dashboard
**Title:** Build analytics for viral metrics and conversion  
**Rationale:** Measure and optimize viral coefficient  
**Definition of Done:**
- Viral coefficient calculation
- Conversion funnel visualization
- Cohort analysis by source
- Referral chain depth tracking

**Files:**
- `src/pages/admin/WaitlistAnalytics.tsx` (new)
- `src/services/waitlistAnalytics.ts` (new)
- `api/analytics/waitlist-metrics.ts` (new)
- `scripts/2025-01-24__add-analytics-tables.sql` (new)

**Key Metrics:**
```typescript
interface ViralMetrics {
  viralCoefficient: number; // Target > 1.0
  avgReferralsPerUser: number;
  conversionRate: number;
  avgTimeToActivation: number;
  topReferralSources: Source[];
}
```

**Test:** Unit test metric calculations  
**Analytics:** Meta-track analytics dashboard usage  
**Unknowns:** Historical data backfill strategy

---

## 🚨 Risk Mitigation

### Technical Risks
1. **Database Migration Failures**
   - Mitigation: Test all SQL in dev first, use transactions
   - Rollback: Keep rollback scripts ready

2. **Performance Impact**
   - Mitigation: Add indexes on referral_code, referred_by
   - Monitor: Set up query performance alerts

3. **Email Deliverability**
   - Mitigation: Warm up sending gradually
   - Monitor: Track bounce rates and spam reports

### Product Risks
1. **Referral Gaming**
   - Mitigation: Rate limits, fraud detection, manual review
   - Monitor: Track unusual referral patterns

2. **User Privacy**
   - Mitigation: Hash emails, allow anonymous referrals
   - Compliance: GDPR-compliant data handling

3. **Capacity Overflow**
   - Mitigation: Dynamic capacity adjustment
   - Monitor: Alert when 90% capacity reached

### Unknown Resolution Strategy
- **Database Schema**: Use `scripts/check-schema.js` to verify current state
- **Component Paths**: Use `grep -r "ComponentName"` to find locations
- **API Routes**: Check `api/` folder structure and vercel.json
- **Type Definitions**: Run `npx supabase gen types` for latest schema
- **Analytics Events**: Review `src/utils/analytics.ts` for existing events

---

## 📊 Success Metrics

### Sprint 1 (Tasks 1-4)
- [ ] All users have referral codes
- [ ] Beta guard on 3+ routes
- [ ] Queue position visible
- [ ] Referral copying works

### Sprint 2 (Tasks 5-8)
- [ ] Invite dashboard live
- [ ] Attribution tracking working
- [ ] Public stats page launched
- [ ] Success emails sending

### Sprint 3 (Tasks 9-12)
- [ ] Social sharing implemented
- [ ] Rewards system active
- [ ] Queue jumping live
- [ ] Analytics dashboard complete

### Overall Success Criteria
- Viral coefficient > 1.0
- 50%+ signups from referrals
- <24 hour activation time
- 40%+ invite acceptance rate

---

## 🚀 Implementation Order Rationale

1. **Foundation First** (Tasks 1-3): Must have referral codes before anything else
2. **Visibility Second** (Tasks 4-7): Show progress and create urgency
3. **Viral Mechanics Third** (Tasks 8-10): Activate the growth loop
4. **Optimization Last** (Tasks 11-12): Fine-tune based on data

Each task is designed to be:
- **Small**: <400 lines of changes
- **Complete**: Shippable increment
- **Testable**: Clear success criteria
- **Valuable**: Immediate user benefit

Ready to begin with Task 1: Generate Referral Codes.