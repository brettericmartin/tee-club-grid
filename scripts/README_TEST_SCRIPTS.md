# Test Scripts Guide - What to Keep & How to Use Them

## 🎯 Essential Test Scripts to KEEP (Use These!)

### 1. **System Health Checks**
```bash
# Run this FIRST when something seems broken
node scripts/complete-system-check.js
```
- Checks database schema, RLS policies, admin functions, beta access
- Shows if everything is configured correctly

### 2. **Beta/Waitlist Testing**
```bash
# Test if users can sign up
node scripts/test-final-waitlist.js
```
- Tests anonymous submission, admin viewing, approval flow
- Run this after any waitlist changes

```bash
# Check waitlist RLS specifically
node scripts/check-waitlist-rls-status.js
```
- Diagnoses RLS issues with detailed error messages
- Provides exact SQL to fix problems

### 3. **Admin System**
```bash
# Verify admin setup
node scripts/verify-admin-system.js
```
- Checks if admins are properly configured
- Shows how to add new admins

```bash
# Migrate from old admin system
node scripts/migrate-admin-system.js
```
- Moves admins from legacy table to profiles.is_admin
- Run if admin login stops working

### 4. **Database Audits**
```bash
# Full database audit
node scripts/comprehensive-db-audit.js
```
- Checks all tables, permissions, functions
- Run monthly or when adding features

```bash
# Check RLS policies
node scripts/check-rls-policies.js
```
- Shows all RLS policies and their status
- Identifies blocking or conflicting policies

### 5. **Beta System Management**
```bash
# Grant beta access to a user
node scripts/grant-beta-access.js user@email.com
```

```bash
# Check user's beta status
node scripts/check-user-access.js user@email.com
```

```bash
# Monitor beta metrics
node scripts/monitor-beta-kpis.js
```

## 🗑️ Scripts You Can DELETE (Redundant/Old)

These are safe to delete - they were attempts to fix issues that are now resolved:

### Old Fix Attempts (DELETE ALL):
- `apply-emergency-waitlist-fix.js`
- `apply-rls-fix.js`
- `apply-rls-fix-web.js`
- `fix-critical-waitlist-rls.js` (our new fix worked)
- `fix-waitlist-rls-properly.js`
- `force-fix-rls.js`
- `fix-public-read-access.js`
- `fix-rls-loading-issues.js`
- Any script starting with `fix-` that's older than today

### Redundant Tests (DELETE):
- `test-anon-submission.js` (use test-final-waitlist.js instead)
- `test-complete-beta-system.js`
- `test-simplified-beta-system.js`
- `test-waitlist-submission.js`
- `test-waitlist-form.js`
- `test-full-waitlist-flow.js`

### One-time Migrations (DELETE after confirming they ran):
- `run-invite-migration.js`
- `run-beta-migration.js`
- `execute-beta-migration.js`
- Any `run-*-migration.js` files

## 📋 When to Run Which Test

### Daily Operations
```bash
# Quick health check (run if users report issues)
node scripts/complete-system-check.js
```

### When Users Can't Sign Up
```bash
# 1. Check waitlist RLS
node scripts/check-waitlist-rls-status.js

# 2. Test the flow
node scripts/test-final-waitlist.js
```

### When Admin Features Break
```bash
# 1. Verify admin system
node scripts/verify-admin-system.js

# 2. If needed, migrate admins
node scripts/migrate-admin-system.js
```

### Monthly Maintenance
```bash
# Full system audit
node scripts/comprehensive-db-audit.js

# Check beta metrics
node scripts/monitor-beta-kpis.js
```

## 🚨 Emergency Procedures

### If Waitlist Breaks Completely
1. Run `node scripts/check-waitlist-rls-status.js`
2. Copy the SQL it provides
3. Run in Supabase Dashboard

### If Admin Access Lost
1. Run `node scripts/verify-admin-system.js`
2. Follow instructions to restore admin access

### If Everything Seems Broken
1. Run `node scripts/complete-system-check.js`
2. Run `node scripts/comprehensive-db-audit.js`
3. Check the `APPLY_RLS_FIX_NOW.md` file for nuclear reset

## 📁 Folder Organization Suggestion

Create this structure:
```
scripts/
├── _ACTIVE/              # Scripts you use regularly
│   ├── complete-system-check.js
│   ├── test-final-waitlist.js
│   ├── verify-admin-system.js
│   └── monitor-beta-kpis.js
├── _ARCHIVE/             # Old scripts (move here instead of deleting)
│   └── (all the old fix attempts)
└── _UTILITIES/           # One-time use scripts
    ├── grant-beta-access.js
    └── migrate-admin-system.js
```

## 🎯 The Golden Rule

**If you're not sure what's wrong, run these in order:**
1. `node scripts/complete-system-check.js`
2. `node scripts/test-final-waitlist.js`
3. `node scripts/verify-admin-system.js`

These three will identify 90% of all issues!

---

**Last Updated:** 2025-08-28
**Verified Working With:** v0.18.0