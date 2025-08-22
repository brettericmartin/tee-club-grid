# RLS Setup Guide for Affiliate Links & Video Features

## ✅ Problem Solved

The original RLS script failed because it referenced `bags` table which doesn't exist. The correct table name is `user_bags`.

## 📁 Files Created

### 1. **Main RLS Script** (`scripts/corrected-affiliate-video-rls.sql`)
- ✅ Fixed all references from `bags` → `user_bags`
- ✅ Comprehensive RLS policies with privacy controls
- ✅ Performance indexes for fast queries
- ✅ Admin moderation support for videos
- ✅ Proper grants for authenticated and anonymous users

### 2. **Verification Scripts**
- `scripts/check-affiliate-tables.js` - Check if tables exist
- `scripts/verify-affiliate-rls.js` - Verify RLS is properly configured

## 🚀 Setup Instructions

### Step 1: Check Current Status
```bash
# Check if affiliate tables exist
node scripts/check-affiliate-tables.js
```

### Step 2: Create Tables (if needed)
If tables don't exist, run the migration:
```sql
-- In Supabase SQL Editor
-- Copy contents of: scripts/add-affiliate-video-features.sql
```

### Step 3: Apply RLS Policies
```sql
-- In Supabase SQL Editor
-- Copy contents of: scripts/corrected-affiliate-video-rls.sql
```

### Step 4: Verify Setup
```bash
# Verify RLS is working
node scripts/verify-affiliate-rls.js
```

## 🔒 RLS Policy Summary

### User Equipment Links (`user_equipment_links`)
- **SELECT**: Public can view links on public bags only
- **INSERT**: Users can add links to their own bags
- **UPDATE**: Users can update their own links
- **DELETE**: Users can delete their own links

### Equipment Videos (`equipment_videos`)
- **SELECT**: View verified videos (or own unverified)
- **INSERT**: Authenticated users can add (unverified)
- **UPDATE**: Owners can update, admins can verify
- **DELETE**: Owners or admins can delete

### User Bag Videos (`user_bag_videos`)
- **SELECT**: View if shared to feed or bag is public
- **INSERT**: Users can add to their own bags
- **UPDATE**: Users can update their own videos
- **DELETE**: Users can delete their own videos

### Link Clicks (`link_clicks`)
- **SELECT**: Only link owners can view analytics
- **INSERT**: Anyone can track clicks (privacy-focused)
- **UPDATE/DELETE**: Not allowed (immutable audit log)

## 🎯 Key Features

### Privacy Protection
- Respects bag privacy settings (`is_public` flag)
- Link analytics visible only to owners
- Private bags have private content

### Performance Optimizations
- Partial indexes for verified videos
- Composite indexes for RLS lookups
- Feed-specific indexes for fast queries

### Moderation System
- Videos start unverified
- Admins can verify/moderate content
- Users see their own unverified content

## 🔍 Troubleshooting

### If RLS policies fail to apply:
1. Check table ownership: `SELECT tableowner FROM pg_tables WHERE tablename IN ('user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks');`
2. Ensure you're using service role key or database owner
3. Check for conflicting policies: `SELECT * FROM pg_policies WHERE tablename IN ('user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks');`

### If queries are slow:
1. Check indexes exist: `SELECT * FROM pg_indexes WHERE tablename IN ('user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks');`
2. Run `ANALYZE` on tables to update statistics
3. Check query plans with `EXPLAIN ANALYZE`

### Common Errors:
- `relation "bags" does not exist` → Use the corrected script with `user_bags`
- `permission denied` → RLS is working but user lacks access
- `row-level security policy` → RLS is enabled and working

## 📊 Testing RLS

### Test as authenticated user:
```javascript
// In your app
const { data, error } = await supabase
  .from('user_equipment_links')
  .select('*')
  .eq('user_id', user.id);
```

### Test as anonymous:
```javascript
// Should only see public bag links
const { data, error } = await supabase
  .from('user_equipment_links')
  .select('*');
```

### Test analytics privacy:
```javascript
// Should only see own link clicks
const { data, error } = await supabase
  .from('link_clicks')
  .select('*');
```

## ✨ Success Indicators

When properly configured:
1. ✅ `node scripts/verify-affiliate-rls.js` shows all green
2. ✅ Authenticated users can manage their own content
3. ✅ Anonymous users can view public content only
4. ✅ Link analytics are private to owners
5. ✅ Videos require verification before public display