-- Create the waitlist_applications table that the code expects
CREATE TABLE IF NOT EXISTS public.waitlist_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    city_region TEXT,
    score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected')),
    answers JSONB DEFAULT '{}',
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    referred_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_applications_email ON public.waitlist_applications(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_applications_status ON public.waitlist_applications(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_applications_score ON public.waitlist_applications(score DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_applications_created_at ON public.waitlist_applications(created_at DESC);

-- Enable RLS
ALTER TABLE public.waitlist_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can insert to waitlist_applications" ON public.waitlist_applications;
DROP POLICY IF EXISTS "Service role has full access" ON public.waitlist_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.waitlist_applications;
DROP POLICY IF EXISTS "Admins can update applications" ON public.waitlist_applications;

-- Create RLS policies
-- Allow anyone (including anonymous) to insert
CREATE POLICY "Anyone can insert to waitlist_applications"
ON public.waitlist_applications
FOR INSERT
TO public
WITH CHECK (true);

-- Service role has full access
CREATE POLICY "Service role has full access"
ON public.waitlist_applications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON public.waitlist_applications
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

-- Admins can update applications
CREATE POLICY "Admins can update applications"
ON public.waitlist_applications
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO public, anon, authenticated;
GRANT INSERT ON public.waitlist_applications TO public, anon, authenticated;
GRANT SELECT ON public.waitlist_applications TO anon, authenticated;
GRANT UPDATE ON public.waitlist_applications TO authenticated;
GRANT ALL ON public.waitlist_applications TO service_role;