import './supabase-admin.js';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const SQL_CREATE_WAITLIST = `
-- Create waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    beta_access_granted BOOLEAN DEFAULT false,
    notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_approved_at ON public.waitlist(approved_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_beta_access ON public.waitlist(beta_access_granted);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anonymous users can add to waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Service role has full access to waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Admins can view all waitlist entries" ON public.waitlist;
DROP POLICY IF EXISTS "Admins can update waitlist entries" ON public.waitlist;

-- Create RLS policies
CREATE POLICY "Anonymous users can add to waitlist"
ON public.waitlist
FOR INSERT
TO anon, authenticated
WITH CHECK (email IS NOT NULL);

CREATE POLICY "Service role has full access to waitlist"
ON public.waitlist
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view all waitlist entries"
ON public.waitlist
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

CREATE POLICY "Admins can update waitlist entries"
ON public.waitlist
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
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON public.waitlist TO anon, authenticated;
GRANT SELECT, UPDATE ON public.waitlist TO authenticated;
GRANT ALL ON public.waitlist TO service_role;
`;

async function createWaitlistTable() {
  console.log('🔨 Creating waitlist table and setting up RLS...\n');
  
  try {
    // Check if table exists first
    console.log('1. Checking if waitlist table exists...');
    const { data: checkData, error: checkError } = await supabase
      .from('waitlist')
      .select('*')
      .limit(0);
    
    if (!checkError || checkError.code !== '42P01') {
      console.log('   ⚠️ Waitlist table might already exist');
      console.log('   Proceeding with creation/update anyway...');
    } else {
      console.log('   Table does not exist, will create it');
    }
    
    // Execute the SQL
    console.log('\n2. Executing SQL to create table and policies...');
    
    // Note: Supabase JS client doesn't support raw SQL execution directly
    // We need to use the SQL editor in Supabase dashboard or the CLI
    console.log('\n📋 SQL to execute in Supabase SQL Editor:');
    console.log('=' .repeat(50));
    console.log(SQL_CREATE_WAITLIST);
    console.log('=' .repeat(50));
    
    console.log('\n⚠️ IMPORTANT: Please run the SQL above in your Supabase dashboard:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Paste and run the SQL above');
    console.log('5. Then run: node scripts/complete-system-check.js');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createWaitlistTable();