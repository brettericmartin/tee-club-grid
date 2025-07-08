# Setting Up Professional Golfer Bags in Supabase

## Overview
This guide helps you populate your Supabase database with realistic professional golfer bag setups. Instead of creating multiple fake user profiles, we create multiple bags under a single user account.

## Prerequisites
- Supabase project with equipment table populated
- At least one user profile in your profiles table
- SQL editor access in Supabase dashboard

## Step-by-Step Instructions

### 1. Add Accessories and Non-Club Equipment
First, run the SQL in `01-add-accessories-equipment.sql` to add:
- Golf bags (TaylorMade, Titleist, Callaway, Ping)
- Gloves (FootJoy, Titleist, TaylorMade, Callaway)
- Tees (Pride, Zero Friction, 4 Yards More)
- Rangefinders (Bushnell Pro X3, Tour V6)
- Speakers, towels, and other accessories

### 2. Find a User ID
Run this query to find an existing user:
```sql
SELECT id, username, email FROM profiles LIMIT 5;
```

Copy one of the user IDs for the next step.

### 3. Create Multiple Pro Bags
Open `complete-setup.sql` and:
1. Replace `YOUR_USER_ID_HERE` with the actual user ID from step 2
2. Run the entire script

This will create 10 professional golfer bag setups:
- Rory McIlroy 2024 (TaylorMade)
- Scottie Scheffler #1 (Mixed TaylorMade/Titleist)
- Jon Rahm Masters (Callaway)
- Viktor Hovland (PING)
- Xander Schauffele (Callaway)
- Collin Morikawa (TaylorMade)
- Justin Thomas (Titleist)
- Jordan Spieth (Titleist)
- Patrick Cantlay (Titleist)
- Dustin Johnson (TaylorMade)

### 4. Verify the Setup
Run this query to verify bags were created:
```sql
SELECT 
  b.id,
  b.name,
  b.description,
  COUNT(be.id) as equipment_count
FROM user_bags b
LEFT JOIN user_bag_equipment be ON b.id = be.bag_id
WHERE b.user_id = 'YOUR_USER_ID_HERE'
GROUP BY b.id, b.name, b.description
ORDER BY b.created_at DESC;
```

## Troubleshooting

### RLS (Row Level Security) Issues
If you encounter permission errors:

1. **Option 1**: Run queries as service role in Supabase dashboard
2. **Option 2**: Temporarily disable RLS:
   ```sql
   ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
   ALTER TABLE user_bags DISABLE ROW LEVEL SECURITY;
   ALTER TABLE user_bag_equipment DISABLE ROW LEVEL SECURITY;
   -- Run your inserts
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;
   ALTER TABLE user_bag_equipment ENABLE ROW LEVEL SECURITY;
   ```

### Missing Equipment
If equipment references fail:
- The script uses fuzzy matching to find equipment
- It will fall back to any equipment in the category if exact matches aren't found
- Check the equipment table to ensure items exist

## UI Updates Made

### Fixed Gel Aesthetic
- Restored `gel-card` class on equipment grid items
- Enhanced hover effects with glass-morphism
- Maintained 3x2 grid layout for featured equipment

### CSS Classes Available
- `.gel-card` - Glass-morphism effect with blur and transparency
- `.gel-button` - Button variant with gel aesthetic
- Custom shadows and transitions for premium feel

## Next Steps
1. Test the bags in your application
2. Upload real equipment images to replace placeholders
3. Add more equipment variations as needed
4. Consider adding custom builds (shaft/grip combinations) for realism