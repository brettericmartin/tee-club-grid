-- Fix RLS policies for equipment_saves table
-- Run this in Supabase SQL editor

-- First ensure the table exists with correct structure
CREATE TABLE IF NOT EXISTS equipment_saves (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, equipment_id)
);

-- Enable RLS
ALTER TABLE equipment_saves ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own saves" ON equipment_saves;
DROP POLICY IF EXISTS "Users can insert own saves" ON equipment_saves;
DROP POLICY IF EXISTS "Users can delete own saves" ON equipment_saves;
DROP POLICY IF EXISTS "Public equipment saves are viewable by everyone" ON equipment_saves;

-- Create new policies
-- Users can view their own saves
CREATE POLICY "Users can view own saves" ON equipment_saves
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own saves
CREATE POLICY "Users can insert own saves" ON equipment_saves
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own saves
CREATE POLICY "Users can delete own saves" ON equipment_saves
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_saves_user_id ON equipment_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_saves_equipment_id ON equipment_saves(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_saves_user_equipment ON equipment_saves(user_id, equipment_id);

-- Grant permissions
GRANT ALL ON equipment_saves TO authenticated;
GRANT SELECT ON equipment_saves TO anon;

-- Add a saves_count column to equipment table for performance
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS saves_count integer DEFAULT 0;

-- Create function to update saves count
CREATE OR REPLACE FUNCTION update_equipment_saves_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE equipment 
    SET saves_count = saves_count + 1 
    WHERE id = NEW.equipment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE equipment 
    SET saves_count = saves_count - 1 
    WHERE id = OLD.equipment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain saves count
DROP TRIGGER IF EXISTS update_equipment_saves_count_trigger ON equipment_saves;
CREATE TRIGGER update_equipment_saves_count_trigger
AFTER INSERT OR DELETE ON equipment_saves
FOR EACH ROW EXECUTE FUNCTION update_equipment_saves_count();

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'equipment_saves';

-- List all policies
SELECT * FROM pg_policies 
WHERE tablename = 'equipment_saves';