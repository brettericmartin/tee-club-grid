-- Migration: Backfill and auto-generate referral codes for profiles
-- Date: 2025-01-24
-- Purpose: Ensure all profiles have unique referral codes for sharing

-- ============================================================================
-- PART 1: Add column and index if not exists
-- ============================================================================

-- Add referral_code column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code 
ON profiles(referral_code) 
WHERE referral_code IS NOT NULL;

-- ============================================================================
-- PART 2: Function to generate unique referral codes
-- ============================================================================

-- Function to generate a unique 8-character referral code
CREATE OR REPLACE FUNCTION generate_unique_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_code TEXT;
    done BOOLEAN;
BEGIN
    done := false;
    WHILE NOT done LOOP
        -- Generate 8-character alphanumeric code (uppercase)
        -- Using MD5 hash of random UUID + timestamp for better randomness
        new_code := UPPER(
            SUBSTRING(
                MD5(gen_random_uuid()::TEXT || NOW()::TEXT),
                1, 8
            )
        );
        
        -- Check if code already exists
        done := NOT EXISTS(
            SELECT 1 FROM profiles 
            WHERE referral_code = new_code
        );
    END LOOP;
    
    RETURN new_code;
END;
$$;

-- ============================================================================
-- PART 3: Backfill existing profiles with referral codes
-- ============================================================================

-- Update all profiles that don't have a referral code
DO $$
DECLARE
    profile_record RECORD;
    new_code TEXT;
    update_count INTEGER := 0;
BEGIN
    -- Loop through profiles without referral codes
    FOR profile_record IN 
        SELECT id, email 
        FROM profiles 
        WHERE referral_code IS NULL
        ORDER BY created_at ASC
    LOOP
        -- Generate unique code
        new_code := generate_unique_referral_code();
        
        -- Update the profile
        UPDATE profiles 
        SET referral_code = new_code
        WHERE id = profile_record.id;
        
        update_count := update_count + 1;
        
        -- Log progress every 100 records
        IF update_count % 100 = 0 THEN
            RAISE NOTICE 'Updated % profiles with referral codes', update_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Completed: Updated % total profiles with referral codes', update_count;
END;
$$;

-- ============================================================================
-- PART 4: Trigger for auto-generating codes for new profiles
-- ============================================================================

-- Function to auto-generate referral code on insert
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only generate if referral_code is NULL
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_unique_referral_code();
    END IF;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON profiles;

-- Create trigger for new profiles
CREATE TRIGGER trigger_auto_generate_referral_code
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_referral_code();

-- ============================================================================
-- PART 5: Verification and statistics
-- ============================================================================

-- Show statistics
DO $$
DECLARE
    total_profiles INTEGER;
    profiles_with_codes INTEGER;
    profiles_without_codes INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_profiles FROM profiles;
    SELECT COUNT(*) INTO profiles_with_codes FROM profiles WHERE referral_code IS NOT NULL;
    SELECT COUNT(*) INTO profiles_without_codes FROM profiles WHERE referral_code IS NULL;
    
    RAISE NOTICE '=== Referral Code Migration Statistics ===';
    RAISE NOTICE 'Total profiles: %', total_profiles;
    RAISE NOTICE 'Profiles with referral codes: %', profiles_with_codes;
    RAISE NOTICE 'Profiles without referral codes: %', profiles_without_codes;
    
    -- Verify uniqueness
    IF EXISTS (
        SELECT referral_code, COUNT(*) 
        FROM profiles 
        WHERE referral_code IS NOT NULL
        GROUP BY referral_code 
        HAVING COUNT(*) > 1
    ) THEN
        RAISE WARNING 'Duplicate referral codes detected! Manual intervention required.';
    ELSE
        RAISE NOTICE 'All referral codes are unique ✓';
    END IF;
END;
$$;

-- ============================================================================
-- NOTES:
-- 1. This migration is idempotent - safe to run multiple times
-- 2. Uses 8-character codes (e.g., "A3F7K9M2") for better memorability
-- 3. Codes are uppercase alphanumeric for consistency
-- 4. Automatic generation for new profiles via trigger
-- 5. Index created for fast lookups when validating referral URLs
-- ============================================================================