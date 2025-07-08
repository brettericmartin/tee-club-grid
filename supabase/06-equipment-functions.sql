-- Create function to check for equipment duplicates
CREATE OR REPLACE FUNCTION check_equipment_exists(
  input_brand text,
  input_model text,
  input_category text
)
RETURNS TABLE(
  id uuid,
  brand text,
  model text,
  category text,
  similarity double precision,
  match_type text
) AS $$
BEGIN
  RETURN QUERY
  WITH similarity_scores AS (
    SELECT 
      e.id,
      e.brand,
      e.model,
      e.category,
      similarity(LOWER(e.brand || ' ' || e.model), LOWER(input_brand || ' ' || input_model)) as sim_score
    FROM equipment e
    WHERE e.category = input_category
  )
  SELECT 
    ss.id,
    ss.brand,
    ss.model,
    ss.category,
    ss.sim_score as similarity,
    CASE 
      WHEN LOWER(ss.brand) = LOWER(input_brand) AND LOWER(ss.model) = LOWER(input_model) THEN 'exact'
      WHEN ss.sim_score > 0.8 THEN 'very_similar'
      WHEN ss.sim_score > 0.6 THEN 'similar'
      ELSE 'different'
    END as match_type
  FROM similarity_scores ss
  WHERE ss.sim_score > 0.6
  ORDER BY ss.sim_score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Enable pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_equipment_brand_trgm ON equipment USING gin (brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_equipment_model_trgm ON equipment USING gin (model gin_trgm_ops);

-- Add custom_photo_url to bag_equipment if missing
ALTER TABLE public.bag_equipment
ADD COLUMN IF NOT EXISTS custom_photo_url text;