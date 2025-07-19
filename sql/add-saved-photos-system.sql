-- Saved Photos System
-- Allows users to save equipment photos from other users to use for their own equipment

-- 1. Create saved_photos table
CREATE TABLE IF NOT EXISTS saved_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('equipment_photo', 'bag_equipment', 'feed_post', 'user_upload')) NOT NULL,
  source_id UUID, -- ID of the source record (equipment_photos.id, bag_equipment.id, or feed_posts.id)
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  saved_from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  original_caption TEXT,
  user_notes TEXT,
  tags TEXT[],
  is_favorited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, photo_url)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_photos_user ON saved_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_photos_equipment ON saved_photos(equipment_id);
CREATE INDEX IF NOT EXISTS idx_saved_photos_saved_from ON saved_photos(saved_from_user_id);
CREATE INDEX IF NOT EXISTS idx_saved_photos_created ON saved_photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_photos_favorited ON saved_photos(is_favorited) WHERE is_favorited = true;

-- 3. Create photo usage tracking table (for attribution and potential revenue sharing)
CREATE TABLE IF NOT EXISTS photo_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_url TEXT NOT NULL,
  used_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  original_uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  bag_equipment_id UUID REFERENCES bag_equipment(id) ON DELETE CASCADE,
  usage_type TEXT CHECK (usage_type IN ('bag_equipment', 'review', 'showcase')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add save count to equipment_photos table
ALTER TABLE equipment_photos ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0;
ALTER TABLE equipment_photos ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- 5. Create function to track photo saves
CREATE OR REPLACE FUNCTION update_photo_save_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update save count on equipment_photos if source is equipment_photo
    IF NEW.source_type = 'equipment_photo' AND NEW.source_id IS NOT NULL THEN
      UPDATE equipment_photos 
      SET save_count = save_count + 1 
      WHERE id = NEW.source_id;
    END IF;
    
    -- Track contribution for badges
    UPDATE profiles
    SET metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{photos_saved_by_others}',
      to_jsonb(COALESCE((metadata->>'photos_saved_by_others')::integer, 0) + 1)
    )
    WHERE id = NEW.saved_from_user_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update save count on equipment_photos
    IF OLD.source_type = 'equipment_photo' AND OLD.source_id IS NOT NULL THEN
      UPDATE equipment_photos 
      SET save_count = GREATEST(save_count - 1, 0) 
      WHERE id = OLD.source_id;
    END IF;
    
    -- Update contribution tracking
    UPDATE profiles
    SET metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{photos_saved_by_others}',
      to_jsonb(GREATEST(COALESCE((metadata->>'photos_saved_by_others')::integer, 0) - 1, 0))
    )
    WHERE id = OLD.saved_from_user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to track photo usage
CREATE OR REPLACE FUNCTION track_photo_usage()
RETURNS TRIGGER AS $$
DECLARE
  original_uploader UUID;
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.custom_photo_url IS DISTINCT FROM NEW.custom_photo_url) THEN
    -- Find the original uploader from saved_photos
    SELECT saved_from_user_id INTO original_uploader
    FROM saved_photos
    WHERE user_id = (SELECT user_id FROM user_bags WHERE id = NEW.bag_id)
    AND photo_url = NEW.custom_photo_url
    LIMIT 1;
    
    IF original_uploader IS NOT NULL THEN
      -- Record the usage
      INSERT INTO photo_usage (
        photo_url,
        used_by_user_id,
        original_uploader_id,
        equipment_id,
        bag_equipment_id,
        usage_type
      ) VALUES (
        NEW.custom_photo_url,
        (SELECT user_id FROM user_bags WHERE id = NEW.bag_id),
        original_uploader,
        NEW.equipment_id,
        NEW.id,
        'bag_equipment'
      );
      
      -- Update usage count on equipment_photos
      UPDATE equipment_photos
      SET usage_count = usage_count + 1
      WHERE photo_url = NEW.custom_photo_url;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create triggers
DROP TRIGGER IF EXISTS update_photo_save_count_trigger ON saved_photos;
CREATE TRIGGER update_photo_save_count_trigger
AFTER INSERT OR DELETE ON saved_photos
FOR EACH ROW
EXECUTE FUNCTION update_photo_save_count();

