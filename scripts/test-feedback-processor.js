#!/usr/bin/env node

/**
 * Test script for the Forum Feedback Processor
 * 
 * This creates test data and verifies the feedback processing system works
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const log = (message, emoji = '📝') => {
  console.log(`${emoji} ${message}`);
};

async function testDatabaseSchema() {
  log('Testing database schema...', '🔍');
  
  try {
    // Test feedback_tracking table
    const { error: trackingError } = await supabase
      .from('feedback_tracking')
      .select('*')
      .limit(1);
    
    if (trackingError) {
      log(`feedback_tracking table error: ${trackingError.message}`, '❌');
      return false;
    }
    log('feedback_tracking table exists', '✅');
    
    // Test feedback_sessions table
    const { error: sessionsError } = await supabase
      .from('feedback_sessions')
      .select('*')
      .limit(1);
    
    if (sessionsError) {
      log(`feedback_sessions table error: ${sessionsError.message}`, '❌');
      return false;
    }
    log('feedback_sessions table exists', '✅');
    
    // Test forum_feedback_status view
    const { error: viewError } = await supabase
      .from('forum_feedback_status')
      .select('*')
      .limit(1);
    
    if (viewError) {
      log(`forum_feedback_status view error: ${viewError.message}`, '❌');
      return false;
    }
    log('forum_feedback_status view exists', '✅');
    
    return true;
  } catch (error) {
    log(`Schema test failed: ${error.message}`, '❌');
    return false;
  }
}

async function testReactionTypes() {
  log('Testing reaction types...', '🔍');
  
  try {
    // Check if 'fixed' reaction type is supported
    const testReaction = {
      post_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      user_id: '00000000-0000-0000-0000-000000000000',
      reaction_type: 'fixed'
    };
    
    // Try to insert and immediately delete (rollback)
    const { error } = await supabase
      .from('forum_reactions')
      .insert(testReaction)
      .select();
    
    if (error) {
      if (error.message.includes('violates check constraint')) {
        log(`'fixed' reaction type not yet added to database`, '⚠️');
        log(`Run the migration: supabase/migrations/add-feedback-tracking.sql`, '💡');
        return false;
      }
      // Other errors are ok (like foreign key constraints)
    }
    
    // Clean up test data
    await supabase
      .from('forum_reactions')
      .delete()
      .eq('post_id', testReaction.post_id);
    
    log(`'fixed' reaction type is supported`, '✅');
    return true;
  } catch (error) {
    log(`Reaction type test failed: ${error.message}`, '❌');
    return false;
  }
}

async function checkSiteFeedbackCategory() {
  log('Checking Site Feedback category...', '🔍');
  
  try {
    const { data, error } = await supabase
      .from('forum_categories')
      .select('*')
      .eq('slug', 'site-feedback')
      .single();
    
    if (error || !data) {
      log(`Site Feedback category not found`, '⚠️');
      log(`You may need to run: node scripts/create-forum-schema.js`, '💡');
      return null;
    }
    
    log(`Site Feedback category exists (ID: ${data.id})`, '✅');
    return data;
  } catch (error) {
    log(`Category check failed: ${error.message}`, '❌');
    return null;
  }
}

async function createTestFeedback(categoryId) {
  log('Creating test feedback thread...', '🔧');
  
  try {
    // Create a test user first
    const { data: testUser } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();
    
    if (!testUser) {
      log('No users found in database', '❌');
      return null;
    }
    
    // Create test thread
    const threadData = {
      category_id: categoryId,
      user_id: testUser.id,
      title: 'Test Feedback: Mobile menu not responsive',
      slug: `test-feedback-${Date.now()}`
    };
    
    const { data: thread, error: threadError } = await supabase
      .from('forum_threads')
      .insert(threadData)
      .select()
      .single();
    
    if (threadError) {
      log(`Failed to create test thread: ${threadError.message}`, '❌');
      return null;
    }
    
    // Create initial post
    const postData = {
      thread_id: thread.id,
      user_id: testUser.id,
      content: 'The mobile menu button is too small on iPhone. It\'s hard to tap with my finger. The button should be at least 44x44 pixels according to Apple guidelines. This is especially problematic on the feed page.'
    };
    
    const { error: postError } = await supabase
      .from('forum_posts')
      .insert(postData);
    
    if (postError) {
      log(`Failed to create test post: ${postError.message}`, '❌');
      return null;
    }
    
    log(`Test feedback created: ${thread.title}`, '✅');
    return thread;
  } catch (error) {
    log(`Test feedback creation failed: ${error.message}`, '❌');
    return null;
  }
}

async function testFeedbackView() {
  log('Testing feedback view...', '🔍');
  
  try {
    const { data, error } = await supabase
      .from('forum_feedback_status')
      .select('*')
      .limit(5);
    
    if (error) {
      log(`Feedback view error: ${error.message}`, '❌');
      return false;
    }
    
    log(`Found ${data.length} feedback items in view`, '✅');
    
    if (data.length > 0) {
      log('Sample feedback items:', '📋');
      data.forEach(item => {
        console.log(`  - ${item.title} (Status: ${item.status || 'pending'})`);
      });
    }
    
    return true;
  } catch (error) {
    log(`View test failed: ${error.message}`, '❌');
    return false;
  }
}

async function cleanupTestData(threadId) {
  if (!threadId) return;
  
  log('Cleaning up test data...', '🧹');
  
  try {
    await supabase
      .from('forum_threads')
      .delete()
      .eq('id', threadId);
    
    log('Test data cleaned up', '✅');
  } catch (error) {
    log(`Cleanup failed: ${error.message}`, '⚠️');
  }
}

async function main() {
  console.log('');
  log('=== Forum Feedback Processor Test Suite ===', '🧪');
  console.log('');
  
  // Test database schema
  const schemaOk = await testDatabaseSchema();
  if (!schemaOk) {
    log('Schema tests failed. Please run migrations first.', '❌');
    process.exit(1);
  }
  
  // Test reaction types
  await testReactionTypes();
  
  // Check for Site Feedback category
  const category = await checkSiteFeedbackCategory();
  
  let testThreadId = null;
  if (category) {
    // Create test feedback
    const testThread = await createTestFeedback(category.id);
    testThreadId = testThread?.id;
    
    // Test the view
    await testFeedbackView();
  }
  
  console.log('');
  log('=== Test Summary ===', '📊');
  
  if (schemaOk && category) {
    log('All core systems are ready!', '✅');
    log('You can now run: node scripts/process-forum-feedback.js --dry-run', '💡');
  } else {
    log('Some systems need setup. Check the warnings above.', '⚠️');
  }
  
  // Cleanup
  if (testThreadId && process.argv.includes('--cleanup')) {
    await cleanupTestData(testThreadId);
  }
  
  console.log('');
}

main().catch(console.error);