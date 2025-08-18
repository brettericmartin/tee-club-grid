import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service key in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixCriticalRLSPolicies() {
  console.log('🔧 Fixing critical RLS policies...\n');

  const fixes = [
    {
      name: 'Enable RLS on critical tables',
      sql: `
        ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.equipment_photos ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;
      `
    },
    {
      name: 'Fix feed_likes policies',
      sql: `
        -- Drop existing policies
        DROP POLICY IF EXISTS "feed_likes_select_policy" ON public.feed_likes;
        DROP POLICY IF EXISTS "feed_likes_insert_policy" ON public.feed_likes;
        DROP POLICY IF EXISTS "feed_likes_delete_policy" ON public.feed_likes;
        DROP POLICY IF EXISTS "Users can select feed likes" ON public.feed_likes;
        DROP POLICY IF EXISTS "Users can insert their own feed likes" ON public.feed_likes;
        DROP POLICY IF EXISTS "Users can delete their own feed likes" ON public.feed_likes;

        -- Create new policies
        CREATE POLICY "feed_likes_select_policy" 
        ON public.feed_likes 
        FOR SELECT 
        TO authenticated, anon 
        USING (true);

        CREATE POLICY "feed_likes_insert_policy" 
        ON public.feed_likes 
        FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "feed_likes_delete_policy" 
        ON public.feed_likes 
        FOR DELETE 
        TO authenticated 
        USING (auth.uid() = user_id);
      `
    },
    {
      name: 'Fix user_follows policies',
      sql: `
        -- Drop existing policies
        DROP POLICY IF EXISTS "user_follows_select_policy" ON public.user_follows;
        DROP POLICY IF EXISTS "user_follows_insert_policy" ON public.user_follows;
        DROP POLICY IF EXISTS "user_follows_delete_policy" ON public.user_follows;
        DROP POLICY IF EXISTS "Users can select follows" ON public.user_follows;
        DROP POLICY IF EXISTS "Users can insert their own follows" ON public.user_follows;
        DROP POLICY IF EXISTS "Users can delete their own follows" ON public.user_follows;

        -- Create new policies
        CREATE POLICY "user_follows_select_policy" 
        ON public.user_follows 
        FOR SELECT 
        TO authenticated, anon 
        USING (true);

        CREATE POLICY "user_follows_insert_policy" 
        ON public.user_follows 
        FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = follower_id);

        CREATE POLICY "user_follows_delete_policy" 
        ON public.user_follows 
        FOR DELETE 
        TO authenticated 
        USING (auth.uid() = follower_id);
      `
    },
    {
      name: 'Fix forum_reactions policies',
      sql: `
        -- Drop existing policies
        DROP POLICY IF EXISTS "forum_reactions_select_policy" ON public.forum_reactions;
        DROP POLICY IF EXISTS "forum_reactions_insert_policy" ON public.forum_reactions;
        DROP POLICY IF EXISTS "forum_reactions_delete_policy" ON public.forum_reactions;

        -- Create new policies
        CREATE POLICY "forum_reactions_select_policy" 
        ON public.forum_reactions 
        FOR SELECT 
        TO authenticated, anon 
        USING (true);

        CREATE POLICY "forum_reactions_insert_policy" 
        ON public.forum_reactions 
        FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "forum_reactions_delete_policy" 
        ON public.forum_reactions 
        FOR DELETE 
        TO authenticated 
        USING (auth.uid() = user_id);
      `
    }
  ];

  for (const fix of fixes) {
    console.log(`\n📋 ${fix.name}...`);
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: fix.sql });
      
      if (error) {
        // Try executing directly
        const statements = fix.sql.split(';').filter(s => s.trim());
        for (const stmt of statements) {
          if (stmt.trim()) {
            const { error: stmtError } = await supabaseAdmin.from('_dummy_').select().limit(0);
            // This is a workaround - we need to execute via SQL Editor
            console.log(`   ⚠️  Statement needs manual execution: ${stmt.substring(0, 50)}...`);
          }
        }
        console.log(`   ⚠️  Some policies may need manual application in Supabase Dashboard`);
      } else {
        console.log(`   ✅ Applied successfully`);
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
    }
  }

  // Verify the policies
  console.log('\n\n📊 Verifying RLS policies...\n');
  
  const tables = ['feed_likes', 'user_follows', 'forum_reactions'];
  
  for (const table of tables) {
    console.log(`\n${table}:`);
    
    // Check if we can read
    const { data: readData, error: readError } = await supabaseAdmin
      .from(table)
      .select('*')
      .limit(1);
    
    if (readError) {
      console.log(`  ❌ READ: ${readError.message}`);
    } else {
      console.log(`  ✅ READ: Accessible`);
    }
    
    // Get policy info
    const { data: policies } = await supabaseAdmin.rpc('get_policies', {
      table_name: table
    }).catch(() => ({ data: null }));
    
    if (policies && policies.length > 0) {
      console.log(`  📋 Policies found: ${policies.length}`);
      policies.forEach(p => {
        console.log(`     - ${p.policyname} (${p.cmd})`);
      });
    } else {
      console.log(`  ⚠️  No policies found or unable to check`);
    }
  }

  console.log('\n\n✅ RLS policy fix attempt complete!');
  console.log('\n⚠️  IMPORTANT: Some policies may need to be applied manually via Supabase Dashboard > SQL Editor');
  console.log('Copy the SQL from this script and run it there if needed.\n');
}

// Add helper function to check policies
async function getPolicies(tableName) {
  const { data, error } = await supabaseAdmin
    .from('pg_policies')
    .select('*')
    .eq('tablename', tableName);
  
  return data || [];
}

fixCriticalRLSPolicies().catch(console.error);