-- Add missing columns to bag_equipment table

-- 1. Add is_featured column for marking featured equipment
ALTER TABLE public.bag_equipment
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- 2. Add position column for ordering equipment (separate from position_data which is for UI positioning)
ALTER TABLE public.bag_equipment
ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

-- 3. Update existing rows to have sequential positions based on added_at
WITH numbered_equipment AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY bag_id ORDER BY added_at) - 1 as new_position
  FROM bag_equipment
)
UPDATE bag_equipment
SET position = numbered_equipment.new_position
FROM numbered_equipment
WHERE bag_equipment.id = numbered_equipment.id;

-- 4. Add index for better performance
CREATE INDEX IF NOT EXISTS idx_bag_equipment_bag_position 
ON bag_equipment(bag_id, position);