-- Add missing columns to waitlist_applications table
-- Run this in Supabase Dashboard SQL Editor

-- First check if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'waitlist_applications') THEN
        -- Add columns if they don't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'waitlist_applications' 
                      AND column_name = 'approved_at') THEN
            ALTER TABLE waitlist_applications ADD COLUMN approved_at TIMESTAMPTZ;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'waitlist_applications' 
                      AND column_name = 'score') THEN
            ALTER TABLE waitlist_applications ADD COLUMN score INTEGER DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'waitlist_applications' 
                      AND column_name = 'status') THEN
            ALTER TABLE waitlist_applications ADD COLUMN status TEXT DEFAULT 'pending' 
            CHECK (status IN ('pending', 'approved', 'rejected'));
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'waitlist_applications' 
                      AND column_name = 'city_region') THEN
            ALTER TABLE waitlist_applications ADD COLUMN city_region TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'waitlist_applications' 
                      AND column_name = 'display_name') THEN
            ALTER TABLE waitlist_applications ADD COLUMN display_name TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'waitlist_applications' 
                      AND column_name = 'answers') THEN
            ALTER TABLE waitlist_applications ADD COLUMN answers JSONB;
        END IF;
    ELSE
        -- Create the table if it doesn't exist
        CREATE TABLE waitlist_applications (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            display_name TEXT,
            city_region TEXT,
            answers JSONB,
            score INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            approved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_applications(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_score ON waitlist_applications(score DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_applications(email);

-- Enable RLS
ALTER TABLE waitlist_applications ENABLE ROW LEVEL SECURITY;

-- Add or replace RLS policy
DROP POLICY IF EXISTS "Waitlist applications admin only" ON waitlist_applications;
CREATE POLICY "Waitlist applications admin only" 
ON waitlist_applications FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'waitlist_applications'
ORDER BY ordinal_position;