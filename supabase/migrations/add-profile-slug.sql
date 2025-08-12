-- Add slug field to profiles table for URL-friendly usernames
-- This will be generated from display_name, similar to Facebook

-- Add the slug column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS slug VARCHAR(50);

-- Create a function to generate slug from display name
CREATE OR REPLACE FUNCTION generate_slug(display_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug: lowercase, replace spaces/special chars with nothing or dash
  base_slug := LOWER(display_name);
  base_slug := REGEXP_REPLACE(base_slug, '[^a-z0-9]+', '', 'g');
  
  -- If empty after cleaning, use a default
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'user';
  END IF;
  
  -- Start with the base slug
  final_slug := base_slug;
  
  -- Check for uniqueness and add number if needed
  WHILE EXISTS (SELECT 1 FROM profiles WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Update existing profiles with slugs based on display_name
UPDATE profiles
SET slug = generate_slug(COALESCE(display_name, username, 'user' || id::text))
WHERE slug IS NULL;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_unique 
ON profiles (slug) 
WHERE slug IS NOT NULL;

-- Add check constraint for slug format
ALTER TABLE profiles
ADD CONSTRAINT slug_format_check 
CHECK (
  slug IS NULL OR 
  (LENGTH(slug) >= 1 AND slug ~ '^[a-z0-9]+$')
);

-- Create trigger to auto-generate slug when display_name changes
CREATE OR REPLACE FUNCTION update_profile_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update slug if display_name changed and slug is not manually set
  IF (NEW.display_name IS DISTINCT FROM OLD.display_name) THEN
    -- Only auto-update if the slug seems auto-generated (matches pattern)
    IF OLD.slug IS NULL OR OLD.slug = generate_slug(OLD.display_name) THEN
      NEW.slug := generate_slug(NEW.display_name);
    END IF;
  END IF;
  
  -- For new records, always generate slug
  IF OLD.slug IS NULL AND NEW.slug IS NULL AND NEW.display_name IS NOT NULL THEN
    NEW.slug := generate_slug(NEW.display_name);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_slug_trigger
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_profile_slug();

-- Add comment
COMMENT ON COLUMN profiles.slug IS 'URL-friendly identifier generated from display_name';