DROP TRIGGER IF EXISTS track_photo_usage_trigger ON bag_equipment;
CREATE TRIGGER track_photo_usage_trigger
AFTER INSERT OR UPDATE OF custom_photo_url ON bag_equipment
FOR EACH ROW
WHEN (NEW.custom_photo_url IS NOT NULL)
EXECUTE FUNCTION track_photo_usage();

-- 8. Enable RLS
ALTER TABLE saved_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_usage ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for saved_photos
CREATE POLICY "Users can view their own saved photos" ON saved_photos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save photos when authenticated" ON saved_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved photos" ON saved_photos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved photos" ON saved_photos
  FOR DELETE USING (auth.uid() = user_id);

-- 10. RLS Policies for photo_usage
CREATE POLICY "Photo usage viewable by photo owner and user" ON photo_usage
  FOR SELECT USING (
    auth.uid() = used_by_user_id OR 
    auth.uid() = original_uploader_id
  );

CREATE POLICY "System can track photo usage" ON photo_usage
  FOR INSERT WITH CHECK (true); -- Triggered by system

-- 11. Create view for photo gallery with attribution
CREATE OR REPLACE VIEW saved_photos_gallery AS
SELECT 
  sp.*,
  p.username as saved_from_username,
  p.display_name as saved_from_display_name,
  p.avatar_url as saved_from_avatar,
  e.brand as equipment_brand,
  e.model as equipment_model,
  e.category as equipment_category,
  CASE 
    WHEN sp.source_type = 'equipment_photo' THEN ep.caption
    WHEN sp.source_type = 'feed_post' THEN fp.content::json->>'caption'
    ELSE NULL
  END as source_caption
FROM saved_photos sp
LEFT JOIN profiles p ON sp.saved_from_user_id = p.id
LEFT JOIN equipment e ON sp.equipment_id = e.id
LEFT JOIN equipment_photos ep ON sp.source_type = 'equipment_photo' AND sp.source_id = ep.id
LEFT JOIN feed_posts fp ON sp.source_type = 'feed_post' AND sp.source_id = fp.id;

-- 12. Grant access to the view
GRANT SELECT ON saved_photos_gallery TO authenticated;

-- 13. Create function to save photo with proper attribution
CREATE OR REPLACE FUNCTION save_equipment_photo(
  p_user_id UUID,
  p_photo_url TEXT,
  p_source_type TEXT,
  p_source_id UUID,
  p_equipment_id UUID,
  p_saved_from_user_id UUID,
  p_notes TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS saved_photos AS $$
DECLARE
  saved_photo saved_photos;
BEGIN
  INSERT INTO saved_photos (
    user_id,
    photo_url,
    source_type,
    source_id,
    equipment_id,
    saved_from_user_id,
    user_notes,
    tags
  ) VALUES (
    p_user_id,
    p_photo_url,
    p_source_type,
    p_source_id,
    p_equipment_id,
    p_saved_from_user_id,
    p_notes,
    p_tags
  )
  ON CONFLICT (user_id, photo_url) 
  DO UPDATE SET
    user_notes = EXCLUDED.user_notes,
    tags = EXCLUDED.tags,
    is_favorited = saved_photos.is_favorited -- Preserve favorite status
  RETURNING * INTO saved_photo;
  
  RETURN saved_photo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ SAVED PHOTOS SYSTEM COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE 'What was added:';
  RAISE NOTICE '✓ Saved photos table with attribution';
  RAISE NOTICE '✓ Photo usage tracking for revenue sharing';
  RAISE NOTICE '✓ Save/usage count tracking';
  RAISE NOTICE '✓ Gallery view with full attribution';
  RAISE NOTICE '✓ RLS policies for privacy';
  RAISE NOTICE '✓ Helper function for saving photos';
  RAISE NOTICE '';
  RAISE NOTICE 'Features enabled:';
  RAISE NOTICE '- Save photos from any equipment showcase';
  RAISE NOTICE '- Use saved photos for your own equipment';
  RAISE NOTICE '- Track photo contributions for badges';
  RAISE NOTICE '- Attribution chain for potential revenue sharing';
  RAISE NOTICE '';
END $$;