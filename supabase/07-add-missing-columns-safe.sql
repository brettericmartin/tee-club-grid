-- Add missing columns to bag_equipment table (SAFE VERSION)

-- 1. Add is_featured column for marking featured equipment
ALTER TABLE public.bag_equipment
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- 2. Add position column for ordering equipment
ALTER TABLE public.bag_equipment
ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

-- 3. Update existing rows to have sequential positions based on added_at
-- Only update if position column was just added (all values are 0)
DO $$ 
BEGIN
  -- Check if we need to set positions (all are 0 or null)
  IF EXISTS (
    SELECT 1 FROM bag_equipment 
    WHERE position IS NOT NULL AND position != 0
    LIMIT 1
  ) THEN
    RAISE NOTICE 'Position values already exist, skipping position update';
  ELSE
    -- Set sequential positions per bag
    WITH numbered_equipment AS (
      SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY bag_id ORDER BY added_at) - 1 as new_position
      FROM bag_equipment
    )
    UPDATE bag_equipment
    SET position = ne.new_position
    FROM numbered_equipment ne
    WHERE bag_equipment.id = ne.id;
    
    RAISE NOTICE 'Position values updated successfully';
  END IF;
END $$;

-- 4. Add index for better performance (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'bag_equipment' 
    AND indexname = 'idx_bag_equipment_bag_position'
  ) THEN
    CREATE INDEX idx_bag_equipment_bag_position 
    ON public.bag_equipment(bag_id, position);
    RAISE NOTICE 'Index created successfully';
  ELSE
    RAISE NOTICE 'Index already exists';
  END IF;
END $$;