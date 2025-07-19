-- Primary Bag Support Migration (Fixed Version)
-- This ensures users can have multiple bags with one designated as primary

-- 1. First ensure is_primary column exists (it should already)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_bags' AND column_name = 'is_primary'
  ) THEN
    ALTER TABLE user_bags ADD COLUMN is_primary boolean DEFAULT false;
  END IF;
END $$;

-- 2. Set existing single bags as primary if not already set
UPDATE user_bags 
SET is_primary = true 
WHERE is_primary IS FALSE 
AND user_id IN (
  SELECT user_id 
  FROM user_bags 
  GROUP BY user_id 
  HAVING COUNT(*) = 1
);

-- 3. For users with multiple bags, set the most recently updated as primary if none are primary
WITH users_without_primary AS (
  SELECT user_id 
  FROM user_bags 
  GROUP BY user_id 
  HAVING COUNT(*) FILTER (WHERE is_primary = true) = 0
),
latest_bags AS (
  SELECT DISTINCT ON (user_id) id, user_id
  FROM user_bags
  WHERE user_id IN (SELECT user_id FROM users_without_primary)
  ORDER BY user_id, updated_at DESC NULLS LAST, created_at DESC
)
UPDATE user_bags 
SET is_primary = true 
WHERE id IN (SELECT id FROM latest_bags);

-- 4. Create a function to enforce only one primary bag per user
CREATE OR REPLACE FUNCTION enforce_single_primary_bag()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a bag as primary, unset all other bags for this user
  IF NEW.is_primary = true AND (OLD.is_primary IS NULL OR OLD.is_primary = false) THEN
    UPDATE user_bags 
    SET is_primary = false 
    WHERE user_id = NEW.user_id 
    AND id != NEW.id;
  END IF;
  
  -- Ensure at least one bag is primary if this is the only bag
  IF NEW.is_primary = false THEN
    PERFORM 1 FROM user_bags 
    WHERE user_id = NEW.user_id 
    AND id != NEW.id 
    AND is_primary = true;
    
    IF NOT FOUND THEN
      NEW.is_primary = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to enforce the constraint
DROP TRIGGER IF EXISTS enforce_single_primary_bag_trigger ON user_bags;
CREATE TRIGGER enforce_single_primary_bag_trigger
BEFORE UPDATE OF is_primary ON user_bags
FOR EACH ROW
EXECUTE FUNCTION enforce_single_primary_bag();

-- 6. Create a trigger for new bags
CREATE OR REPLACE FUNCTION set_primary_on_first_bag()
RETURNS TRIGGER AS $$
DECLARE
  has_bags boolean;
BEGIN
  -- Check if user has any bags
  SELECT EXISTS(SELECT 1 FROM user_bags WHERE user_id = NEW.user_id) INTO has_bags;
  
  -- If this is their first bag, make it primary
  IF NOT has_bags THEN
    NEW.is_primary = true;
  END IF;
  
  -- If they're explicitly setting this as primary, unset others
  IF NEW.is_primary = true THEN
    UPDATE user_bags 
    SET is_primary = false 
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for inserts
DROP TRIGGER IF EXISTS set_primary_on_first_bag_trigger ON user_bags;
CREATE TRIGGER set_primary_on_first_bag_trigger
BEFORE INSERT ON user_bags
FOR EACH ROW
EXECUTE FUNCTION set_primary_on_first_bag();

-- 8. Handle bag deletion - if primary bag is deleted, make another one primary
CREATE OR REPLACE FUNCTION handle_primary_bag_deletion()
RETURNS TRIGGER AS $$
DECLARE
  next_primary_id uuid;
BEGIN
  -- If deleting a primary bag, set another bag as primary
  IF OLD.is_primary = true THEN
    -- Find the next bag to make primary (most recently updated)
    SELECT id INTO next_primary_id
    FROM user_bags 
    WHERE user_id = OLD.user_id 
    AND id != OLD.id
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT 1;
    
    -- Update it to be primary if found
    IF next_primary_id IS NOT NULL THEN
      UPDATE user_bags 
      SET is_primary = true 
      WHERE id = next_primary_id;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for deletions
DROP TRIGGER IF EXISTS handle_primary_bag_deletion_trigger ON user_bags;
CREATE TRIGGER handle_primary_bag_deletion_trigger
BEFORE DELETE ON user_bags
FOR EACH ROW
EXECUTE FUNCTION handle_primary_bag_deletion();

-- 10. Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_user_bags_primary 
ON user_bags(user_id, is_primary) 
WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_user_bags_user_updated 
ON user_bags(user_id, updated_at DESC);

-- 11. Verify the migration worked
DO $$
DECLARE
  users_without_primary integer;
  users_with_multiple_primary integer;
BEGIN
  -- Check for users without a primary bag
  SELECT COUNT(DISTINCT user_id) INTO users_without_primary
  FROM user_bags
  WHERE user_id NOT IN (
    SELECT user_id FROM user_bags WHERE is_primary = true
  );
  
  -- Check for users with multiple primary bags
  SELECT COUNT(*) INTO users_with_multiple_primary
  FROM (
    SELECT user_id, COUNT(*) as primary_count
    FROM user_bags
    WHERE is_primary = true
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) AS multiple_primary;
  
  IF users_without_primary > 0 THEN
    RAISE WARNING 'Found % users without a primary bag', users_without_primary;
  END IF;
  
  IF users_with_multiple_primary > 0 THEN
    RAISE WARNING 'Found % users with multiple primary bags', users_with_multiple_primary;
  END IF;
  
  IF users_without_primary = 0 AND users_with_multiple_primary = 0 THEN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'All users have exactly one primary bag.';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ PRIMARY BAG SUPPORT MIGRATION COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE 'What was done:';
  RAISE NOTICE '✓ Added is_primary column (if needed)';
  RAISE NOTICE '✓ Set existing single bags as primary';
  RAISE NOTICE '✓ Created triggers to enforce one primary bag per user';
  RAISE NOTICE '✓ Handle automatic primary assignment on insert/delete';
  RAISE NOTICE '✓ Added performance indexes';
  RAISE NOTICE '✓ Verified data integrity';
  RAISE NOTICE '';
END $$;