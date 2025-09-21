-- Migration: Allow Equipment Variants (Multiple instances with different specs)
-- This allows users to have multiple instances of the same equipment with different specifications
-- For example: Multiple wedges with different lofts, or woods with different shafts

-- Drop the existing UNIQUE constraint that prevents duplicates
-- This constraint was on (bag_id, equipment_id) which prevented any duplicates
ALTER TABLE bag_equipment 
DROP CONSTRAINT IF EXISTS bag_equipment_bag_id_equipment_id_key;

-- Add an index for performance since we're removing the unique constraint
-- This ensures queries remain fast when looking up equipment in a bag
CREATE INDEX IF NOT EXISTS idx_bag_equipment_bag_equipment 
ON bag_equipment(bag_id, equipment_id);

-- Add a comment to document this change
COMMENT ON TABLE bag_equipment IS 
'Stores equipment in user bags. Allows multiple instances of the same equipment with different specifications (loft, shaft, grip, etc). Variants are distinguished by their custom_specs and shaft/grip IDs.';

-- Create a helper function to check if equipment is a true duplicate
-- (same equipment AND same specifications)
CREATE OR REPLACE FUNCTION check_equipment_duplicate(
  p_bag_id UUID,
  p_equipment_id UUID,
  p_shaft_id UUID DEFAULT NULL,
  p_grip_id UUID DEFAULT NULL,
  p_custom_specs JSONB DEFAULT '{}'::jsonb
) RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if an exact duplicate exists (same equipment with identical specs)
  SELECT EXISTS(
    SELECT 1 
    FROM bag_equipment 
    WHERE bag_id = p_bag_id 
      AND equipment_id = p_equipment_id
      AND (
        (shaft_id IS NULL AND p_shaft_id IS NULL) OR 
        (shaft_id = p_shaft_id)
      )
      AND (
        (grip_id IS NULL AND p_grip_id IS NULL) OR 
        (grip_id = p_grip_id)
      )
      AND (
        (custom_specs IS NULL AND p_custom_specs = '{}'::jsonb) OR
        (custom_specs = p_custom_specs)
      )
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a comment to document the function
COMMENT ON FUNCTION check_equipment_duplicate IS 
'Checks if exact duplicate equipment exists in a bag (same equipment_id and all specifications). Returns TRUE if duplicate exists.';

-- Create a view to help identify equipment variants in a bag
CREATE OR REPLACE VIEW bag_equipment_variants AS
SELECT 
  be.*,
  e.brand,
  e.model,
  e.category,
  -- Count how many of this exact equipment model are in the bag
  COUNT(*) OVER (PARTITION BY be.bag_id, be.equipment_id) as variant_count,
  -- Assign a variant number for display
  ROW_NUMBER() OVER (
    PARTITION BY be.bag_id, be.equipment_id 
    ORDER BY 
      be.custom_specs->>'loft',
      be.shaft_id,
      be.grip_id,
      be.created_at
  ) as variant_number
FROM bag_equipment be
JOIN equipment e ON e.id = be.equipment_id;

-- Add a comment to document the view
COMMENT ON VIEW bag_equipment_variants IS 
'View showing equipment in bags with variant information. Shows variant_count (total instances) and variant_number (instance number) for equipment that appears multiple times with different specs.';

-- Grant appropriate permissions
GRANT SELECT ON bag_equipment_variants TO authenticated;
GRANT SELECT ON bag_equipment_variants TO anon;

-- Update RLS policies to use the new function for duplicate checking
-- (The actual RLS implementation will be in the application layer)