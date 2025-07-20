-- Add foreign key constraints for shaft_id and grip_id if they don't exist
DO $$ 
BEGIN
    -- Check and add foreign key for shaft_id
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'bag_equipment_shaft_id_fkey'
        AND table_name = 'bag_equipment'
    ) THEN
        ALTER TABLE bag_equipment
        ADD CONSTRAINT bag_equipment_shaft_id_fkey
        FOREIGN KEY (shaft_id) REFERENCES equipment(id) ON DELETE SET NULL;
    END IF;

    -- Check and add foreign key for grip_id
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'bag_equipment_grip_id_fkey'
        AND table_name = 'bag_equipment'
    ) THEN
        ALTER TABLE bag_equipment
        ADD CONSTRAINT bag_equipment_grip_id_fkey
        FOREIGN KEY (grip_id) REFERENCES equipment(id) ON DELETE SET NULL;
    END IF;
END $$;