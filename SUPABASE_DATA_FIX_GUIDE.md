# Supabase Data Fix Guide

## Overview
This guide explains how to fix the data discrepancies where the application is using hardcoded sample data instead of fetching from Supabase.

## Issues Found

1. **BagsBrowser page** - Uses hardcoded `sampleBagsData.ts` instead of fetching from Supabase
2. **Landing page (Index.tsx)** - Uses `sampleBags` for trending bags section
3. **Feed components** - May be using local data instead of `feed_posts` table
4. **Table naming inconsistency** - Schema shows both `bags` and `user_bags` tables

## Steps to Fix

### 1. Update the Application Code

Replace the current BagsBrowser.tsx with the fixed version:
```bash
mv src/pages/BagsBrowser.tsx src/pages/BagsBrowser-old.tsx
mv src/pages/BagsBrowser-fixed.tsx src/pages/BagsBrowser.tsx
```

### 2. Set Up Equipment Data

First, ensure your equipment table has data. You can either:

a) **Import from CSV** (if you have equipment-import.csv):
```sql
-- Run in Supabase SQL editor
COPY equipment (brand, model, category, msrp, image_url, specs)
FROM '/path/to/equipment-import.csv'
WITH (FORMAT CSV, HEADER);
```

b) **Run the equipment mapping script**:
```bash
cd scripts
npm install @supabase/supabase-js
node create-equipment-mapping.ts
```

### 3. Create Sample User Profiles and Bags

Run the migration SQL in Supabase SQL editor:
```sql
-- Copy the contents of src/sql/migrate-sample-bags-to-supabase.sql
-- and run it in your Supabase SQL editor
```

### 4. Link Equipment to Bags

After you have equipment data, you need to populate the `bag_equipment` table:

```sql
-- Example: Add equipment to a user's bag
-- First, find the bag ID and equipment IDs
SELECT id, name FROM user_bags WHERE user_id = '11111111-1111-1111-1111-111111111111';
SELECT id, brand, model FROM equipment WHERE category = 'driver' LIMIT 5;

-- Then insert bag_equipment records
INSERT INTO bag_equipment (bag_id, equipment_id, is_featured, purchase_price)
VALUES 
  ('[BAG_ID]', '[EQUIPMENT_ID_1]', true, 599),
  ('[BAG_ID]', '[EQUIPMENT_ID_2]', true, 399),
  -- ... add more equipment
  ;
```

### 5. Update Landing Page to Use Real Data

Create a new version of Index.tsx that fetches real trending bags:

```tsx
// In the Index component, replace the static import with:
const [trendingBags, setTrendingBags] = useState([]);

useEffect(() => {
  async function loadTrendingBags() {
    const { data } = await getBags({ sortBy: 'most-liked' });
    setTrendingBags(data?.slice(0, 8) || []);
  }
  loadTrendingBags();
}, []);
```

### 6. Fix Table Naming Issue

If you have both `bags` and `user_bags` tables, consolidate to use only `user_bags`:

```sql
-- Check if both tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('bags', 'user_bags');

-- If you have data in 'bags' table that needs to be migrated:
INSERT INTO user_bags (user_id, name, description, is_public, background_image, created_at, updated_at)
SELECT user_id, name, description, is_public, background_image, created_at, updated_at
FROM bags
ON CONFLICT DO NOTHING;

-- After verifying data is migrated, you can drop the old table:
-- DROP TABLE bags CASCADE;
```

### 7. Enable Real-time Updates (Optional)

To make the bags browser update in real-time when new bags are added:

```tsx
// In BagsBrowser component
useEffect(() => {
  const subscription = supabase
    .channel('public:user_bags')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'user_bags' },
      () => loadBags()
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

## Testing

1. **Test Bags Browser**: Navigate to `/bags` and verify it shows real data
2. **Test My Bag**: Login and go to `/my-bag` to ensure it works
3. **Test Equipment Selection**: Try adding equipment to your bag
4. **Test Search/Filters**: Verify search and filters work with real data

## Common Issues

### Issue: No bags showing up
- Check that `user_bags` table has data
- Verify RLS policies allow public read access
- Check browser console for errors

### Issue: Equipment images not loading
- Update `image_url` in equipment table with valid URLs
- Consider using Supabase Storage for images

### Issue: User profiles missing
- Ensure profiles are created when users sign up
- Run profile creation trigger if needed

## Next Steps

1. Add more realistic equipment data with proper images
2. Create a seed script for demo data
3. Implement image upload for equipment
4. Add equipment specifications data
5. Create admin interface for managing equipment catalog