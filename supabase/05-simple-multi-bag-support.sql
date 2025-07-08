-- Simple multi-bag support - NO PRIMARY CONSTRAINT

-- 1. Add fields to user_bags for multi-bag support
ALTER TABLE public.user_bags 
ADD COLUMN IF NOT EXISTS bag_type text DEFAULT 'real',
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS background_image text DEFAULT 'midwest-lush';

-- 2. Add featured flag and customization columns to bag_equipment
ALTER TABLE public.bag_equipment
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS shaft_id uuid REFERENCES public.shafts(id),
ADD COLUMN IF NOT EXISTS grip_id uuid REFERENCES public.grips(id),
ADD COLUMN IF NOT EXISTS loft_option_id uuid REFERENCES public.loft_options(id),
ADD COLUMN IF NOT EXISTS custom_photo_url text;

-- 3. Create equipment_photos table for community photos
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

-- 4. Add RLS policies for equipment_photos
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipment photos are viewable by everyone" ON equipment_photos
  FOR SELECT USING (true);

CREATE POLICY "Users can upload equipment photos" ON equipment_photos
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update own photos" ON equipment_photos
  FOR UPDATE USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete own photos" ON equipment_photos
  FOR DELETE USING (auth.uid() = uploaded_by);