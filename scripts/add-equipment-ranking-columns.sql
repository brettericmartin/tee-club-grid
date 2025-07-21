-- Add ranking columns to equipment table
-- These columns will be updated by the ranking script

-- Add category rank (1 = best in category)
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS category_rank INTEGER;

-- Add total tees from all bags containing this equipment
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS total_bag_tees INTEGER DEFAULT 0;

-- Add count of bags using this equipment
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS bags_count INTEGER DEFAULT 0;

-- Add count of photos for this equipment
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS photos_count INTEGER DEFAULT 0;

-- Add composite ranking score for sorting
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS ranking_score FLOAT DEFAULT 0;

-- Add timestamp for when ranking was last calculated
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS last_ranked_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient queries by category and rank
CREATE INDEX IF NOT EXISTS idx_equipment_category_rank 
ON equipment(category, category_rank) 
WHERE category_rank IS NOT NULL;

-- Create index for efficient queries by ranking score
CREATE INDEX IF NOT EXISTS idx_equipment_ranking_score 
ON equipment(ranking_score DESC);

-- Add comment explaining the ranking system
COMMENT ON COLUMN equipment.category_rank IS 'Rank within category (1=best). Updated weekly based on: has photos, total bag tees, photo count';
COMMENT ON COLUMN equipment.total_bag_tees IS 'Sum of tees_count from all bags containing this equipment';
COMMENT ON COLUMN equipment.bags_count IS 'Number of bags using this equipment';
COMMENT ON COLUMN equipment.photos_count IS 'Number of photos in equipment_photos table';
COMMENT ON COLUMN equipment.ranking_score IS 'Composite score: (total_bag_tees * 10000) + (photos_count * 100) + (bags_count * 10) + random(0-1)';