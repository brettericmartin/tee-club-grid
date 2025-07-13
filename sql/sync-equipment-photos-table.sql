-- Add source column to track photo origin
ALTER TABLE equipment_photos 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'community' CHECK (source IN ('user_upload', 'community', 'manufacturer'));

-- Add unique constraint to prevent duplicate photos
ALTER TABLE equipment_photos 
ADD CONSTRAINT unique_user_equipment_photo UNIQUE (user_id, equipment_id, photo_url);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_equipment_photos_user_equipment 
ON equipment_photos(user_id, equipment_id);

-- Add likes_count column if it doesn't exist
ALTER TABLE equipment_photos 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Add is_primary column if it doesn't exist
ALTER TABLE equipment_photos 
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Create equipment_photo_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS equipment_photo_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  photo_id UUID REFERENCES equipment_photos(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, photo_id)
);

-- Create index for likes table
CREATE INDEX IF NOT EXISTS idx_equipment_photo_likes_photo_id 
ON equipment_photo_likes(photo_id);

-- Create trigger to update likes_count
CREATE OR REPLACE FUNCTION update_equipment_photo_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE equipment_photos 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.photo_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE equipment_photos 
    SET likes_count = likes_count - 1 
    WHERE id = OLD.photo_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for likes count
DROP TRIGGER IF EXISTS update_equipment_photo_likes_count_trigger ON equipment_photo_likes;
CREATE TRIGGER update_equipment_photo_likes_count_trigger
AFTER INSERT OR DELETE ON equipment_photo_likes
FOR EACH ROW EXECUTE FUNCTION update_equipment_photo_likes_count();

-- Update RLS policies for equipment_photos
ALTER POLICY "Users can view all equipment photos" ON equipment_photos 
USING (true);

DROP POLICY IF EXISTS "Users can create their own equipment photos" ON equipment_photos;
CREATE POLICY "Users can create their own equipment photos" ON equipment_photos 
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own equipment photos" ON equipment_photos;
CREATE POLICY "Users can update their own equipment photos" ON equipment_photos 
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own equipment photos" ON equipment_photos;
CREATE POLICY "Users can delete their own equipment photos" ON equipment_photos 
FOR DELETE USING (auth.uid() = user_id);