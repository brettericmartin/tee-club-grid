# Beta Emergency Playbook

## Quick Reference

**Emergency Hotline**: [Your emergency contact]  
**Status Page**: https://status.teed.club  
**Monitoring Dashboard**: `npm run beta:monitor`

### Immediate Actions (< 2 minutes)

```bash
# STOP ALL APPROVALS
node scripts/pause-approvals.js --reason="emergency"

# CHECK SYSTEM STATUS
node scripts/beta-rollout-check.js

# MONITOR REAL-TIME
node scripts/monitor-beta-kpis.js --simple
```

---

## Severity Levels

### 🔴 CRITICAL (P0)
**Response Time**: Immediate  
**Examples**: Data loss, security breach, complete outage

### 🟡 HIGH (P1)
**Response Time**: < 15 minutes  
**Examples**: Capacity exceeded, mass errors, payment issues

### 🔵 MEDIUM (P2)
**Response Time**: < 1 hour  
**Examples**: Slow performance, isolated bugs, email failures

### ⚪ LOW (P3)
**Response Time**: < 4 hours  
**Examples**: UI issues, non-critical features broken

---

## Emergency Scenarios

### 1. 🚨 Beta Capacity Exceeded

**Symptoms**:
- Error: "at_capacity" when approving users
- Users reporting access issues
- Capacity monitor shows > 100%

**Immediate Actions**:
```bash
# 1. Check actual capacity
node scripts/check-capacity.js

# 2. Pause new approvals
UPDATE feature_flags SET approval_paused = true WHERE id = 1;

# 3. Audit current users
SELECT COUNT(*) FROM profiles WHERE beta_access = true;

# 4. If legitimate, increase capacity
node scripts/update-beta-cap.js --cap=200 --emergency
```

**Root Cause Investigation**:
- Check for duplicate approvals
- Verify no manual database edits
- Review approval logs

**Communication**:
```
Subject: Beta Capacity Temporarily Full

We've reached maximum capacity for our current beta wave.
New approvals are paused while we prepare for the next wave.
Your position in the queue is saved.

Expected resolution: [timeframe]
```

---

### 2. 💥 Mass Approval Errors

**Symptoms**:
- Multiple users report not getting access after approval
- Email confirmations sent but access not granted
- Profiles table out of sync with waitlist

**Immediate Actions**:
```bash
# 1. Stop all approvals
node scripts/pause-approvals.js --reason="sync-issue"

# 2. Check for discrepancies
SELECT wa.email, wa.status, p.beta_access 
FROM waitlist_applications wa
LEFT JOIN profiles p ON p.email = wa.email
WHERE wa.status = 'approved' 
AND (p.beta_access IS FALSE OR p.beta_access IS NULL);

# 3. Fix sync issues
node scripts/sync-beta-access.js --fix

# 4. Notify affected users
node scripts/send-sync-fix-emails.js
```

**Root Cause Investigation**:
- Check RLS policies
- Verify email service
- Review transaction logs

---

### 3. 📧 Email Service Failure

**Symptoms**:
- Approval emails not sending
- High bounce rates
- SendGrid/Resend API errors

**Immediate Actions**:
```bash
# 1. Test email service
node scripts/test-email.js --to=test@teed.club

# 2. Check API key validity
curl -X GET https://api.sendgrid.com/v3/api_keys \
  -H "Authorization: Bearer $SENDGRID_API_KEY"

# 3. Switch to backup service (if configured)
UPDATE feature_flags 
SET email_provider = 'resend' 
WHERE id = 1;

# 4. Retry failed emails
node scripts/retry-failed-emails.js --last-hour
```

**Fallback Options**:
1. Use alternative email service
2. Generate manual approval links
3. Batch and delay emails

---

### 4. 🔥 Database Performance Crisis

**Symptoms**:
- Queries timing out
- Page load times > 5 seconds
- Database CPU at 100%

**Immediate Actions**:
```bash
# 1. Identify slow queries
SELECT query, calls, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

# 2. Kill long-running queries
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'active' 
AND query_start < NOW() - INTERVAL '5 minutes';

# 3. Disable non-critical features
UPDATE feature_flags SET 
  leaderboard_enabled = false,
  analytics_enabled = false
WHERE id = 1;

# 4. Scale database if needed
# Via Supabase dashboard or CLI
```

