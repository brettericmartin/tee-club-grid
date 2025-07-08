-- Multi-bag support migrations

-- 1. Add fields to user_bags for multi-bag support
ALTER TABLE public.user_bags 
ADD COLUMN IF NOT EXISTS bag_type text DEFAULT 'real',
ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS background_image text DEFAULT 'midwest-lush';

-- 2. Set existing bags as primary
UPDATE user_bags SET is_primary = true WHERE is_primary IS NULL;

-- 3. Create unique index for one primary bag per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_primary_bag_per_user 
ON user_bags (user_id) 
WHERE is_primary = true;

-- 4. Add featured flag to bag_equipment if not exists
ALTER TABLE public.bag_equipment
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- 5. Update bag_equipment with default shaft/grip for existing items
UPDATE bag_equipment be
SET 
  shaft_id = (SELECT id FROM shafts WHERE is_stock = true AND category = e.category LIMIT 1),
  grip_id = (SELECT id FROM grips WHERE is_stock = true LIMIT 1)
FROM equipment e
WHERE be.equipment_id = e.id
AND be.shaft_id IS NULL;

-- 6. Create equipment_photos table for community photos
CREATE TABLE IF NOT EXISTS public.equipment_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  equipment_id uuid REFERENCES public.equipment(id),
  photo_url text NOT NULL,
  is_primary boolean DEFAULT false,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT equipment_photos_pkey PRIMARY KEY (id)
);

-- 7. Add RLS policies for equipment_photos
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipment photos are viewable by everyone" ON equipment_photos
  FOR SELECT USING (true);

CREATE POLICY "Users can upload equipment photos" ON equipment_photos
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update own photos" ON equipment_photos
  FOR UPDATE USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete own photos" ON equipment_photos
  FOR DELETE USING (auth.uid() = uploaded_by);