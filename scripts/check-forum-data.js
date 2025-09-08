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

async function checkForumData() {
  try {
    console.log('🔍 Checking Forum Data\n');
    console.log('='.repeat(50));
    
    // Check forum categories
    console.log('\n📂 Forum Categories:');
    const { data: categories, error: catError } = await supabase
      .from('forum_categories')
      .select('*')
      .order('sort_order');
    
    if (catError) {
      console.error('Error fetching categories:', catError);
    } else {
      console.log(`Found ${categories?.length || 0} categories`);
      categories?.forEach(cat => {
        console.log(`  - ${cat.icon} ${cat.name} (${cat.slug})`);
      });
    }
    
    // Check forum threads
    console.log('\n📝 Forum Threads:');
    const { data: threads, error: threadError, count: threadCount } = await supabase
      .from('forum_threads')
      .select(`
        *,
        category:forum_categories(name, icon),
        user:profiles(username)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (threadError) {
      console.error('Error fetching threads:', threadError);
    } else {
      console.log(`Total threads in database: ${threadCount || 0}`);
      
      if (threads && threads.length > 0) {
        console.log('\nRecent threads:');
        threads.forEach(thread => {
          console.log(`  - "${thread.title}"`);
          console.log(`    Category: ${thread.category?.icon} ${thread.category?.name}`);
          console.log(`    Author: ${thread.user?.username}`);
          console.log(`    Created: ${new Date(thread.created_at).toLocaleDateString()}`);
          console.log(`    Views: ${thread.views}, Pinned: ${thread.is_pinned}`);
          console.log('');
        });
      } else {
        console.log('  ❌ No threads found in database');
      }
    }
    
    // Check forum posts
    console.log('\n💬 Forum Posts:');
    const { count: postCount } = await supabase
      .from('forum_posts')
      .select('*', { count: 'exact' });
    
    console.log(`Total posts in database: ${postCount || 0}`);
    
    // Check if there are any recent posts
    const { data: recentPosts } = await supabase
      .from('forum_posts')
      .select(`
        *,
        thread:forum_threads(title),
        user:profiles(username)
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentPosts && recentPosts.length > 0) {
      console.log('\nRecent posts:');
      recentPosts.forEach(post => {
        console.log(`  - Thread: "${post.thread?.title}"`);
        console.log(`    By: ${post.user?.username}`);
        console.log(`    Content: ${post.content.substring(0, 100)}...`);
        console.log('');
      });
    }
    
    // Check for any errors in the data structure
    console.log('\n🔍 Data Integrity Check:');
    
    // Check for threads without categories
    const { data: orphanThreads } = await supabase
      .from('forum_threads')
      .select('id, title')
      .is('category_id', null);
    
    if (orphanThreads && orphanThreads.length > 0) {
      console.log(`  ⚠️  Found ${orphanThreads.length} threads without categories`);
    } else {
      console.log('  ✅ All threads have categories');
    }
    
    // Check for posts without threads
    const { data: orphanPosts } = await supabase
      .from('forum_posts')
      .select('id')
      .is('thread_id', null);
    
    if (orphanPosts && orphanPosts.length > 0) {
      console.log(`  ⚠️  Found ${orphanPosts.length} posts without threads`);
    } else {
      console.log('  ✅ All posts belong to threads');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`  Categories: ${categories?.length || 0}`);
    console.log(`  Threads: ${threadCount || 0}`);
    console.log(`  Posts: ${postCount || 0}`);
    
    if (!threadCount || threadCount === 0) {
      console.log('\n⚠️  No forum threads found! The forum will appear empty.');
      console.log('  Consider creating some sample threads or checking RLS policies.');
    } else {
      console.log('\n✅ Forum data exists in the database');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkForumData();