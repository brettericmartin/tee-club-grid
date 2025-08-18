-- Add custom_specs column to bag_equipment table
-- This column stores custom specifications like loft, shaft, and grip preferences

-- Add the column if it doesn't exist
ALTER TABLE bag_equipment 
ADD COLUMN IF NOT EXISTS custom_specs jsonb DEFAULT NULL;

-- Add comment to describe the column
COMMENT ON COLUMN bag_equipment.custom_specs IS 'Custom specifications for equipment like loft, shaft, grip preferences';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bag_equipment' 
AND column_name = 'custom_specs';

-- Sample data structure for custom_specs:
-- {
--   "loft": "10.5",
--   "shaft_id": "uuid-here",
--   "grip_id": "uuid-here",
--   "shaft_flex": "Stiff",
--   "lie_angle": "standard"
-- }