import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create two clients - one with anon key (as app uses) and one with service key
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

async function debugDataAccess() {
  console.log('🔍 DEBUGGING DATA ACCESS ISSUES\n');
  console.log('=' . repeat(50));
  
  // Test with anon key (what the app uses)
  console.log('\n📊 Testing with ANON KEY (as app sees it):');
  
  const tables = [
    'profiles',
    'equipment', 
    'user_bags',
    'bag_equipment',
    'equipment_photos',
    'feed_posts',
    'feed_likes',
    'user_follows'
  ];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabaseAnon
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`  ❌ ${table}: BLOCKED - ${error.message}`);
      } else {
        console.log(`  ✅ ${table}: Accessible (${count} records)`);
      }
    } catch (err) {
      console.log(`  ❌ ${table}: ERROR - ${err.message}`);
    }
  }
  
  // Test with service key (bypasses RLS)
  console.log('\n📊 Testing with SERVICE KEY (bypasses RLS):');
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabaseService
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`  ❌ ${table}: ERROR - ${error.message}`);
      } else {
        console.log(`  ✅ ${table}: ${count} records exist`);
      }
    } catch (err) {
      console.log(`  ❌ ${table}: ERROR - ${err.message}`);
    }
  }
  
  // Check specific critical queries
  console.log('\n📊 Testing Critical App Queries:');
  
  // Test feed query
  try {
    const { data: feedPosts, error: feedError } = await supabaseAnon
      .from('feed_posts')
      .select(`
        *,
        profile:profiles!feed_posts_user_id_fkey(
          username,
          display_name,
          avatar_url
        )
      `)
      .limit(5);
    
    if (feedError) {
      console.log(`  ❌ Feed query: ${feedError.message}`);
    } else {
      console.log(`  ✅ Feed query: ${feedPosts?.length || 0} posts loaded`);
    }
  } catch (err) {
    console.log(`  ❌ Feed query: ${err.message}`);
  }
  
  // Test equipment query
  try {
    const { data: equipment, error: equipError } = await supabaseAnon
      .from('equipment')
      .select('*')
      .limit(5);
    
    if (equipError) {
      console.log(`  ❌ Equipment query: ${equipError.message}`);
    } else {
      console.log(`  ✅ Equipment query: ${equipment?.length || 0} items loaded`);
    }
  } catch (err) {
    console.log(`  ❌ Equipment query: ${err.message}`);
  }
  
  // Test user bags query (requires auth)
  try {
    // Try to get current user
    const { data: { user } } = await supabaseAnon.auth.getUser();
    
    if (user) {
      console.log(`\n  👤 Authenticated as: ${user.email}`);
      
      const { data: bags, error: bagError } = await supabaseAnon
        .from('user_bags')
        .select('*')
        .eq('user_id', user.id);
      
      if (bagError) {
        console.log(`  ❌ User bags query: ${bagError.message}`);
      } else {
        console.log(`  ✅ User bags query: ${bags?.length || 0} bags found`);
      }
    } else {
      console.log(`\n  ⚠️  No authenticated user - some queries will fail`);
    }
  } catch (err) {
    console.log(`  ❌ Auth check: ${err.message}`);
  }
  
  console.log('\n' + '=' . repeat(50));
  console.log('\n📌 DIAGNOSIS:\n');
  
  console.log('If tables are BLOCKED with anon key but have data with service key,');
  console.log('then RLS policies are preventing access.\n');
  console.log('Apply the RLS fixes in Supabase Dashboard:\n');
  console.log('  1. Go to Supabase Dashboard > SQL Editor');
  console.log('  2. Run the SQL from /sql/apply-rls-fixes.sql');
  console.log('  3. Verify policies are created');
  console.log('  4. Refresh the app\n');
}

debugDataAccess().catch(console.error);