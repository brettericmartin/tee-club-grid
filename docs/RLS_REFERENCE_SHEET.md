# RLS (Row Level Security) Reference Sheet - Teed.club

## 🚨 CRITICAL: This is the Single Source of Truth for ALL RLS Policies

Last Updated: 2025-01-10

This document defines the complete RLS policy structure for every table in the Teed.club database. 
**ALWAYS refer to this document before modifying any RLS policies to prevent breaking workflows.**

## Table of Contents
1. [Core Principles](#core-principles)
2. [User & Profile Tables](#user--profile-tables)
3. [Equipment Tables](#equipment-tables)
4. [Bag Management Tables](#bag-management-tables)
5. [Social & Feed Tables](#social--feed-tables)
6. [Media Tables](#media-tables)
7. [Forum Tables](#forum-tables)
8. [Admin & System Tables](#admin--system-tables)
9. [Common Patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)

---

## Core Principles

### Universal Rules:
1. **Public Read by Default**: Most content should be viewable by everyone (anon + authenticated)
2. **Authenticated Write**: Only logged-in users can create/modify content
3. **Owner-Only Updates**: Users can only modify their own content
4. **Cascade Through Relationships**: Use EXISTS clauses for ownership verification through foreign keys

### Policy Structure Template:
```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can view" ON table_name
  FOR SELECT USING (true);

-- Authenticated insert
CREATE POLICY "Authenticated can insert" ON table_name
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Owner update/delete
CREATE POLICY "Owners can update" ON table_name
  FOR UPDATE USING (user_id = auth.uid());
```

---

## User & Profile Tables

### `profiles`
**Purpose**: User profile information
```sql
-- SELECT: Anyone can view profiles
USING (true)

-- INSERT: Users create their own profile (id must match auth.uid())
WITH CHECK (auth.uid() = id)

-- UPDATE: Users update their own profile
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id)

-- DELETE: Not allowed (profiles should never be deleted)
```

---

## Equipment Tables

### `equipment`
**Purpose**: Golf equipment catalog (community-contributed)
```sql
-- SELECT: Anyone can view all equipment
USING (true)

-- INSERT: Any authenticated user can add equipment
WITH CHECK (auth.uid() IS NOT NULL)

-- UPDATE: Users can update equipment they added (or equipment with no owner)
USING (auth.uid() IS NOT NULL AND (added_by_user_id = auth.uid() OR added_by_user_id IS NULL))
WITH CHECK (auth.uid() IS NOT NULL AND (added_by_user_id = auth.uid() OR added_by_user_id IS NULL))

-- DELETE: Not allowed (equipment should be marked inactive instead)
```

### `equipment_photos`
**Purpose**: User-uploaded equipment photos
```sql
-- SELECT: Anyone can view all photos
USING (true)

-- INSERT: Authenticated users upload photos
WITH CHECK (auth.uid() = user_id)

-- UPDATE: Users update their own photos
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)

-- DELETE: Users delete their own photos
USING (auth.uid() = user_id)
```

### `equipment_saves`
**Purpose**: Bookmarked/saved equipment
```sql
-- SELECT: Anyone can view saves (for counts)
USING (true)

-- INSERT: Users save equipment
WITH CHECK (auth.uid() = user_id)

-- UPDATE: Not needed (saves are immutable)

-- DELETE: Users remove their saves
USING (auth.uid() = user_id)
```

### `equipment_tees`
**Purpose**: Likes/tees on equipment
```sql
-- SELECT: Anyone can view tees
USING (true)

-- INSERT: Users tee equipment
WITH CHECK (auth.uid() = user_id)

-- UPDATE: Not needed (tees are immutable)

-- DELETE: Users remove their tees
USING (auth.uid() = user_id)
```

---

## Bag Management Tables

### `user_bags`
**Purpose**: User's golf bag collections
```sql
-- SELECT: View public bags or own bags
USING (is_public = true OR user_id = auth.uid())

-- INSERT: Users create their own bags
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid())

-- UPDATE: Users update their own bags
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid())

-- DELETE: Users delete their own bags
USING (user_id = auth.uid())
```

### `bag_equipment`
**Purpose**: Equipment in user bags (junction table)
```sql
-- SELECT: Anyone can view bag contents
USING (true)

-- INSERT: Users add equipment to their own bags
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_bags
    WHERE user_bags.id = bag_equipment.bag_id
    AND user_bags.user_id = auth.uid()
  )
)

-- UPDATE: Users update equipment in their own bags
USING (
  EXISTS (
    SELECT 1 FROM user_bags
    WHERE user_bags.id = bag_equipment.bag_id
    AND user_bags.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_bags
    WHERE user_bags.id = bag_equipment.bag_id
    AND user_bags.user_id = auth.uid()
  )
)

-- DELETE: Users remove equipment from their own bags
USING (
  EXISTS (
    SELECT 1 FROM user_bags
    WHERE user_bags.id = bag_equipment.bag_id
    AND user_bags.user_id = auth.uid()
  )
)
```

### `bag_tees`
**Purpose**: Likes/tees on bags
```sql
-- SELECT: Anyone can view bag tees
USING (true)

-- INSERT: Users tee bags
WITH CHECK (auth.uid() = user_id)

-- UPDATE: Not needed (tees are immutable)

-- DELETE: Users remove their tees
USING (auth.uid() = user_id)
```

---

## Social & Feed Tables

### `feed_posts`
**Purpose**: Main activity feed posts
```sql
-- SELECT: Anyone can view all posts
USING (true)

-- INSERT: Authenticated users create posts
WITH CHECK (auth.uid() = user_id)

-- UPDATE: Users update their own posts
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)

-- DELETE: Users delete their own posts (soft delete preferred)
USING (auth.uid() = user_id)
```

### `feed_likes`
**Purpose**: Likes/tees on feed posts
```sql
-- SELECT: Anyone can view likes
USING (true)

-- INSERT: Users like posts
WITH CHECK (auth.uid() = user_id)

-- UPDATE: Not needed (likes are immutable)

-- DELETE: Users unlike posts
USING (auth.uid() = user_id)
```

### `user_follows`
**Purpose**: User following relationships
```sql
-- SELECT: Anyone can view follows
USING (true)

-- INSERT: Users follow others (can't follow self)
WITH CHECK (auth.uid() = follower_id AND follower_id != following_id)

-- UPDATE: Not needed (follows are immutable)

-- DELETE: Users unfollow
USING (auth.uid() = follower_id)
```

---

## Media Tables

### `user_bag_videos`
**Purpose**: Videos attached to user bags
```sql
-- SELECT: View videos from accessible bags
USING (
  auth.uid() = user_id
  OR share_to_feed = true
  OR EXISTS (
    SELECT 1 FROM user_bags 
    WHERE user_bags.id = user_bag_videos.bag_id 
    AND (user_bags.user_id = auth.uid() OR user_bags.is_public = true)
  )
)

-- INSERT: Users add videos to their bags
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_bags 
    WHERE user_bags.id = bag_id 
    AND user_bags.user_id = auth.uid()
  )
)

-- UPDATE: Users update their own videos
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_bags 
    WHERE user_bags.id = user_bag_videos.bag_id 
    AND user_bags.user_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_bags 
    WHERE user_bags.id = bag_id 
    AND user_bags.user_id = auth.uid()
  )
)

-- DELETE: Users delete their own videos
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_bags 
    WHERE user_bags.id = user_bag_videos.bag_id 
    AND user_bags.user_id = auth.uid()
  )
)
```

### `equipment_videos`
**Purpose**: Videos showcasing equipment
```sql
-- SELECT: Anyone can view equipment videos
USING (true)

-- INSERT: Authenticated users add videos
WITH CHECK (auth.uid() = user_id)

-- UPDATE: Users update their own videos
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)

-- DELETE: Users delete their own videos
USING (auth.uid() = user_id)
```

---

## Forum Tables

### `forum_categories`
**Purpose**: Forum category structure
```sql
-- SELECT: Anyone can view categories
USING (true)

-- INSERT/UPDATE/DELETE: Admin only (managed through admin panel)
-- No user-facing policies needed
```

### `forum_threads`
**Purpose**: Forum discussion threads
```sql
-- SELECT: Anyone can view threads
USING (true)

-- INSERT: Authenticated users create threads
WITH CHECK (auth.uid() IS NOT NULL)

-- UPDATE: Users update their own threads
USING (auth.uid() = user_id)

-- DELETE: Users delete their own threads (soft delete preferred)
USING (auth.uid() = user_id)
```

### `forum_posts`
**Purpose**: Posts within forum threads
```sql
-- SELECT: Anyone can view posts
USING (true)

-- INSERT: Authenticated users create posts
WITH CHECK (auth.uid() IS NOT NULL)

-- UPDATE: Users update their own posts
USING (auth.uid() = user_id)

-- DELETE: Users delete their own posts (soft delete preferred)
USING (auth.uid() = user_id)
```

---

## Admin & System Tables

### `waitlist_applications`
**Purpose**: Beta access waitlist
```sql
-- SELECT: Users view own applications, admins view all
USING (
  auth.jwt() ->> 'email' = email
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
)

-- INSERT: Anyone can submit application (including anonymous)
WITH CHECK (true)

-- UPDATE: Admin only
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))

-- DELETE: Admin only
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
```

### `invite_codes`
**Purpose**: Invitation codes for beta access
```sql
-- SELECT: Users see their own codes, admins see all
USING (
  created_by = auth.uid()
  OR used_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
)

-- INSERT: Users with invite quota can create codes
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND invites_sent < invite_quota
  )
)

-- UPDATE: Limited to marking as used
USING (code_status = 'pending' AND auth.uid() IS NOT NULL)
WITH CHECK (code_status = 'used' AND used_by = auth.uid())

-- DELETE: Not allowed
```

### `admins` (if exists as table, not view)
**Purpose**: Admin user list
```sql
-- SELECT: Admins only
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))

-- INSERT/UPDATE/DELETE: Super admin only (usually handled at database level)
```

### `link_clicks`
**Purpose**: Analytics for affiliate links
```sql
-- SELECT: Users see their own click data, admins see all
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
)

-- INSERT: System only (triggered by application)
WITH CHECK (auth.uid() IS NOT NULL)

-- UPDATE/DELETE: Not allowed (immutable analytics data)
```

---

## Common Patterns

### 1. Ownership Through Foreign Key
When a table doesn't have direct `user_id`, check ownership through related table:
```sql
EXISTS (
  SELECT 1 FROM parent_table
  WHERE parent_table.id = child_table.parent_id
  AND parent_table.user_id = auth.uid()
)
```

### 2. Public/Private Toggle
For tables with visibility settings:
```sql
-- SELECT policy
USING (is_public = true OR user_id = auth.uid())
```

### 3. Admin Override
For admin access to all rows:
```sql
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
)
```

### 4. Soft Delete Pattern
Instead of DELETE policies, use status field:
```sql
-- UPDATE policy for soft delete
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND status = 'deleted')
```

---

## Troubleshooting

### Common Issues & Solutions

1. **"new row violates row-level security policy"**
   - User is not authenticated
   - WITH CHECK condition is failing
   - Foreign key relationship doesn't exist

2. **Can see data but can't modify**
   - Check UPDATE/DELETE policies
   - Verify ownership conditions
   - Check if auth.uid() matches user_id

3. **No data visible when there should be**
   - Check SELECT policy
   - Verify RLS is enabled on table
   - Check if user is authenticated when required

4. **Can't add equipment to bag**
   - Verify bag ownership first
   - Check bag_equipment INSERT policy
   - Ensure equipment exists

### Testing Checklist
- [ ] Anonymous users can view public content
- [ ] Authenticated users can create content
- [ ] Users can only modify their own content
- [ ] Admin overrides work correctly
- [ ] Foreign key relationships are validated

### Emergency Fixes
If RLS is completely broken:
1. Use the master SQL file: `/supabase/migrations/20250110_master_rls_policies.sql`
2. Run verification script: `node scripts/verify-all-rls.js`
3. Check this reference sheet for correct policies

---

## Maintenance Notes

- **Last Full Audit**: 2025-01-10
- **Critical Tables**: equipment, bag_equipment, user_bags (most user-facing issues)
- **Never Disable RLS**: Always fix policies instead of disabling RLS
- **Test Changes**: Use verification script after any RLS modifications

---

## SQL Generation Template

For each table, use this template:
```sql
-- Table: [table_name]
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "[policy_name]" ON [table_name];

-- Create new policies
CREATE POLICY "[descriptive_name]" 
ON [table_name] 
FOR [SELECT|INSERT|UPDATE|DELETE] 
USING ([condition])
WITH CHECK ([condition]);

-- Grant permissions
GRANT SELECT ON [table_name] TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON [table_name] TO authenticated;
```

Remember: This document is the source of truth. When in doubt, refer here first!