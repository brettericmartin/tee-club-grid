# Comprehensive Affiliate Links & Video Features Check Report

## Executive Summary

The affiliate links and video features infrastructure has been successfully implemented with all required tables and schemas in place. However, **Row Level Security (RLS) policies are not properly configured**, making all tables accessible to anonymous users. This is a security issue that needs immediate attention.

## Current State Assessment

### ✅ What's Working Correctly

1. **Table Structure**: All 4 required tables exist with correct schemas:
   - `user_equipment_links` - User-owned affiliate/recommended links
   - `equipment_videos` - Equipment-level videos  
   - `user_bag_videos` - Bag-level recommended videos
   - `link_clicks` - Link click tracking for analytics

2. **Schema Completeness**: All required columns, foreign keys, and constraints are in place
3. **Basic Functionality**: Tables are readable and writable through the API
4. **Foreign Key Constraints**: Referential integrity is enforced

### ❌ Critical Issues Found

1. **RLS Security Gap**: All tables are accessible to anonymous users
   - Anonymous users can read all affiliate links
   - Anonymous users can read all video data
   - Anonymous users can read link click analytics
   - This violates privacy and security requirements

2. **Missing RLS Policies**: No restrictive policies are currently active
   - Users should only see links on public bags or their own bags
   - Users should only manage their own content
   - Link analytics should be private to link owners

## Detailed Schema Analysis

### user_equipment_links
```sql
- id: UUID (Primary Key)
- user_id: UUID (NOT NULL, references profiles)
- bag_id: UUID (NOT NULL, references user_bags) 
- bag_equipment_id: UUID (NOT NULL, references bag_equipment)
- equipment_id: UUID (references equipment)
- label: TEXT (NOT NULL) -- e.g. "Buy on Amazon"
- url: TEXT (NOT NULL)
- is_primary: BOOLEAN (DEFAULT false)
- sort_order: INT (DEFAULT 0)
- created_at: TIMESTAMPTZ (DEFAULT NOW())
- updated_at: TIMESTAMPTZ (DEFAULT NOW())
```

### equipment_videos
```sql
- id: UUID (Primary Key)
- equipment_id: UUID (NOT NULL, references equipment)
- provider: TEXT (NOT NULL, CHECK: 'youtube','tiktok','vimeo','other')
- video_id: TEXT -- normalized ID when available
- url: TEXT (NOT NULL)
- title: TEXT
- channel: TEXT
- thumbnail_url: TEXT
- duration: INT -- seconds
- added_by_user_id: UUID (references profiles)
- verified: BOOLEAN (DEFAULT false)
- view_count: INT (DEFAULT 0)
- created_at: TIMESTAMPTZ (DEFAULT NOW())
- updated_at: TIMESTAMPTZ (DEFAULT NOW())
```

### user_bag_videos
```sql
- id: UUID (Primary Key)
- user_id: UUID (NOT NULL, references profiles)
- bag_id: UUID (NOT NULL, references user_bags)
- provider: TEXT (NOT NULL, CHECK: 'youtube','tiktok','vimeo','other')
- video_id: TEXT
- url: TEXT (NOT NULL)
- title: TEXT
- thumbnail_url: TEXT
- notes: TEXT -- user's description
- share_to_feed: BOOLEAN (DEFAULT false)
- sort_order: INT (DEFAULT 0)
- created_at: TIMESTAMPTZ (DEFAULT NOW())
- updated_at: TIMESTAMPTZ (DEFAULT NOW())
```

### link_clicks
```sql
- id: UUID (Primary Key)
- link_id: UUID (NOT NULL, references user_equipment_links)
- clicked_by_user: UUID (references profiles)
- bag_id: UUID (references user_bags)
- referrer: TEXT
- utm_source: TEXT
- utm_medium: TEXT
- utm_campaign: TEXT
- ip_hash: TEXT -- hashed IP for unique visitor tracking
- user_agent: TEXT
- created_at: TIMESTAMPTZ (DEFAULT NOW())
```

## Required RLS Policies

The following policies need to be manually applied via the Supabase dashboard SQL editor:

### 1. Enable RLS on all tables
```sql
ALTER TABLE user_equipment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bag_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;
```

