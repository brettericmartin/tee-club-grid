-- Disable Primary Bag Triggers
-- Run this to remove any conflicting database triggers

-- Drop the triggers if they exist
DROP TRIGGER IF EXISTS enforce_single_primary_bag_trigger ON user_bags;
DROP TRIGGER IF EXISTS set_primary_on_first_bag_trigger ON user_bags;
DROP TRIGGER IF EXISTS handle_primary_bag_deletion_trigger ON user_bags;

-- Drop the functions if they exist
DROP FUNCTION IF EXISTS enforce_single_primary_bag();
DROP FUNCTION IF EXISTS set_primary_on_first_bag();
DROP FUNCTION IF EXISTS handle_primary_bag_deletion();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ PRIMARY BAG TRIGGERS DISABLED!';
  RAISE NOTICE '';
  RAISE NOTICE 'The application code now handles primary bag logic.';
  RAISE NOTICE 'This prevents conflicts between triggers and app code.';
  RAISE NOTICE '';
END $$;