**Emergency Optimizations**:
```sql
-- Add emergency indexes
CREATE INDEX CONCURRENTLY idx_emergency_waitlist 
ON waitlist_applications(status, score) 
WHERE status = 'pending';

-- Disable expensive triggers temporarily
ALTER TABLE profiles DISABLE TRIGGER update_timestamp;
```

---

### 5. 🐛 Scoring System Malfunction

**Symptoms**:
- All users getting same score
- Auto-approval not working
- Scores calculating incorrectly

**Immediate Actions**:
```bash
# 1. Disable auto-approval
UPDATE feature_flags 
SET auto_approval_enabled = false 
WHERE id = 1;

# 2. Check current config
SELECT scoring_config FROM feature_flags WHERE id = 1;

# 3. Revert to default config
node scripts/reset-scoring-config.js

# 4. Recalculate affected scores
node scripts/recalculate-scores.js --since="1 hour ago"

# 5. Test with simulator
node scripts/test-scoring.js --sample=10
```

---

### 6. 🚫 Complete Beta Shutdown Required

**Symptoms**:
- Critical security issue
- Major data corruption
- Legal/compliance issue

**Immediate Actions**:
```bash
# 1. NUCLEAR OPTION - Disable everything
node scripts/emergency-shutdown.js --confirm

# This script will:
# - Set beta_enabled = false
# - Pause all approvals
# - Disable invite system
# - Show maintenance page
# - Notify all beta users

# 2. Backup current state
pg_dump $DATABASE_URL > backup-emergency-$(date +%s).sql

# 3. Set maintenance mode
UPDATE feature_flags SET maintenance_mode = true WHERE id = 1;

# 4. Clear all sessions (force re-login)
TRUNCATE TABLE auth.sessions;
```

**Communication Template**:
```
Subject: Teed.club Beta - Temporary Maintenance

We're performing emergency maintenance on the beta platform.
Access is temporarily disabled while we resolve the issue.

Your data is safe and no action is needed from you.

Expected resolution: [timeframe]
Updates: https://status.teed.club
```

---

## Recovery Procedures

### After Capacity Issue
```bash
# 1. Verify fix
node scripts/check-capacity.js

# 2. Resume approvals gradually
node scripts/resume-approvals.js --rate=10 --per-hour

# 3. Process backlog
node scripts/process-pending-approvals.js --limit=50

# 4. Send updates
node scripts/send-queue-updates.js
```

### After Email Failure
```bash
# 1. Verify service restored
node scripts/test-email.js --full-test

# 2. Process email backlog
node scripts/process-email-queue.js

# 3. Resend critical emails
node scripts/resend-approval-emails.js --missing-only
```

### After Database Issue
```bash
# 1. Run integrity checks
node scripts/check-data-integrity.js

# 2. Rebuild indexes
REINDEX DATABASE teedclub;

# 3. Update statistics
ANALYZE;

# 4. Re-enable features gradually
node scripts/enable-features.js --gradual
```

---

## Communication Templates

### Status Page Updates

#### Investigation
```markdown
**Investigating** - We're investigating reports of [issue description].
Some users may experience [impact].
Posted at [time]
```

#### Identified
```markdown
**Identified** - We've identified the issue with [component].
A fix is being implemented.
Current impact: [description]
Posted at [time]
```

#### Monitoring
```markdown
**Monitoring** - A fix has been implemented and we're monitoring the results.
[Service] should be operating normally.
Posted at [time]
```

#### Resolved
```markdown
**Resolved** - This incident has been resolved.
All systems are operational.
Root cause: [brief description]
Posted at [time]
```

### User Communications

#### Proactive Warning
```
Subject: Scheduled Beta Maintenance - [Date/Time]

We'll be performing maintenance on [date] from [start] to [end] UTC.
During this time, you may experience intermittent access issues.

No action needed from you.
```

