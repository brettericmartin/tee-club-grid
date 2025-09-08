import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;  // Use anon key to test as client would
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create both clients to test
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testForumQueries() {
  try {
    console.log('🔍 Testing Forum Queries\n');
    console.log('='.repeat(50));
    
    // Test with admin client first
    console.log('\n📊 Testing with Admin Client (bypasses RLS):');
    console.log('-'.repeat(40));
    
    const { data: adminThreads, error: adminError } = await supabaseAdmin
      .from('forum_threads')
      .select(`
        *,
        category:forum_categories(id, name, slug, icon),
        user:profiles(id, username, display_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (adminError) {
      console.error('❌ Admin query error:', adminError);
    } else {
      console.log(`✅ Admin found ${adminThreads?.length || 0} threads`);
      if (adminThreads && adminThreads.length > 0) {
        adminThreads.forEach(t => {
          console.log(`   - "${t.title}" by ${t.user?.username || 'unknown'}`);
        });
      }
    }
    
    // Test with anon client (uses RLS)
    console.log('\n📊 Testing with Anon Client (uses RLS):');
    console.log('-'.repeat(40));
    
    const { data: anonThreads, error: anonError } = await supabaseAnon
      .from('forum_threads')
      .select(`
        *,
        category:forum_categories(id, name, slug, icon),
        user:profiles(id, username, display_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (anonError) {
      console.error('❌ Anon query error:', anonError);
    } else {
      console.log(`✅ Anon found ${anonThreads?.length || 0} threads`);
      if (anonThreads && anonThreads.length > 0) {
        anonThreads.forEach(t => {
          console.log(`   - "${t.title}" by ${t.user?.username || 'unknown'}`);
        });
      }
    }
    
    // Check RLS policies
    console.log('\n🔒 Checking RLS Policies:');
    console.log('-'.repeat(40));
    
    // Check if RLS is enabled
    const { data: tableInfo } = await supabaseAdmin
      .from('information_schema.tables')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', 'forum_threads')
      .single();
    
    console.log('Table exists:', !!tableInfo);
    
    // Try a simple count query with both clients
    const { count: adminCount } = await supabaseAdmin
      .from('forum_threads')
      .select('*', { count: 'exact', head: true });
    
    const { count: anonCount } = await supabaseAnon
      .from('forum_threads')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\nAdmin can see: ${adminCount || 0} threads`);
    console.log(`Anon can see: ${anonCount || 0} threads`);
    
    if (adminCount > 0 && anonCount === 0) {
      console.log('\n⚠️  RLS is blocking anonymous access to forum threads!');
      console.log('   The forum will appear empty to users.');
      console.log('\n   Suggested fix: Update RLS policy to allow public read access:');
      console.log(`
CREATE POLICY "Forum threads are viewable by everyone" 
ON forum_threads FOR SELECT 
USING (true);
      `);
    }
    
    // Test the exact query used in ThreadList component
    console.log('\n📊 Testing ThreadList Component Query:');
    console.log('-'.repeat(40));
    
    const { data: componentData, error: componentError, count } = await supabaseAnon
      .from('forum_threads')
      .select(`
        *,
        category:forum_categories(id, name, slug, icon),
        user:profiles(id, username, display_name, avatar_url)
      `, { count: 'exact' })
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })
      .range(0, 19);
    
    if (componentError) {
      console.error('❌ Component query error:', componentError);
    } else {
      console.log(`✅ Component query found ${componentData?.length || 0} threads (total: ${count || 0})`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Summary:');
    if (adminCount > 0 && anonCount === 0) {
      console.log('❌ Forum threads exist but are not visible due to RLS policies');
      console.log('   Users cannot see forum posts without proper RLS configuration');
    } else if (adminCount === 0) {
      console.log('❌ No forum threads exist in the database');
    } else if (anonCount > 0) {
      console.log('✅ Forum threads are accessible to users');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testForumQueries();