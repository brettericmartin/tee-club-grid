# COMPREHENSIVE BETA WORKFLOW FIX

## 🚨 IMPORTANT: Run This to Fix Your Beta System

This comprehensive fix addresses ALL issues with the beta approval workflow, including:
- Infinite recursion in profiles queries
- Admin dashboard not showing
- Approval buttons causing RLS violations
- Bags not showing up
- Service role being blocked

## 📁 Files Created

### 1. `COMPLETE-BETA-FIX.sql`
The main SQL script that fixes everything. This script:
- Removes ALL problematic RLS policies
- Creates proper non-recursive policies
- Fixes the approval function with correct parameters
- Ensures service role bypasses RLS on all tables
- Restores admin access for brettmartinplay@gmail.com

### 2. `test-beta-workflow.js`
Comprehensive test script that verifies:
- Profiles table access
- Waitlist applications access
- Approval function exists and works
- Admin user has proper permissions
- User bags are accessible
- RLS policies are working

### 3. `verify-rls-policies.js`
Verification script that checks:
- No infinite recursion in profiles
- Service role can access all tables
- Admin detection works
- Waitlist can be managed
- Bags are visible
- Approval function is callable

## 🚀 How to Fix Your System

### Step 1: Run the SQL Fix
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy the ENTIRE contents of `supabase/COMPLETE-BETA-FIX.sql`
4. Paste and run it
5. You should see: "✅ BETA WORKFLOW FIX COMPLETE!"

### Step 2: Verify the Fix
```bash
# Test the beta workflow
node scripts/test-beta-workflow.js

# Verify RLS policies
node scripts/verify-rls-policies.js
```

### Step 3: Test in Browser
1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. Check that admin menu appears
3. Go to /admin/waitlist
4. Try approving an application
5. Check that your bag shows up

## 🔧 What Was Fixed

### RLS Policy Issues
- **Before**: Policies referenced profiles table within itself causing infinite recursion
- **After**: Simple, flat policies without self-references

### Approval Function
- **Before**: Function didn't exist with correct parameters (p_email, p_display_name, p_grant_invites)
- **After**: Function created with exact parameters the API expects

### Service Role Access
- **Before**: Even service role was blocked by RLS
- **After**: Service role has explicit bypass policies on ALL tables

### Admin Detection
- **Before**: Admin checks caused recursion
- **After**: Simple EXISTS check without recursion

## 📋 Testing Checklist

After running the fix, verify:

- [ ] No console errors about infinite recursion
- [ ] Admin menu items visible when logged in as admin
- [ ] /admin/waitlist page loads
- [ ] Approval button works without errors
- [ ] Rejected applications can be reset
- [ ] User bags are visible
- [ ] Feed posts load properly
- [ ] Profile page works

## 🚫 Common Issues

### Still seeing infinite recursion?
- Make sure you ran the ENTIRE SQL script
- Hard refresh your browser
- Check that you're using the latest code

### Admin menu not showing?
- Verify your user has is_admin = true in profiles table
- Check browser console for auth errors
- Try logging out and back in

### Approval still failing?
- Check that the function was created: 
  ```sql
  SELECT proname FROM pg_proc WHERE proname = 'approve_user_by_email_if_capacity';
  ```
- Verify service role key is set in environment variables

## 💡 Key Principles Used

1. **No Recursive Policies**: Policies never reference their own table in subqueries
2. **Service Role Bypass**: Every table has explicit service_role bypass policy
3. **SECURITY DEFINER**: Approval function runs with owner privileges
4. **Simple Policies**: Use basic auth.uid() = id checks where possible
5. **Explicit Permissions**: Each operation (SELECT, INSERT, UPDATE, DELETE) has its own policy

## 📞 Need Help?

If issues persist after running the fix:

1. Run: `node scripts/verify-rls-policies.js` and share the output
2. Check browser console for specific error messages
3. Verify your Supabase service key is correct
4. Make sure you're running the latest code from git

## ⚠️ WARNING

This fix:
- Drops ALL existing RLS policies and recreates them
- Updates the profiles table to ensure admin access
- Creates new database functions

Make sure to backup your database before running in production!