# Testing Guide for Bag Customization System

## Prerequisites

1. **Run the database migrations** in Supabase SQL editor in this order:
   ```sql
   -- Run each file's contents separately:
   -- 1. supabase/05-multi-bag-support.sql
   -- 2. supabase/06-equipment-functions.sql
   ```

2. **Check the console logs** (F12 in browser) for debugging info

## Testing Steps

### 1. Initial Load
- Navigate to http://localhost:8081/my-bag
- Check console for:
  - "Loaded bags:" - should show your bags
  - "Loaded equipment:" - should show equipment items
- You should see your bag name at the top

### 2. Bag Selector (Multi-bag support)
- Look for a dropdown button with your bag name near the top left
- Click it to see all your bags
- Click "Create New Bag" to add a new bag
- Try switching between bags

### 3. Edit Mode
- Click "Edit Bag" button (top right)
- You should see:
  - Bag name becomes editable
  - Description field appears
  - Background picker appears
  - Equipment items show Feature/Settings/Delete buttons
  - "Add Equipment" button at bottom

### 4. Add Equipment
- In edit mode, click "Add Equipment"
- Search for equipment (e.g., "TaylorMade", "Titleist")
- If no results after 3 characters, you'll see "Add New Equipment" button
- Follow the multi-step flow:
  1. Select/Add Equipment
  2. Choose Shaft
  3. Choose Grip  
  4. Choose Loft (if applicable)

### 5. Edit Equipment
- In edit mode, click the settings icon on any equipment
- You can:
  - Change shaft/grip/loft
  - Upload custom photo
  - Toggle featured status
  - Add purchase details
  - Add notes

### 6. Preview
- Click "Preview" button to see how your bag appears to others
- Check the shareable link feature

## Troubleshooting

### If bags aren't loading:
1. Check browser console for errors
2. Verify you're logged in
3. Run this query in Supabase to check your bags:
   ```sql
   SELECT * FROM user_bags WHERE user_id = 'YOUR_USER_ID';
   ```

### If equipment selector shows "Submit Equipment" but doesn't work:
- This means the old modal is showing instead of the new one
- Hard refresh the page (Ctrl+Shift+R)
- Check that you're on the `/my-bag` route

### If changes don't save:
1. Check console for errors
2. Ensure you clicked the "Save" button (not just exiting edit mode)
3. Check network tab for failed requests

## Debug Queries

Run these in Supabase SQL editor to verify your data:

```sql
-- Check user bags
SELECT * FROM user_bags WHERE user_id = auth.uid();

-- Check bag equipment
SELECT be.*, e.brand, e.model 
FROM bag_equipment be
JOIN equipment e ON e.id = be.equipment_id
WHERE be.bag_id IN (SELECT id FROM user_bags WHERE user_id = auth.uid());

-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('shafts', 'grips', 'loft_options');
```