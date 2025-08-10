-- Fix equipment_reviews table by adding the missing review column
-- Run this in your Supabase SQL editor

-- Add the review text column
ALTER TABLE equipment_reviews 
ADD COLUMN IF NOT EXISTS review TEXT;

-- Alternatively, if you want to call it 'content' to match the original code:
-- ALTER TABLE equipment_reviews 
-- ADD COLUMN IF NOT EXISTS content TEXT;

-- Check the final structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'equipment_reviews' 
ORDER BY ordinal_position;