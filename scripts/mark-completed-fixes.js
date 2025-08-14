#!/usr/bin/env node

/**
 * Mark already completed fixes in the forum
 * This script marks the issues we've already fixed in batches 1 and 2
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Issues that have been fixed in our deployment
const COMPLETED_FIXES = [
  {
    patterns: ['equipment.*reset', 'selector.*reset', 'input.*reset'],
    description: 'Equipment selector state persistence',
    notes: 'The equipment selector now remembers your search and filter state when closed and reopened.'
  },
  {
    patterns: ['username', 'display.*name'],
    description: 'Forum display names',
    notes: 'Forum now shows display names instead of usernames throughout.'
  },
  {
    patterns: ['reply.*button.*top', 'button.*top.*comment'],
    description: 'Reply button placement',
    notes: 'Added reply button at the top of each post for easier access.'
  },
  {
    patterns: ['scroll.*jump', 'refresh.*jump', 'page.*jump'],
    description: 'Forum scroll position',
    notes: 'Fixed the scroll jump issue when posting comments.'
  },
  {
    patterns: ['edit.*post.*doesn', 'edit.*doesn.*work', 'can.*edit'],
    description: 'Edit post functionality',
    notes: 'Edit post functionality is now working properly.'
  },
  {
    patterns: ['delet.*comment', 'delet.*post', 'remove.*post'],
    description: 'Delete post functionality',
    notes: 'Delete post functionality is now working with confirmation.'
  },
  {
    patterns: ['layout.*doesn', 'reaction.*layout', 'helpful.*hot.*tee'],
    description: 'Reaction button layout',
    notes: 'Improved reaction button layout with unified design.'
  }
];

async function main() {
  console.log('🔧 Marking completed fixes in forum feedback...\n');

  try {
    // Get a user to act as (preferably an admin or the first user)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .limit(1)
      .single();
    
    if (!profiles) {
      console.error('❌ No user found. Please ensure you have at least one user in the database.');
      return;
    }

    const systemUserId = profiles.id;
    console.log(`📤 Using user: ${profiles.display_name || profiles.username}\n`);

    // Get Site Feedback category
    const { data: category } = await supabase
      .from('forum_categories')
      .select('*')
      .eq('slug', 'site-feedback')
      .single();
    
    if (!category) {
      console.error('❌ Site Feedback category not found');
      return;
    }

    // Get all threads in Site Feedback
    const { data: threads } = await supabase
      .from('forum_threads')
      .select('*')
      .eq('category_id', category.id);
    
    if (!threads || threads.length === 0) {
      console.error('❌ No feedback threads found');
      return;
    }

    console.log(`📋 Found ${threads.length} feedback thread(s)\n`);

    let totalMarked = 0;
    let postsToMark = [];

    // Check each thread
    for (const thread of threads) {
      // Get all posts in the thread
      const { data: posts } = await supabase
        .from('forum_posts')
        .select('*, user:profiles(username, display_name)')
        .eq('thread_id', thread.id)
        .order('created_at');

      if (!posts || posts.length === 0) continue;

      console.log(`\n📖 Checking thread: "${thread.title}"`);
      console.log(`   ${posts.length} posts to analyze`);

      // Check each post for fixed issues
      for (const post of posts) {
        const content = post.content.toLowerCase();
        
        for (const fix of COMPLETED_FIXES) {
          // Check if this post matches any of the fix patterns
          const matches = fix.patterns.some(pattern => {
            const regex = new RegExp(pattern, 'i');
            return regex.test(content);
          });

          if (matches) {
            console.log(`\n   ✅ Found fixed issue in post by ${post.user?.display_name || post.user?.username}`);
            console.log(`      Issue: ${fix.description}`);
            console.log(`      Content: "${post.content.substring(0, 60)}..."`);
            
            postsToMark.push({
              postId: post.id,
              threadId: thread.id,
              fix: fix,
              content: post.content.substring(0, 100)
            });
            
            break; // Only match once per post
          }
        }
      }
    }

    // Now mark all the posts with fixed reactions
    console.log(`\n📌 Marking ${postsToMark.length} posts as fixed...\n`);

    for (const item of postsToMark) {
      // Check if already marked as fixed
      const { data: existing } = await supabase
        .from('forum_reactions')
        .select('*')
        .eq('post_id', item.postId)
        .eq('user_id', systemUserId)
        .eq('reaction_type', 'fixed')
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('forum_reactions')
          .insert({
            post_id: item.postId,
            user_id: systemUserId,
            reaction_type: 'fixed'
          });

        if (error) {
          console.error(`   ❌ Failed to mark post: ${error.message}`);
        } else {
          console.log(`   ✅ Marked as fixed: ${item.fix.description}`);
          totalMarked++;
        }
      } else {
        console.log(`   ℹ️  Already marked: ${item.fix.description}`);
      }
    }

    // Add a summary comment to the main thread
    if (totalMarked > 0) {
      const mainThread = threads[0]; // Assuming the first thread is the main feedback thread
      
      const summaryMessage = `🎉 **Update: Multiple issues have been fixed and deployed!**

Based on the feedback in this thread, the following issues have been addressed:

${COMPLETED_FIXES.map(fix => `✅ **${fix.description}**\n   ${fix.notes}`).join('\n\n')}

All these fixes are now live on the site. Thank you for your valuable feedback! 

Please continue to report any issues or suggestions. We're actively monitoring this thread and implementing improvements based on your input.

---
*Issues have been marked with the "Fixed" reaction to track completion.*`;

      const { error } = await supabase
        .from('forum_posts')
        .insert({
          thread_id: mainThread.id,
          user_id: systemUserId,
          content: summaryMessage
        });

      if (error) {
        console.error(`\n❌ Failed to add summary comment: ${error.message}`);
      } else {
        console.log(`\n✅ Added summary comment to thread`);
      }
    }

    console.log(`\n🎉 Complete! Marked ${totalMarked} issues as fixed.`);
    
    if (totalMarked > 0) {
      console.log('\n📝 Next steps:');
      console.log('1. Check the forum to see the fixed reactions');
      console.log('2. Monitor for new feedback');
      console.log('3. Run the feedback processor periodically');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();