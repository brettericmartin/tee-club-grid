import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixForumRLS() {
  try {
    console.log('🔧 Fixing Forum RLS Policies\n');
    console.log('='.repeat(50));
    
    // SQL to fix RLS policies for forum tables
    const policies = [
      {
        name: 'Forum threads - public read',
        sql: `
          -- Drop existing policy if it exists
          DROP POLICY IF EXISTS "Forum threads are viewable by everyone" ON forum_threads;
          
          -- Create new policy for public read access
          CREATE POLICY "Forum threads are viewable by everyone" 
          ON forum_threads FOR SELECT 
          USING (true);
        `
      },
      {
        name: 'Forum threads - authenticated create',
        sql: `
          -- Drop existing policy if it exists
          DROP POLICY IF EXISTS "Authenticated users can create threads" ON forum_threads;
          
          -- Create policy for authenticated users to create threads
          CREATE POLICY "Authenticated users can create threads" 
          ON forum_threads FOR INSERT 
          WITH CHECK (auth.uid() IS NOT NULL);
        `
      },
      {
        name: 'Forum threads - owner update',
        sql: `
          -- Drop existing policy if it exists
          DROP POLICY IF EXISTS "Users can update their own threads" ON forum_threads;
          
          -- Create policy for users to update their own threads
          CREATE POLICY "Users can update their own threads" 
          ON forum_threads FOR UPDATE 
          USING (auth.uid() = user_id);
        `
      },
      {
        name: 'Forum posts - public read',
        sql: `
          -- Drop existing policy if it exists
          DROP POLICY IF EXISTS "Forum posts are viewable by everyone" ON forum_posts;
          
          -- Create new policy for public read access
          CREATE POLICY "Forum posts are viewable by everyone" 
          ON forum_posts FOR SELECT 
          USING (true);
        `
      },
      {
        name: 'Forum posts - authenticated create',
        sql: `
          -- Drop existing policy if it exists
          DROP POLICY IF EXISTS "Authenticated users can create posts" ON forum_posts;
          
          -- Create policy for authenticated users to create posts
          CREATE POLICY "Authenticated users can create posts" 
          ON forum_posts FOR INSERT 
          WITH CHECK (auth.uid() IS NOT NULL);
        `
      },
      {
        name: 'Forum categories - public read',
        sql: `
          -- Drop existing policy if it exists
          DROP POLICY IF EXISTS "Forum categories are viewable by everyone" ON forum_categories;
          
          -- Create new policy for public read access
          CREATE POLICY "Forum categories are viewable by everyone" 
          ON forum_categories FOR SELECT 
          USING (true);
        `
      }
    ];
    
    // Apply each policy
    for (const policy of policies) {
      console.log(`\n📝 Applying: ${policy.name}`);
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: policy.sql 
        }).single();
        
        if (error) {
          // If exec_sql doesn't exist, try direct query
          const { error: directError } = await supabase
            .from('_sql')
            .insert({ query: policy.sql })
            .select()
            .single();
          
          if (directError) {
            console.log(`   ⚠️  Could not apply via RPC, manual SQL required`);
            console.log(`   SQL to run manually:\n${policy.sql}`);
          } else {
            console.log(`   ✅ Policy applied successfully`);
          }
        } else {
          console.log(`   ✅ Policy applied successfully`);
        }
      } catch (e) {
        console.log(`   ⚠️  Manual application required`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Verifying Changes:\n');
    
    // Test with anon client to verify
    const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
    
    const { data: threads, count } = await supabaseAnon
      .from('forum_threads')
      .select('*', { count: 'exact', head: true });
    
    const { data: categories } = await supabaseAnon
      .from('forum_categories')
      .select('*');
    
    const { data: posts, count: postCount } = await supabaseAnon
      .from('forum_posts')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✅ Anonymous users can now see:`);
    console.log(`   - ${count || 0} forum threads`);
    console.log(`   - ${categories?.length || 0} forum categories`);
    console.log(`   - ${postCount || 0} forum posts`);
    
    if (count === 0) {
      console.log('\n⚠️  Still showing 0 threads. You may need to run the SQL manually in Supabase dashboard:');
      console.log('\n--- Copy and run this SQL in Supabase SQL Editor ---\n');
      
      // Combine all policies into one SQL script
      const combinedSQL = policies.map(p => p.sql).join('\n\n');
      console.log(combinedSQL);
      console.log('\n--- End of SQL ---');
    } else {
      console.log('\n✅ Forum RLS policies fixed successfully!');
      console.log('   The forum should now display all threads.');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixForumRLS();