-- Remove old shaft and grip tables after migration to equipment table
-- WARNING: This will permanently delete these tables and all their data

-- Drop foreign key constraints that reference these tables (if any exist)
DO $$ 
BEGIN
    -- Drop any foreign keys referencing shafts table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'bag_equipment'
        AND constraint_name LIKE '%shaft%'
    ) THEN
        ALTER TABLE bag_equipment DROP CONSTRAINT IF EXISTS bag_equipment_shaft_id_fkey CASCADE;
    END IF;

    -- Drop any foreign keys referencing grips table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'bag_equipment'
        AND constraint_name LIKE '%grip%'
    ) THEN
        ALTER TABLE bag_equipment DROP CONSTRAINT IF EXISTS bag_equipment_grip_id_fkey CASCADE;
    END IF;
END $$;

-- Drop the old tables
DROP TABLE IF EXISTS public.shafts CASCADE;
DROP TABLE IF EXISTS public.grips CASCADE;

-- Add a comment to document when and why these tables were removed
COMMENT ON COLUMN bag_equipment.shaft_id IS 'References equipment table where category = shaft (migrated from old shafts table)';
COMMENT ON COLUMN bag_equipment.grip_id IS 'References equipment table where category = grip (migrated from old grips table)';