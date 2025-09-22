-- Migration: Add purchase link to bag equipment
-- Purpose: Allow users to add links where they purchased their equipment
-- Date: 2025-01-21

-- Add purchase_link column to bag_equipment table
ALTER TABLE bag_equipment
ADD COLUMN IF NOT EXISTS purchase_link TEXT;

-- Add comment to document the field
COMMENT ON COLUMN bag_equipment.purchase_link IS 'URL where the user purchased this equipment';

-- Verify the migration
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bag_equipment' 
        AND column_name = 'purchase_link'
    ) THEN
        RAISE NOTICE 'Successfully added purchase_link column to bag_equipment table';
    ELSE
        RAISE EXCEPTION 'Failed to add purchase_link column';
    END IF;
END $$;