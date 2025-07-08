-- Add specs column to equipment table
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '{}';

-- Add comment to describe the column
COMMENT ON COLUMN equipment.specs IS 'Equipment specifications like lofts, shaft options, etc.';