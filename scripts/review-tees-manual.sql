-- Manual SQL script for review tees functionality
-- Run this in your Supabase SQL editor

-- 1. Add columns to equipment_reviews if they don't exist
ALTER TABLE equipment_reviews 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS tee_count INTEGER DEFAULT 0;

-- 2. Create review_tees table
CREATE TABLE IF NOT EXISTS review_tees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES equipment_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_tees_review_id ON review_tees(review_id);
CREATE INDEX IF NOT EXISTS idx_review_tees_user_id ON review_tees(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_reviews_tee_count ON equipment_reviews(tee_count);

-- 4. Enable RLS on review_tees
ALTER TABLE review_tees ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
-- Policy: Anyone can view review tees
CREATE POLICY "review_tees_select_policy" ON review_tees
  FOR SELECT USING (true);

-- Policy: Authenticated users can insert their own tees
CREATE POLICY "review_tees_insert_policy" ON review_tees
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own tees
CREATE POLICY "review_tees_delete_policy" ON review_tees
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Create function to update tee_count
CREATE OR REPLACE FUNCTION update_review_tee_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE equipment_reviews 
    SET tee_count = tee_count + 1 
    WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE equipment_reviews 
    SET tee_count = tee_count - 1 
    WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger
CREATE TRIGGER update_review_tee_count_trigger
AFTER INSERT OR DELETE ON review_tees
FOR EACH ROW EXECUTE FUNCTION update_review_tee_count();

-- 8. Grant permissions (adjust based on your needs)
GRANT ALL ON review_tees TO authenticated;
GRANT ALL ON review_tees TO anon;

-- Test query to verify setup
SELECT 
  'review_tees table' as component,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'review_tees') as exists
UNION ALL
SELECT 
  'title column in equipment_reviews',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment_reviews' AND column_name = 'title')
UNION ALL
SELECT 
  'tee_count column in equipment_reviews',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment_reviews' AND column_name = 'tee_count');