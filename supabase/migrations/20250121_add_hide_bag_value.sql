-- Migration: Add option to hide bag value
-- Purpose: Allow users to hide the total value of their bag from public view
-- Date: 2025-01-21

-- Add hide_value column to user_bags table
ALTER TABLE user_bags
ADD COLUMN IF NOT EXISTS hide_value BOOLEAN DEFAULT false;

-- Add comment to document the field
COMMENT ON COLUMN user_bags.hide_value IS 'When true, the bag value will not be shown publicly';

-- Verify the migration
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_bags' 
        AND column_name = 'hide_value'
    ) THEN
        RAISE NOTICE 'Successfully added hide_value column to user_bags table';
    ELSE
        RAISE EXCEPTION 'Failed to add hide_value column';
    END IF;
END $$;