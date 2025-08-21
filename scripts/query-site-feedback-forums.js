import { supabase } from './supabase-admin.js';

async function querySiteFeedbackForums() {
  try {
    console.log('Finding site-feedback category ID...\n');
    
    // First, find the site-feedback category ID
    const { data: categories, error: categoriesError } = await supabase
      .from('forum_categories')
      .select('id, name, slug')
      .eq('slug', 'site-feedback');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return;
    }

    if (!categories || categories.length === 0) {
      console.log('No site-feedback category found.');
      return;
    }

    const siteFeedbackCategoryId = categories[0].id;
    console.log(`Found site-feedback category: ${categories[0].name} (${siteFeedbackCategoryId})\n`);
    
    console.log('Querying forum_threads table for site-feedback category...\n');
    
    // Now get all non-locked threads in site-feedback category
    const { data: threads, error: threadsError } = await supabase
      .from('forum_threads')
      .select(`
        id,
        title,
        category_id,
        is_locked,
        created_at,
        user_id,
        views,
        tee_count,
        updated_at
      `)
      .eq('category_id', siteFeedbackCategoryId)
      .or('is_locked.is.null,is_locked.eq.false')
      .order('created_at', { ascending: false });

    if (threadsError) {
      console.error('Error fetching threads:', threadsError);
      return;
    }

    console.log(`Found ${threads?.length || 0} non-locked site-feedback threads:\n`);

    if (!threads || threads.length === 0) {
      console.log('No non-locked site-feedback threads found.');
      return;
    }

    // Get thread IDs for querying posts
    const threadIds = threads.map(thread => thread.id);

    // Now get all posts for these threads
    const { data: posts, error: postsError } = await supabase
      .from('forum_posts')
      .select(`
        id,
        thread_id,
        content,
        created_at,
        user_id,
        is_edited,
        edited_at,
        parent_post_id,
        depth
      `)
      .in('thread_id', threadIds)
      .order('created_at', { ascending: true });

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return;
    }

    console.log(`Found ${posts?.length || 0} posts across these threads:\n`);

    // Get all unique author IDs (using user_id from both tables)
    const authorIds = new Set();
    threads.forEach(thread => {
      if (thread.user_id) authorIds.add(thread.user_id);
    });
    if (posts) {
      posts.forEach(post => {
        if (post.user_id) authorIds.add(post.user_id);
      });
    }

    // Get author information
    let authorMap = new Map();
    if (authorIds.size > 0) {
      const { data: authors, error: authorsError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', Array.from(authorIds));

      if (!authorsError && authors) {
        authors.forEach(author => {
          authorMap.set(author.id, author.display_name);
        });
      }
    }

    // Organize posts by thread
    const threadMap = new Map();
    threads.forEach(thread => {
      threadMap.set(thread.id, {
        ...thread,
        author_name: authorMap.get(thread.user_id) || 'Unknown',
        posts: []
      });
    });

    if (posts) {
      posts.forEach(post => {
        if (threadMap.has(post.thread_id)) {
          threadMap.get(post.thread_id).posts.push({
            ...post,
            author_name: authorMap.get(post.user_id) || 'Unknown'
          });
        }
      });
    }

    // Display the results
    console.log('='.repeat(80));
    console.log('SITE FEEDBACK FORUM DATA');
    console.log('='.repeat(80));

    threadMap.forEach(thread => {
      console.log('\n' + '─'.repeat(60));
      console.log(`THREAD: ${thread.title}`);
      console.log(`ID: ${thread.id}`);
      console.log(`Author: ${thread.author_name}`);
      console.log(`Created: ${new Date(thread.created_at).toLocaleString()}`);
      console.log(`Updated: ${new Date(thread.updated_at).toLocaleString()}`);
      console.log(`Views: ${thread.views}`);
      console.log(`Tees: ${thread.tee_count}`);
      console.log(`Locked: ${thread.is_locked || false}`);
      console.log(`Posts: ${thread.posts.length}`);
      console.log('─'.repeat(60));

      if (thread.posts.length > 0) {
        thread.posts.forEach((post, index) => {
          console.log(`\nPost ${index + 1} (Depth: ${post.depth}):`);
          console.log(`  Author: ${post.author_name}`);
          console.log(`  Date: ${new Date(post.created_at).toLocaleString()}`);
          if (post.is_edited && post.edited_at) {
            console.log(`  Edited: ${new Date(post.edited_at).toLocaleString()}`);
          }
          if (post.parent_post_id) {
            console.log(`  Reply to post: ${post.parent_post_id}`);
          }
          console.log(`  Content: ${post.content}`);
          console.log('  ' + '·'.repeat(40));
        });
      } else {
        console.log('\n  No posts found for this thread.');
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`SUMMARY: ${threads.length} threads, ${posts?.length || 0} total posts`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error querying forum data:', error);
  }
}

// Run the query
querySiteFeedbackForums();