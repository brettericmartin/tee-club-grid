-- Multi-bag support migrations (Fixed version)

-- 1. Add fields to user_bags for multi-bag support
ALTER TABLE public.user_bags 
ADD COLUMN IF NOT EXISTS bag_type text DEFAULT 'real',
ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS background_image text DEFAULT 'midwest-lush';

-- 2. Remove the problematic unique constraint if it exists
DROP INDEX IF EXISTS idx_one_primary_bag_per_user;

-- 3. Set ONE bag as primary per user (to fix the duplicate issue)
-- First, set all to false
UPDATE user_bags SET is_primary = false;

-- Then set only the first bag for each user as primary
UPDATE user_bags 
SET is_primary = true 
WHERE id IN (
  SELECT DISTINCT ON (user_id) id 
  FROM user_bags 
  ORDER BY user_id, created_at ASC
);

-- 4. Add featured flag to bag_equipment if not exists
ALTER TABLE public.bag_equipment
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- 5. Add columns for equipment customization
ALTER TABLE public.bag_equipment
ADD COLUMN IF NOT EXISTS shaft_id uuid REFERENCES public.shafts(id),
ADD COLUMN IF NOT EXISTS grip_id uuid REFERENCES public.grips(id),
ADD COLUMN IF NOT EXISTS loft_option_id uuid REFERENCES public.loft_options(id),
ADD COLUMN IF NOT EXISTS custom_photo_url text;

-- 6. Update bag_equipment with default shaft/grip for existing items
UPDATE bag_equipment be
SET 
  shaft_id = COALESCE(be.shaft_id, (SELECT id FROM shafts WHERE is_stock = true AND category = e.category LIMIT 1)),
  grip_id = COALESCE(be.grip_id, (SELECT id FROM grips WHERE is_stock = true LIMIT 1))
FROM equipment e
WHERE be.equipment_id = e.id
AND (be.shaft_id IS NULL OR be.grip_id IS NULL);

-- 7. Create equipment_photos table for community photos
CREATE TABLE IF NOT EXISTS public.equipment_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  equipment_id uuid REFERENCES public.equipment(id),
  photo_url text NOT NULL,
  caption text,
  is_primary boolean DEFAULT false,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT equipment_photos_pkey PRIMARY KEY (id)
);

-- 8. Add RLS policies for equipment_photos
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipment photos are viewable by everyone" ON equipment_photos
  FOR SELECT USING (true);

CREATE POLICY "Users can upload equipment photos" ON equipment_photos
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update own photos" ON equipment_photos
  FOR UPDATE USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete own photos" ON equipment_photos
  FOR DELETE USING (auth.uid() = uploaded_by);