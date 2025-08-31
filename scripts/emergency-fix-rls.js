import './supabase-admin.js';
import { supabase } from './supabase-admin.js';

async function emergencyFixRLS() {
  console.log('🚨 Emergency RLS Fix for Equipment Table\n');
  
  try {
    // Check current state
    const { count: beforeCount } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Current equipment count (service key): ${beforeCount}`);
    
    // Test anon access
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAnon = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    const { count: anonBefore, error: anonError } = await supabaseAnon
      .from('equipment')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Current equipment count (anonymous): ${anonBefore || 0}`);
    
    if (anonError) {
      console.log('Anonymous access error:', anonError.message);
    }
    
    if (anonBefore === 0 || anonError) {
      console.log('\n❌ CONFIRMED: RLS is blocking public access to equipment table');
      console.log('\n📋 Please run the following SQL in your Supabase SQL Editor:');
      console.log('   (Dashboard > SQL Editor > New Query)\n');
      
      const sqlFix = `-- Fix Equipment Table RLS
-- This will make the equipment table publicly readable

-- Enable RLS (if not already enabled)
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- Drop any existing SELECT policies that might be blocking
DROP POLICY IF EXISTS "Equipment is viewable by everyone" ON equipment;
DROP POLICY IF EXISTS "Public read access" ON equipment;
DROP POLICY IF EXISTS "Enable read access for all users" ON equipment;
DROP POLICY IF EXISTS "equipment_select_policy" ON equipment;

-- Create a simple public read policy
CREATE POLICY "Equipment is viewable by everyone" 
ON equipment 
FOR SELECT 
USING (true);

-- Verify the policy was created
SELECT tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE tablename = 'equipment';`;
      
      console.log(sqlFix);
      
      console.log('\n📍 Direct link to SQL editor:');
      const projectRef = process.env.VITE_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
      console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
      
      console.log('\n After running the SQL, refresh the page to see your equipment!');
    } else {
      console.log('\n✅ Equipment table is already publicly accessible!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

emergencyFixRLS().catch(console.error);