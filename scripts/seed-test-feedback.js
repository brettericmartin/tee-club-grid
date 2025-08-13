#!/usr/bin/env node

/**
 * Seed test feedback for demonstration
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const testFeedbackItems = [
  {
    title: "Mobile menu button too small",
    content: "The hamburger menu button on mobile is really hard to tap. It's only about 30x30 pixels but Apple recommends 44x44 minimum. This is especially problematic on the feed page where I use it frequently.",
    type: "bug"
  },
  {
    title: "Add dark mode toggle",
    content: "Would love to have a dark mode option! The white background is too bright at night. Could add a toggle in the settings or profile menu. Many golf apps have this feature now.",
    type: "feature"
  },
  {
    title: "Equipment search needs improvement",
    content: "When searching for equipment, it would be helpful to filter by year or price range. Currently have to scroll through everything. Also the search box is too small on mobile devices.",
    type: "improvement"
  },
  {
    title: "Bag photos not loading properly",
    content: "Sometimes when I view my bag, the equipment photos don't load. Just see gray boxes. Have to refresh the page 2-3 times. Happens on both desktop and mobile. Using Chrome browser.",
    type: "bug"
  },
  {
    title: "Love the tee animation!",
    content: "Just wanted to say the golf ball tee animation when liking posts is fantastic! Really gives the app personality. No changes needed here.",
    type: "feedback"
  }
];

async function seedFeedback() {
  console.log('🌱 Seeding test feedback...\n');
  
  try {
    // Get Site Feedback category
    const { data: category, error: catError } = await supabase
      .from('forum_categories')
      .select('*')
      .eq('slug', 'site-feedback')
      .single();
    
    if (catError || !category) {
      console.error('❌ Site Feedback category not found');
      return;
    }
    
    // Get a test user (first available)
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(1)
      .single();
    
    if (userError || !user) {
      console.error('❌ No users found. Please create a user first.');
      return;
    }
    
    console.log(`📝 Creating feedback as user: ${user.username}\n`);
    
    // Create threads and posts
    for (const item of testFeedbackItems) {
      // Create thread
      const { data: thread, error: threadError } = await supabase
        .from('forum_threads')
        .insert({
          category_id: category.id,
          user_id: user.id,
          title: item.title,
          slug: item.title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
        })
        .select()
        .single();
      
      if (threadError) {
        console.error(`❌ Failed to create thread: ${item.title}`);
        continue;
      }
      
      // Create initial post
      const { data: post, error: postError } = await supabase
        .from('forum_posts')
        .insert({
          thread_id: thread.id,
          user_id: user.id,
          content: item.content
        })
        .select()
        .single();
      
      if (postError) {
        console.error(`❌ Failed to create post for: ${item.title}`);
        continue;
      }
      
      // Add some reactions to prioritize
      if (item.type === 'bug') {
        // Bugs get more "helpful" reactions
        for (let i = 0; i < 3; i++) {
          await supabase
            .from('forum_reactions')
            .insert({
              post_id: post.id,
              user_id: user.id,
              reaction_type: 'helpful'
            });
        }
      } else if (item.type === 'feature') {
        // Features get "tee" reactions
        for (let i = 0; i < 2; i++) {
          await supabase
            .from('forum_reactions')
            .insert({
              post_id: post.id,
              user_id: user.id,
              reaction_type: 'tee'
            });
        }
      }
      
      console.log(`✅ Created: ${item.title} (${item.type})`);
    }
    
    console.log('\n🎉 Test feedback seeded successfully!');
    console.log('You can now run: node scripts/process-forum-feedback.js --dry-run');
    
  } catch (error) {
    console.error('❌ Error seeding feedback:', error.message);
  }
}

seedFeedback();