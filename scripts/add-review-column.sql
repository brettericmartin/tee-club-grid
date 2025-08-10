-- Add the review column to equipment_reviews table
-- This column stores the actual review text/content

ALTER TABLE equipment_reviews 
ADD COLUMN IF NOT EXISTS review TEXT;

-- If you have a 'content' column that should be renamed to 'review', use this instead:
-- ALTER TABLE equipment_reviews RENAME COLUMN content TO review;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'equipment_reviews' 
ORDER BY ordinal_position;