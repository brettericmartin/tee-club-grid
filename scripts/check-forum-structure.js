import { supabase } from './supabase-admin.js';

async function checkForumStructure() {
  try {
    console.log('Checking forum_threads table structure...\n');
    
    // Get a few sample records to understand the structure
    const { data: threads, error: threadsError } = await supabase
      .from('forum_threads')
      .select('*')
      .limit(5);

    if (threadsError) {
      console.error('Error fetching forum_threads:', threadsError);
    } else {
      console.log('Sample forum_threads records:');
      console.log(JSON.stringify(threads, null, 2));
    }

    console.log('\n' + '─'.repeat(60) + '\n');

    console.log('Checking forum_posts table structure...\n');
    
    // Get a few sample records to understand the structure
    const { data: posts, error: postsError } = await supabase
      .from('forum_posts')
      .select('*')
      .limit(5);

    if (postsError) {
      console.error('Error fetching forum_posts:', postsError);
    } else {
      console.log('Sample forum_posts records:');
      console.log(JSON.stringify(posts, null, 2));
    }

    console.log('\n' + '─'.repeat(60) + '\n');

    // Check if there's a forum_categories table
    console.log('Checking forum_categories table...\n');
    
    const { data: categories, error: categoriesError } = await supabase
      .from('forum_categories')
      .select('*');

    if (categoriesError) {
      console.error('Error fetching forum_categories:', categoriesError);
    } else {
      console.log('Forum categories:');
      console.log(JSON.stringify(categories, null, 2));
    }

  } catch (error) {
    console.error('Error checking forum structure:', error);
  }
}

// Run the check
checkForumStructure();