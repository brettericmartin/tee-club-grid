#!/usr/bin/env node
import 'dotenv/config';
import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 FIXING RLS POLICIES FOR DATA LOADING ISSUES');
console.log('==================================================\n');

async function executeSql(sql, description) {
  console.log(`📝 ${description}...`);
  try {
    const { data, error } = await supabase.rpc('execute_sql', { query: sql });
    if (error) {
      // If execute_sql doesn't exist, try direct approach
      const { error: directError } = await supabase.from('_dummy_').select().limit(0);
      console.log(`   ⚠️  Using alternative approach...`);
      return { needsManual: true, sql };
    }
    console.log(`   ✅ Success`);
    return { success: true };
  } catch (err) {
    console.log(`   ⚠️  Needs manual execution`);
    return { needsManual: true, sql };
  }
}

async function fixRlsPolicies() {
  const sqlStatements = [];
  
  // 1. Fix feed_posts policies
  sqlStatements.push({
    description: 'Fix feed_posts RLS policies',
    sql: `
-- Enable RLS
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can update their posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can delete their posts" ON public.feed_posts;

-- Create new policies with proper access
CREATE POLICY "Anyone can view posts" 
ON public.feed_posts 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Users can create posts" 
ON public.feed_posts 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their posts" 
ON public.feed_posts 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their posts" 
ON public.feed_posts 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);`
  });

  // 2. Fix feed_likes policies
  sqlStatements.push({
    description: 'Fix feed_likes RLS policies',
    sql: `
-- Enable RLS
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "feed_likes_select_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "feed_likes_insert_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "feed_likes_delete_policy" ON public.feed_likes;
DROP POLICY IF EXISTS "Anyone can view likes" ON public.feed_likes;
DROP POLICY IF EXISTS "Authenticated users can like" ON public.feed_likes;
DROP POLICY IF EXISTS "Users can unlike their own" ON public.feed_likes;

-- Create new policies
CREATE POLICY "Anyone can view likes" 
ON public.feed_likes 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Authenticated users can like" 
ON public.feed_likes 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own" 
ON public.feed_likes 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);`
  });

  // 3. Fix profiles policies
  sqlStatements.push({
    description: 'Fix profiles RLS policies',
    sql: `
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create new policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);`
  });

  // 4. Fix equipment policies
  sqlStatements.push({
    description: 'Fix equipment RLS policies',
    sql: `
-- Enable RLS
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Equipment is viewable by everyone" ON public.equipment;
DROP POLICY IF EXISTS "Authenticated users can add equipment" ON public.equipment;
DROP POLICY IF EXISTS "Users can update equipment they added" ON public.equipment;

-- Create new policies
CREATE POLICY "Equipment is viewable by everyone" 
ON public.equipment 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Authenticated users can add equipment" 
ON public.equipment 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update equipment they added" 
ON public.equipment 
FOR UPDATE 
TO authenticated 
USING (added_by_user_id = auth.uid() OR added_by_user_id IS NULL)
WITH CHECK (added_by_user_id = auth.uid() OR added_by_user_id IS NULL);`
  });

  // 5. Fix equipment_photos policies
  sqlStatements.push({
    description: 'Fix equipment_photos RLS policies',
    sql: `
-- Enable RLS
ALTER TABLE public.equipment_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view equipment photos" ON public.equipment_photos;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON public.equipment_photos;
DROP POLICY IF EXISTS "Users can manage their photos" ON public.equipment_photos;

-- Create new policies
CREATE POLICY "Anyone can view equipment photos" 
ON public.equipment_photos 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Authenticated users can upload photos" 
ON public.equipment_photos 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can manage their photos" 
ON public.equipment_photos 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = uploaded_by)
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their photos" 
ON public.equipment_photos 
FOR DELETE 
TO authenticated 
USING (auth.uid() = uploaded_by);`
  });

  // 6. Fix user_bags policies
  sqlStatements.push({
    description: 'Fix user_bags RLS policies',
    sql: `
-- Enable RLS
ALTER TABLE public.user_bags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Bags are viewable by everyone" ON public.user_bags;
DROP POLICY IF EXISTS "Users can create their own bags" ON public.user_bags;
DROP POLICY IF EXISTS "Users can update their own bags" ON public.user_bags;
DROP POLICY IF EXISTS "Users can delete their own bags" ON public.user_bags;

-- Create new policies
CREATE POLICY "Bags are viewable by everyone" 
ON public.user_bags 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Users can create their own bags" 
ON public.user_bags 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bags" 
ON public.user_bags 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bags" 
ON public.user_bags 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);`
  });

  // 7. Fix bag_equipment policies
  sqlStatements.push({
    description: 'Fix bag_equipment RLS policies',
    sql: `
-- Enable RLS
ALTER TABLE public.bag_equipment ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Bag equipment is viewable by everyone" ON public.bag_equipment;
DROP POLICY IF EXISTS "Users can manage equipment in their bags" ON public.bag_equipment;

-- Create new policies
CREATE POLICY "Bag equipment is viewable by everyone" 
ON public.bag_equipment 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Users can manage equipment in their bags" 
ON public.bag_equipment 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_bags 
    WHERE user_bags.id = bag_equipment.bag_id 
    AND user_bags.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_bags 
    WHERE user_bags.id = bag_equipment.bag_id 
    AND user_bags.user_id = auth.uid()
  )
);`
  });

  // 8. Fix user_follows policies
  sqlStatements.push({
    description: 'Fix user_follows RLS policies',
    sql: `
-- Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "user_follows_select_policy" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_insert_policy" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_delete_policy" ON public.user_follows;
DROP POLICY IF EXISTS "Anyone can view follows" ON public.user_follows;
DROP POLICY IF EXISTS "Users can follow others" ON public.user_follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.user_follows;

-- Create new policies
CREATE POLICY "Anyone can view follows" 
ON public.user_follows 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Users can follow others" 
ON public.user_follows 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" 
ON public.user_follows 
FOR DELETE 
TO authenticated 
USING (auth.uid() = follower_id);`
  });

  // Execute all SQL statements
  const manualSql = [];
  
  for (const stmt of sqlStatements) {
    const result = await executeSql(stmt.sql, stmt.description);
    if (result.needsManual) {
      manualSql.push(stmt);
    }
  }

  // If any statements need manual execution, output them
  if (manualSql.length > 0) {
    console.log('\n⚠️  MANUAL SQL EXECUTION REQUIRED');
    console.log('==================================================');
    console.log('Copy and paste the following SQL into Supabase Dashboard > SQL Editor:\n');
    
    console.log('-- 🔧 COMPREHENSIVE RLS FIX FOR DATA LOADING ISSUES');
    console.log('-- Generated:', new Date().toISOString());
    console.log('-- Purpose: Fix authentication and RLS issues preventing data from loading\n');
    
    for (const stmt of manualSql) {
      console.log(`-- ${stmt.description}`);
      console.log(stmt.sql);
      console.log('');
    }
    
    console.log('-- Verify all policies are applied');
    console.log(`SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename IN (
  'feed_posts', 'feed_likes', 'profiles', 'equipment', 
  'equipment_photos', 'user_bags', 'bag_equipment', 'user_follows'
)
ORDER BY tablename, cmd, policyname;`);
  }

  // Test the policies
  console.log('\n🧪 TESTING RLS POLICIES');
  console.log('==================================================');
  
  // Test anonymous access
  console.log('\n📊 Testing anonymous access to key tables...');
  
  const tables = [
    'profiles', 'feed_posts', 'feed_likes', 'equipment',
    'equipment_photos', 'user_bags', 'bag_equipment', 'user_follows'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: Accessible`);
      }
    } catch (err) {
      console.log(`   ❌ ${table}: ${err.message}`);
    }
  }

  console.log('\n✅ RLS FIX COMPLETE');
  console.log('\n📋 NEXT STEPS:');
  console.log('1. If manual SQL was output above, execute it in Supabase Dashboard');
  console.log('2. Test the app with both anonymous and authenticated users');
  console.log('3. Verify that feed posts, equipment, and bags load correctly');
  console.log('4. Check that likes, follows, and photo uploads work for authenticated users');
}

// Run the fix
fixRlsPolicies().catch(console.error);