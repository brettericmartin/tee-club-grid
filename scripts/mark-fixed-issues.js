#!/usr/bin/env node

/**
 * Mark fixed issues in the forum with 'fixed' reactions
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const FIXED_ISSUES = [
  {
    keyword: 'equipment input resets',
    description: 'Equipment selector state persistence - FIXED'
  },
  {
    keyword: 'display name',
    description: 'Forum now shows display names instead of usernames - FIXED'
  },
  {
    keyword: 'reply.*button.*top',
    description: 'Added reply button at top of posts - FIXED'
  },
  {
    keyword: 'refresh.*jump',
    description: 'Fixed forum scroll jump after posting - FIXED'
  },
  {
    keyword: 'edit.*doesn.*work',
    description: 'Edit post functionality now works - FIXED'
  },
  {
    keyword: 'delet.*comment',
    description: 'Delete post functionality now works - FIXED'
  },
  {
    keyword: 'layout.*doesn.*make sense',
    description: 'Improved reaction button layout - FIXED'
  }
];

async function markAsFixed() {
  console.log('🔧 Marking fixed issues in forum feedback...\n');

  try {
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

    // Get the General Site Feedback thread
    const { data: threads } = await supabase
      .from('forum_threads')
      .select('*')
      .eq('category_id', category.id);
    
    if (!threads || threads.length === 0) {
      console.error('❌ No feedback threads found');
      return;
    }

    const thread = threads[0];
    console.log(`📋 Found thread: "${thread.title}"`);

    // Get all posts in the thread
    const { data: posts } = await supabase
      .from('forum_posts')
      .select('*, user:profiles(username, display_name)')
      .eq('thread_id', thread.id)
      .order('created_at');

    console.log(`📊 Found ${posts.length} posts to check\n`);

    // Get the current user (you'll need to be logged in)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('❌ You need to be logged in to add reactions');
      console.log('\n💡 To mark issues as fixed:');
      console.log('1. Log into the site at https://teed.club');
      console.log('2. Go to the forum feedback thread');
      console.log('3. Manually add "Fixed" reactions to resolved issues');
      return;
    }

    let fixedCount = 0;

    // Check each post for fixed issues
    for (const post of posts) {
      const content = post.content.toLowerCase();
      
      for (const issue of FIXED_ISSUES) {
        const regex = new RegExp(issue.keyword, 'i');
        if (regex.test(content)) {
          console.log(`✅ Found fixed issue: "${post.content.substring(0, 50)}..."`);
          console.log(`   Fix: ${issue.description}`);
          
          // Check if already marked as fixed
          const { data: existingReaction } = await supabase
            .from('forum_reactions')
            .select('*')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .eq('reaction_type', 'fixed')
            .single();

          if (!existingReaction) {
            // Add fixed reaction
            const { error } = await supabase
              .from('forum_reactions')
              .insert({
                post_id: post.id,
                user_id: user.id,
                reaction_type: 'fixed'
              });

            if (error) {
              console.error(`   ❌ Failed to add reaction: ${error.message}`);
            } else {
              console.log(`   ✅ Added "Fixed" reaction`);
              fixedCount++;
            }
          } else {
            console.log(`   ℹ️ Already marked as fixed`);
          }
          
          break; // Only mark once per post
        }
      }
    }

    console.log(`\n🎉 Marked ${fixedCount} issues as fixed!`);
    
    // Add a summary comment to the thread
    if (fixedCount > 0) {
      const summaryComment = `🚀 **Update: Multiple issues have been fixed!**

The following issues from this thread have been addressed and deployed:

✅ **Equipment selector state persistence** - The selector now remembers your search/filter state
✅ **Display names in forum** - Forum now shows display names instead of usernames
✅ **Reply button placement** - Added reply button at the top of each post for easier access
✅ **Scroll position after posting** - Fixed the page jump issue when posting comments
✅ **Edit post functionality** - You can now edit your own posts
✅ **Delete post functionality** - You can now delete your own posts
✅ **Reaction button layout** - Improved the layout for better UX

Thank you for your feedback! Keep the suggestions coming. 🙏`;

      const { error } = await supabase
        .from('forum_posts')
        .insert({
          thread_id: thread.id,
          user_id: user.id,
          content: summaryComment
        });

      if (error) {
        console.error(`❌ Failed to add summary comment: ${error.message}`);
      } else {
        console.log('✅ Added summary comment to thread');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Add a comment with implementation details
async function addImplementationComment() {
  try {
    // Get Site Feedback category and thread
    const { data: category } = await supabase
      .from('forum_categories')
      .select('*')
      .eq('slug', 'site-feedback')
      .single();
    
    const { data: threads } = await supabase
      .from('forum_threads')
      .select('*')
      .eq('category_id', category.id);
    
    if (!threads || threads.length === 0) return;
    
    const thread = threads[0];
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('\n📝 Manual update needed:');
      console.log('Please add a comment to the forum thread explaining the fixes');
      return;
    }

    console.log('\n📝 You can manually add a comment to the thread at:');
    console.log(`https://teed.club/forum/site-feedback/${thread.slug}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

markAsFixed().then(() => addImplementationComment());