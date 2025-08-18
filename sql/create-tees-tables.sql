-- Create bag_tees table
CREATE TABLE IF NOT EXISTS public.bag_tees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bag_id UUID REFERENCES public.user_bags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, bag_id)
);

-- Enable RLS on bag_tees
ALTER TABLE public.bag_tees ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bag_tees
CREATE POLICY "Anyone can view bag tees" 
ON public.bag_tees 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated can tee bags" 
ON public.bag_tees 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can untee bags" 
ON public.bag_tees 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Create equipment_tees table
CREATE TABLE IF NOT EXISTS public.equipment_tees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, equipment_id)
);

-- Enable RLS on equipment_tees
ALTER TABLE public.equipment_tees ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for equipment_tees
CREATE POLICY "Anyone can view equipment tees" 
ON public.equipment_tees 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated can tee equipment" 
ON public.equipment_tees 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can untee equipment" 
ON public.equipment_tees 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Add tees_count columns to relevant tables
ALTER TABLE public.user_bags 
ADD COLUMN IF NOT EXISTS tees_count INTEGER DEFAULT 0;

ALTER TABLE public.equipment 
ADD COLUMN IF NOT EXISTS tees_count INTEGER DEFAULT 0;

-- Create trigger functions for tees_count
CREATE OR REPLACE FUNCTION update_bag_tees_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_bags 
    SET tees_count = tees_count + 1
    WHERE id = NEW.bag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_bags 
    SET tees_count = GREATEST(tees_count - 1, 0)
    WHERE id = OLD.bag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_equipment_tees_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE equipment 
    SET tees_count = tees_count + 1
    WHERE id = NEW.equipment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE equipment 
    SET tees_count = GREATEST(tees_count - 1, 0)
    WHERE id = OLD.equipment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_bag_tees_trigger ON public.bag_tees;
CREATE TRIGGER update_bag_tees_trigger
AFTER INSERT OR DELETE ON public.bag_tees
FOR EACH ROW
EXECUTE FUNCTION update_bag_tees_count();

DROP TRIGGER IF EXISTS update_equipment_tees_trigger ON public.equipment_tees;
CREATE TRIGGER update_equipment_tees_trigger
AFTER INSERT OR DELETE ON public.equipment_tees
FOR EACH ROW
EXECUTE FUNCTION update_equipment_tees_count();