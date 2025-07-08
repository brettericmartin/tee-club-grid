-- Storage setup for equipment photos
-- Run this in Supabase SQL Editor

-- First, go to Storage in your Supabase dashboard and create these buckets:
-- 1. Click "New bucket"
-- 2. Name: "equipment-images"
-- 3. Toggle "Public bucket" to ON
-- 4. Click "Create bucket"

-- Then run this SQL to set up policies:

-- Storage policies for equipment-images bucket
INSERT INTO storage.policies (bucket_id, name, definition, check_expression)
VALUES 
  (
    'equipment-images',
    'Public Access',
    'bucket_id = ''equipment-images'''::text,
    NULL
  ),
  (
    'equipment-images',
    'Authenticated users can upload',
    'bucket_id = ''equipment-images'' AND auth.role() = ''authenticated'''::text,
    NULL
  )
ON CONFLICT (bucket_id, name) DO NOTHING;

-- Alternative: If you want to set up via SQL (requires storage extension)
-- Note: This might not work in all Supabase instances
/*
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-images', 'equipment-images', true)
ON CONFLICT (id) DO NOTHING;
*/