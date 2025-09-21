-- Migration: Add selected_photo_id to bag_equipment for unified photo pool
-- This replaces the custom_photo_url approach with a reference to equipment_photos

-- Add the new column to reference equipment_photos
ALTER TABLE bag_equipment 
ADD COLUMN selected_photo_id UUID REFERENCES equipment_photos(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_bag_equipment_selected_photo 
ON bag_equipment(selected_photo_id);

-- Add comment to document the new approach
COMMENT ON COLUMN bag_equipment.selected_photo_id IS 
'References equipment_photos.id - allows users to select any photo from the unified photo pool for this equipment. Replaces custom_photo_url approach to eliminate duplicates and enable photo sharing between variants.';