-- Add likes functionality to equipment photos

-- Create equipment_photo_likes table
CREATE TABLE IF NOT EXISTS equipment_photo_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id uuid NOT NULL REFERENCES equipment_photos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(photo_id, user_id)
);

-- Add likes_count to equipment_photos for performance
ALTER TABLE equipment_photos 
ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0;

-- Create function to update likes count
CREATE OR REPLACE FUNCTION update_photo_likes_count()
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

-- Create trigger to maintain likes count
CREATE TRIGGER update_photo_likes_count_trigger
AFTER INSERT OR DELETE ON equipment_photo_likes
FOR EACH ROW EXECUTE FUNCTION update_photo_likes_count();

-- RLS policies for equipment_photo_likes
ALTER TABLE equipment_photo_likes ENABLE ROW LEVEL SECURITY;

-- Users can see all likes
CREATE POLICY "Anyone can view photo likes" ON equipment_photo_likes
  FOR SELECT USING (true);

-- Users can only manage their own likes
CREATE POLICY "Users can manage own likes" ON equipment_photo_likes
  FOR ALL USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_equipment_photo_likes_user_photo ON equipment_photo_likes(user_id, photo_id);
CREATE INDEX idx_equipment_photos_likes_count ON equipment_photos(likes_count DESC);