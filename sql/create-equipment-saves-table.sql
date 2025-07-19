-- Create equipment_saves table if it doesn't exist
CREATE TABLE IF NOT EXISTS equipment_saves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    
    -- Ensure a user can only save each equipment once
    CONSTRAINT unique_user_equipment_save UNIQUE(user_id, equipment_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_saves_user_id ON equipment_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_saves_equipment_id ON equipment_saves(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_saves_created_at ON equipment_saves(created_at DESC);

-- Enable RLS
ALTER TABLE equipment_saves ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own saves" ON equipment_saves;
DROP POLICY IF EXISTS "Users can create their own saves" ON equipment_saves;
DROP POLICY IF EXISTS "Users can delete their own saves" ON equipment_saves;

-- Create RLS policies
CREATE POLICY "Users can view their own saves" ON equipment_saves
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saves" ON equipment_saves
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saves" ON equipment_saves
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON equipment_saves TO authenticated;
GRANT SELECT ON equipment_saves TO anon;

-- Add comment
COMMENT ON TABLE equipment_saves IS 'Tracks equipment items saved/favorited by users';