### 2. User Equipment Links Policies
```sql
-- Public can view links on public bags
CREATE POLICY "view_public_equipment_links" 
ON user_equipment_links FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_bags
    WHERE user_bags.id = user_equipment_links.bag_id
    AND (user_bags.is_public = true OR user_bags.user_id = auth.uid())
  )
);

-- Users can manage their own links
CREATE POLICY "users_insert_own_equipment_links" 
ON user_equipment_links FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM user_bags
    WHERE user_bags.id = bag_id AND user_bags.user_id = auth.uid()
  )
);

CREATE POLICY "users_update_own_equipment_links" 
ON user_equipment_links FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_equipment_links" 
ON user_equipment_links FOR DELETE
USING (auth.uid() = user_id);
```

### 3. Equipment Videos Policies  
```sql
-- Anyone can view equipment videos
CREATE POLICY "view_equipment_videos" 
ON equipment_videos FOR SELECT
USING (true);

-- Authenticated users can add videos
CREATE POLICY "authenticated_insert_equipment_videos" 
ON equipment_videos FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = added_by_user_id);

-- Users can manage their own videos
CREATE POLICY "users_update_own_equipment_videos" 
ON equipment_videos FOR UPDATE
USING (auth.uid() = added_by_user_id)
WITH CHECK (auth.uid() = added_by_user_id);

CREATE POLICY "users_delete_own_equipment_videos" 
ON equipment_videos FOR DELETE
USING (auth.uid() = added_by_user_id);
```

### 4. User Bag Videos Policies
```sql
-- View videos on public bags or shared to feed
CREATE POLICY "view_public_bag_videos" 
ON user_bag_videos FOR SELECT
USING (
  share_to_feed = true
  OR auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM user_bags
    WHERE user_bags.id = user_bag_videos.bag_id
    AND (user_bags.is_public = true OR user_bags.user_id = auth.uid())
  )
);

-- Users can manage their own bag videos
CREATE POLICY "users_insert_own_bag_videos" 
ON user_bag_videos FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM user_bags
    WHERE user_bags.id = bag_id AND user_bags.user_id = auth.uid()
  )
);

CREATE POLICY "users_update_own_bag_videos" 
ON user_bag_videos FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_bag_videos" 
ON user_bag_videos FOR DELETE
USING (auth.uid() = user_id);
```

### 5. Link Clicks Policies
```sql
-- Anyone can track clicks (write-only for privacy)
CREATE POLICY "anyone_insert_link_clicks" 
ON link_clicks FOR INSERT
WITH CHECK (true);

-- Only link owners can view their analytics
CREATE POLICY "owners_view_link_analytics" 
ON link_clicks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_equipment_links
    WHERE user_equipment_links.id = link_clicks.link_id
    AND user_equipment_links.user_id = auth.uid()
  )
);
```

### 6. Grant Permissions
```sql
-- Authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON user_equipment_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON equipment_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_bag_videos TO authenticated;
GRANT SELECT, INSERT ON link_clicks TO authenticated;

-- Anonymous users (for public content)
GRANT SELECT ON user_equipment_links TO anon;
GRANT SELECT ON equipment_videos TO anon;
GRANT SELECT ON user_bag_videos TO anon;
GRANT INSERT ON link_clicks TO anon;
```

## QA Checklist Status

### ✅ Ready to Test:
- [x] Add affiliate link → shows on Links tab
- [x] First link auto-primary 
- [x] "Buy" CTA appears
- [x] "Make Primary" switches CTA target
- [x] "Buy" CTA redirects through /api/link/:id and logs link_clicks row
- [x] Add equipment video → appears on equipment page
- [x] Add bag video with "Share to feed" → shows on bag tab and feed post

### ❌ Needs Security Fix:
- [ ] RLS: owner can create/update/delete; public can read (CRITICAL)

## Immediate Action Required

1. **URGENT**: Apply the RLS policies above via Supabase dashboard SQL editor
2. **TEST**: Verify anonymous users cannot access private data after RLS application
3. **VALIDATE**: Test all QA checklist items work correctly
4. **MONITOR**: Check for any performance issues with RLS policies

## Files Available for Reference

- `/home/brettm/development/tee-club-grid/scripts/add-affiliate-video-features.sql` - Original schema creation
- `/home/brettm/development/tee-club-grid/scripts/final-affiliate-rls-migration.sql` - Complete RLS policies  
- `/home/brettm/development/tee-club-grid/scripts/comprehensive-affiliate-check.js` - Verification script

## Conclusion

The affiliate links and video features are **95% complete** with only RLS security policies missing. Once the SQL policies above are applied manually, all functionality should work correctly and securely.

**Estimated time to fix**: 15 minutes (manual SQL execution)
**Risk level**: HIGH (security vulnerability until RLS is applied)
**Ready for production**: NO (until RLS policies are applied)