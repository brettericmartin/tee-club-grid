#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTeeTables() {
  console.log('🔧 Creating tees tables...\n');

  try {
    // Create bag_tees table
    console.log('1. Creating bag_tees table...');
    const { data: bagCreate, error: bagCreateError } = await supabase.rpc('exec_sql', {
      sql: `CREATE TABLE IF NOT EXISTS public.bag_tees (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
              bag_id UUID REFERENCES public.user_bags(id) ON DELETE CASCADE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              UNIQUE(user_id, bag_id)
            );`
    });
    
    if (bagCreateError) {
      console.error('Error creating bag_tees:', bagCreateError);
    } else {
      console.log('✅ bag_tees table created');
    }

    // Enable RLS on bag_tees
    console.log('2. Enabling RLS on bag_tees...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.bag_tees ENABLE ROW LEVEL SECURITY;'
    });
    console.log('✅ RLS enabled on bag_tees');

    // Create RLS policies for bag_tees
    console.log('3. Creating RLS policies for bag_tees...');
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Anyone can view bag tees" 
            ON public.bag_tees 
            FOR SELECT 
            USING (true);`
    });
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Authenticated can tee bags" 
            ON public.bag_tees 
            FOR INSERT 
            TO authenticated 
            WITH CHECK (auth.uid() = user_id);`
    });
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Users can untee bags" 
            ON public.bag_tees 
            FOR DELETE 
            TO authenticated 
            USING (auth.uid() = user_id);`
    });
    console.log('✅ bag_tees policies created');

    // Create equipment_tees table
    console.log('\n4. Creating equipment_tees table...');
    await supabase.rpc('exec_sql', {
      sql: `CREATE TABLE IF NOT EXISTS public.equipment_tees (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
              equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              UNIQUE(user_id, equipment_id)
            );`
    });
    console.log('✅ equipment_tees table created');

    // Enable RLS on equipment_tees
    console.log('5. Enabling RLS on equipment_tees...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.equipment_tees ENABLE ROW LEVEL SECURITY;'
    });
    console.log('✅ RLS enabled on equipment_tees');

    // Create RLS policies for equipment_tees
    console.log('6. Creating RLS policies for equipment_tees...');
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Anyone can view equipment tees" 
            ON public.equipment_tees 
            FOR SELECT 
            USING (true);`
    });
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Authenticated can tee equipment" 
            ON public.equipment_tees 
            FOR INSERT 
            TO authenticated 
            WITH CHECK (auth.uid() = user_id);`
    });
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Users can untee equipment" 
            ON public.equipment_tees 
            FOR DELETE 
            TO authenticated 
            USING (auth.uid() = user_id);`
    });
    console.log('✅ equipment_tees policies created');

    console.log('\n🎉 Tees tables created successfully!');

    // Verify tables exist
    console.log('\n🔍 Verifying tables...');
    
    const { data: bagTest, error: bagTestError } = await supabase
      .from('bag_tees')
      .select('*')
      .limit(0);
    
    if (!bagTestError) {
      console.log('✅ bag_tees table verified');
    } else {
      console.log('❌ bag_tees verification failed:', bagTestError.message);
    }

    const { data: equipTest, error: equipTestError } = await supabase
      .from('equipment_tees')
      .select('*')
      .limit(0);
    
    if (!equipTestError) {
      console.log('✅ equipment_tees table verified');
    } else {
      console.log('❌ equipment_tees verification failed:', equipTestError.message);
    }

  } catch (error) {
    console.error('❌ Error creating tees tables:', error);
  }
}

createTeeTables();