#### Incident Notification
```
Subject: We're experiencing technical difficulties

Some beta users are currently experiencing [issue].
Our team is working on a fix.

Your data is safe and we expect resolution within [timeframe].

Status updates: https://status.teed.club
```

#### Resolution Notice
```
Subject: Issue Resolved - Beta Access Restored

The issue affecting [feature/access] has been resolved.
All beta features should now be working normally.

If you continue to experience issues, please contact support.

Thank you for your patience.
```

---

## Monitoring Commands

### Real-time Monitoring
```bash
# System health
watch -n 5 'node scripts/beta-rollout-check.js'

# Database connections
watch -n 2 'psql -c "SELECT count(*) FROM pg_stat_activity"'

# Error rate
tail -f logs/error.log | grep -E "ERROR|CRITICAL"

# API response times
node scripts/monitor-api-performance.js --real-time
```

### Post-Incident Analysis
```bash
# Generate incident report
node scripts/generate-incident-report.js \
  --start="2024-01-15 10:00" \
  --end="2024-01-15 12:00" \
  --output=incident-report.md

# Analyze error patterns
node scripts/analyze-errors.js --last-24h

# User impact assessment
node scripts/assess-user-impact.js --incident-id=123
```

---

## Escalation Matrix

| Severity | First Responder | Escalation (15 min) | Escalation (30 min) |
|----------|----------------|---------------------|---------------------|
| CRITICAL | On-call Eng    | Tech Lead           | CTO                 |
| HIGH     | On-call Eng    | Tech Lead           | VP Engineering      |
| MEDIUM   | On-call Eng    | Senior Engineer     | Tech Lead           |
| LOW      | Support Team   | On-call Eng         | Senior Engineer     |

### Contact List
- **On-call Engineer**: [Phone/Slack]
- **Tech Lead**: [Phone/Slack]
- **CTO**: [Phone/Slack]
- **VP Engineering**: [Phone/Slack]
- **Support Team**: support@teed.club

---

## Prevention Checklist

### Daily
- [ ] Run `npm run beta:check`
- [ ] Review error logs
- [ ] Check capacity utilization
- [ ] Monitor approval queue

### Weekly
- [ ] Review performance metrics
- [ ] Test email deliverability
- [ ] Audit user feedback
- [ ] Update monitoring thresholds

### Before Each Wave
- [ ] Load test infrastructure
- [ ] Verify backup procedures
- [ ] Test rollback scripts
- [ ] Update emergency contacts
- [ ] Brief support team

---

## Recovery Time Objectives (RTO)

| Component | Target RTO | Maximum RTO |
|-----------|------------|-------------|
| Core API  | 5 minutes  | 30 minutes  |
| Database  | 15 minutes | 1 hour      |
| Email     | 30 minutes | 4 hours     |
| Analytics | 1 hour     | 24 hours    |

---

## Lessons Learned Log

### [Date] - [Incident Type]
**Duration**: X minutes  
**Impact**: Y users affected  
**Root Cause**: [Description]  
**Resolution**: [What fixed it]  
**Prevention**: [Future prevention measures]

---

## Quick SQL Fixes

```sql
-- Reset beta capacity
UPDATE feature_flags SET beta_cap = 150 WHERE id = 1;

-- Pause all approvals
UPDATE feature_flags SET approval_paused = true WHERE id = 1;

-- Clear stuck transactions
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle in transaction' 
AND state_change < NOW() - INTERVAL '10 minutes';

-- Emergency user removal (soft delete)
UPDATE profiles 
SET deleted_at = NOW(), beta_access = false 
WHERE email = 'problem@user.com';

-- Fix orphaned applications
UPDATE waitlist_applications 
SET status = 'pending' 
WHERE status = 'approved' 
AND email NOT IN (SELECT email FROM profiles);
```

---

## Remember

1. **Stay Calm** - Rushed fixes cause more problems
2. **Communicate Early** - Users appreciate transparency
3. **Document Everything** - For post-mortem analysis
4. **Test Fixes** - In staging before production
5. **Learn & Improve** - Every incident is a learning opportunity

**Your north star**: User data integrity > Feature availability > Performance