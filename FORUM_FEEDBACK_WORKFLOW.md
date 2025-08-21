# Forum Feedback Workflow - Current Issues from Non-Locked Forums

## Overview
This document addresses ONLY the active feedback from non-locked forum threads. All issues listed here are from the "Site feedback 2.0" thread which remains open for discussion.

**Thread:** Site feedback 2.0  
**Status:** Active (Not Locked)  
**Author:** Test User  
**Date:** August 21, 2025  

---

## 📱 ACTIVE ISSUES TO ADDRESS

### 1. Forum Page Not Mobile Optimized
**Priority:** HIGH - Core functionality blocked on mobile  
**Issue:** New thread button is outside mobile window  

**Steps to Fix:**
```bash
# Check Forum.tsx layout
# File: src/pages/Forum.tsx
```

**Solution:**
- Move "New Thread" button to mobile-safe position
- Options: 
  - Fixed bottom bar (like mobile app pattern)
  - Top of page with other controls
  - Floating action button (FAB) pattern
- Add responsive classes: `fixed bottom-20 right-4 sm:bottom-4`
- Test on 375px viewport width

**Verification:**
- Test on iPhone 12 mini (375px)
- Ensure button is fully visible and tappable
- No horizontal scroll required

---

### 2. Can't Follow Users
**Priority:** MEDIUM - Social feature missing  
**Issue:** No follow functionality implemented  

**Steps to Fix:**
```bash
# Check if follow system exists in database
# Tables to check: user_follows, followers, following
```

**Solution:**
- Create follow system if not exists:
  - Database: `user_follows` table (follower_id, following_id)
  - Add follow button to ProfileDialog component
  - Create follow/unfollow API endpoints
  - Add followers/following counts to profiles
- If exists but hidden, expose in UI

**Verification:**
- Follow/unfollow users works
- Counts update in real-time
- Following feed filter available

---

### 3. Share Button Outside Mobile Window (User Bag Page)
**Priority:** HIGH - Sharing blocked on mobile  
**Issue:** Share button positioned outside viewport on mobile devices  

**Steps to Fix:**
```bash
# Review UserBag/MyBagSupabase component
# File: src/pages/MyBagSupabase.tsx
```

**Solution:**
- Reposition share button for mobile
- Move to:
  - Top action bar
  - Or dropdown menu
  - Or bottom of bag card
- Ensure all CTAs are within safe mobile area (padding: 16px minimum)

**Verification:**
- Share button accessible on 375px width
- No horizontal scrolling needed
- Touch target minimum 44x44px

---

### 4. Share Bag Needs Better Format
**Priority:** MEDIUM - Enhancement  
**Issue:** Need screenshot-friendly bag card and list view for sharing  

**Steps to Fix:**
```bash
# Create shareable bag views
# Components: BagShareCard, BagListView
```

**Solution:**
- Create dedicated share view with:
  - Clean bag card without UI controls
  - List view of all equipment
  - Watermark/attribution (teed.club)
  - Download as image option
  - Copy link functionality

**Implementation:**
- New route: `/bag/[id]/share`
- Hide interactive elements in share mode
- Add "Download Image" button
- Generate OG meta tags for social sharing

**Verification:**
- Share view looks good as screenshot
- List view shows all equipment clearly
- Social media previews work correctly

---

### 5. Bag Card Tees Not Working
**Priority:** CRITICAL - Core functionality broken  
**Issue:** Tee/untee functionality not working on bag cards  

**Steps to Fix:**
```bash
# Debug tee functionality
# Check: src/components/bags/BagCompositeCard.tsx
# Verify Supabase RLS policies for bag_tees table
```

**Solution:**
- Check onClick handler for tee button
- Verify Supabase mutations:
  ```typescript
  // Should insert/delete from bag_tees table
  const handleTee = async () => {
    // Check if this is properly wired
  }
  ```
- Check RLS policies allow authenticated users to:
  - INSERT into bag_tees
  - DELETE from bag_tees where user_id matches
- Add error logging to identify failures

**Verification:**
- Tee count increments/decrements
- UI updates immediately (optimistic update)
- Persists after refresh
- Works on feed, profile, and bag browser

---

## 📋 IMPLEMENTATION PLAN

### Day 1: Critical Fixes
1. [ ] Fix bag card tees functionality (CRITICAL)
2. [ ] Fix forum mobile layout - New Thread button
3. [ ] Fix share button positioning on bag page

### Day 2: Enhancements
4. [ ] Implement user follow system
5. [ ] Create screenshot-friendly share views

---

## 🧪 TESTING REQUIREMENTS

### Mobile Devices:
- [ ] iPhone 12 mini (375px) - worst case iOS
- [ ] Pixel 4a - mid-range Android
- [ ] iPad Mini - tablet view

### Functionality:
- [ ] All buttons accessible without horizontal scroll
- [ ] Tee/untee works consistently
- [ ] Share generates proper preview
- [ ] Follow system updates in real-time

### Performance:
- [ ] No layout shift on mobile
- [ ] Touch targets ≥ 44x44px
- [ ] No glassmorphism on cards (per CLAUDE.md)

---

## 🚀 QUICK COMMANDS

```bash
# Start dev environment
npm run dev

# Test mobile view
# Chrome DevTools: Toggle device toolbar (Cmd+Shift+M)
# Select iPhone 12 mini or custom 375px width

# Check Supabase RLS
# Use Supabase dashboard → Authentication → Policies

# Monitor for errors
# Browser console + Network tab
```

---

## 📝 VERIFICATION CHECKLIST

After each fix:
1. [ ] Test on actual mobile device if possible
2. [ ] Verify no console errors
3. [ ] Update forum thread with resolution
4. [ ] Get confirmation from Test User

---

## ⚠️ IMPORTANT NOTES

- The "General Site Feedback" thread is LOCKED - those issues may already be fixed
- Focus only on the 5 issues from the active "Site feedback 2.0" thread
- Follow CLAUDE.md guidelines:
  - No glassmorphism on content cards
  - Mobile-first design
  - Touch targets 44x44px minimum
  - Never delete user data

---

**Last Updated:** August 21, 2025  
**Status:** Ready for Implementation  
**Active Thread:** Site feedback 2.0 (Not Locked)