-- Add shaft_id and grip_id columns to bag_equipment table
-- This allows storing custom shaft and grip selections for each club

-- Add shaft_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bag_equipment' 
    AND column_name = 'shaft_id'
  ) THEN
    ALTER TABLE bag_equipment 
    ADD COLUMN shaft_id UUID REFERENCES equipment(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN bag_equipment.shaft_id IS 'Reference to custom shaft selection from equipment table';
  END IF;
END $$;

-- Add grip_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bag_equipment' 
    AND column_name = 'grip_id'
  ) THEN
    ALTER TABLE bag_equipment 
    ADD COLUMN grip_id UUID REFERENCES equipment(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN bag_equipment.grip_id IS 'Reference to custom grip selection from equipment table';
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bag_equipment_shaft ON bag_equipment(shaft_id);
CREATE INDEX IF NOT EXISTS idx_bag_equipment_grip ON bag_equipment(grip_id);

-- Update RLS policies to include new columns
ALTER POLICY "Users can view their own bag equipment" ON bag_equipment
  USING (
    EXISTS (
      SELECT 1 FROM user_bags
      WHERE user_bags.id = bag_equipment.bag_id
      AND user_bags.user_id = auth.uid()
    )
  );

ALTER POLICY "Users can insert their own bag equipment" ON bag_equipment
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_bags
      WHERE user_bags.id = bag_equipment.bag_id
      AND user_bags.user_id = auth.uid()
    )
  );

ALTER POLICY "Users can update their own bag equipment" ON bag_equipment
  USING (
    EXISTS (
      SELECT 1 FROM user_bags
      WHERE user_bags.id = bag_equipment.bag_id
      AND user_bags.user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT SELECT ON equipment TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bag_equipment TO authenticated;