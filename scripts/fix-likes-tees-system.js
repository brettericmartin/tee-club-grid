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

async function fixLikesTeesSystem() {
  console.log('🔧 Starting likes/tees system fix...\n');

  try {
    // Step 1: Enable RLS on feed_likes
    console.log('1. Enabling RLS on feed_likes table...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;'
    });
    console.log('✅ RLS enabled\n');

    // Step 2: Drop existing policies
    console.log('2. Dropping existing policies...');
    const dropPolicies = [
      'DROP POLICY IF EXISTS "Users can view all likes" ON public.feed_likes;',
      'DROP POLICY IF EXISTS "Users can like posts" ON public.feed_likes;',
      'DROP POLICY IF EXISTS "Users can unlike posts" ON public.feed_likes;',
      'DROP POLICY IF EXISTS "Anyone can view feed likes" ON public.feed_likes;',
      'DROP POLICY IF EXISTS "Authenticated users can add likes" ON public.feed_likes;',
      'DROP POLICY IF EXISTS "Users can remove their likes" ON public.feed_likes;'
    ];

    for (const policy of dropPolicies) {
      await supabase.rpc('exec_sql', { sql: policy });
    }
    console.log('✅ Old policies dropped\n');

    // Step 3: Create new working policies
    console.log('3. Creating new RLS policies...');
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Anyone can view likes" 
            ON public.feed_likes 
            FOR SELECT 
            USING (true);`
    });
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Authenticated can like" 
            ON public.feed_likes 
            FOR INSERT 
            TO authenticated 
            WITH CHECK (auth.uid() = user_id);`
    });
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Users can unlike" 
            ON public.feed_likes 
            FOR DELETE 
            TO authenticated 
            USING (auth.uid() = user_id);`
    });
    console.log('✅ New policies created\n');

    // Step 4: Update likes_count to match actual
    console.log('4. Syncing likes_count with actual likes...');
    await supabase.rpc('exec_sql', {
      sql: `UPDATE feed_posts 
            SET likes_count = (
              SELECT COUNT(*) 
              FROM feed_likes 
              WHERE feed_likes.post_id = feed_posts.id
            );`
    });
    console.log('✅ Likes count synchronized\n');

    // Step 5: Create trigger function
    console.log('5. Creating trigger function...');
    await supabase.rpc('exec_sql', {
      sql: `CREATE OR REPLACE FUNCTION update_post_likes_count()
            RETURNS TRIGGER AS $$
            BEGIN
              IF TG_OP = 'INSERT' THEN
                UPDATE feed_posts 
                SET likes_count = likes_count + 1
                WHERE id = NEW.post_id;
              ELSIF TG_OP = 'DELETE' THEN
                UPDATE feed_posts 
                SET likes_count = GREATEST(likes_count - 1, 0)
                WHERE id = OLD.post_id;
              END IF;
              RETURN NULL;
            END;
            $$ LANGUAGE plpgsql;`
    });
    console.log('✅ Trigger function created\n');

    // Step 6: Create trigger
    console.log('6. Creating trigger...');
    await supabase.rpc('exec_sql', {
      sql: 'DROP TRIGGER IF EXISTS update_post_likes_trigger ON public.feed_likes;'
    });
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE TRIGGER update_post_likes_trigger
            AFTER INSERT OR DELETE ON public.feed_likes
            FOR EACH ROW
            EXECUTE FUNCTION update_post_likes_count();`
    });
    console.log('✅ Trigger created\n');

    console.log('🎉 Likes/tees system fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing likes/tees system:', error);
    process.exit(1);
  }
}

async function createBagTeesTable() {
  console.log('\n🔧 Creating bag_tees table...\n');

  try {
    // Create bag_tees table
    console.log('1. Creating bag_tees table...');
    await supabase.rpc('exec_sql', {
      sql: `CREATE TABLE IF NOT EXISTS public.bag_tees (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
              bag_id UUID REFERENCES public.user_bags(id) ON DELETE CASCADE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              UNIQUE(user_id, bag_id)
            );`
    });
    console.log('✅ bag_tees table created\n');

    // Enable RLS
    console.log('2. Enabling RLS on bag_tees...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.bag_tees ENABLE ROW LEVEL SECURITY;'
    });
    console.log('✅ RLS enabled\n');

    // Create RLS policies
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
    console.log('✅ bag_tees policies created\n');

  } catch (error) {
    console.error('❌ Error creating bag_tees table:', error);
    process.exit(1);
  }
}

async function createEquipmentTeesTable() {
  console.log('\n🔧 Creating equipment_tees table...\n');

  try {
    // Create equipment_tees table
    console.log('1. Creating equipment_tees table...');
    await supabase.rpc('exec_sql', {
      sql: `CREATE TABLE IF NOT EXISTS public.equipment_tees (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
              equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              UNIQUE(user_id, equipment_id)
            );`
    });
    console.log('✅ equipment_tees table created\n');

    // Enable RLS
    console.log('2. Enabling RLS on equipment_tees...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.equipment_tees ENABLE ROW LEVEL SECURITY;'
    });
    console.log('✅ RLS enabled\n');

    // Create RLS policies
    console.log('3. Creating RLS policies for equipment_tees...');
    
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
    console.log('✅ equipment_tees policies created\n');

  } catch (error) {
    console.error('❌ Error creating equipment_tees table:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('🏌️ Teed.club - Fixing Likes/Tees System\n');
  
  await fixLikesTeesSystem();
  await createBagTeesTable();
  await createEquipmentTeesTable();
  
  console.log('\n🎉 All fixes completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Test the likes functionality in the feed');
  console.log('2. Implement tees for bags and equipment');
  console.log('3. Update UI to use "tees" terminology');
}

main().catch(console.error);