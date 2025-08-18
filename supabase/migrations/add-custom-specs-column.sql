-- Add custom_specs column to bag_equipment table
-- This allows storing custom specifications like loft, shaft, grip preferences as JSON

-- Add custom_specs column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bag_equipment' 
    AND column_name = 'custom_specs'
  ) THEN
    ALTER TABLE bag_equipment 
    ADD COLUMN custom_specs jsonb DEFAULT NULL;
    
    COMMENT ON COLUMN bag_equipment.custom_specs IS 'Custom specifications for equipment like loft, shaft, grip preferences';
  END IF;
END $$;

-- Grant necessary permissions (if not already granted)
GRANT SELECT, INSERT, UPDATE, DELETE ON bag_equipment TO authenticated;