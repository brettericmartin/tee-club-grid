-- Run this in Supabase SQL Editor to add selected_photo_id column
-- This allows users to select photos from the unified pool

-- Check if column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bag_equipment' 
        AND column_name = 'selected_photo_id'
    ) THEN
        -- Add the new column to reference equipment_photos
        ALTER TABLE bag_equipment 
        ADD COLUMN selected_photo_id UUID REFERENCES equipment_photos(id);
        
        RAISE NOTICE 'Column selected_photo_id added successfully';
    ELSE
        RAISE NOTICE 'Column selected_photo_id already exists';
    END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_bag_equipment_selected_photo 
ON bag_equipment(selected_photo_id);

-- Add comment to document the new approach
COMMENT ON COLUMN bag_equipment.selected_photo_id IS 
'References equipment_photos.id - allows users to select any photo from the unified photo pool for this equipment. Replaces custom_photo_url approach to eliminate duplicates and enable photo sharing between variants.';

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'bag_equipment' 
AND column_name = 'selected_photo_id';