#!/usr/bin/env node

/**
 * Process existing forum feedback without requiring database migration
 * This demonstrates how the agent would work with current feedback
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const exec = (command) => {
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    return null;
  }
};

const log = (message, emoji = '📝') => {
  console.log(`${emoji} ${message}`);
};

// Analyze feedback from posts
function analyzeFeedback(posts) {
  const issues = [];
  
  posts.forEach((post, index) => {
    const content = post.content.toLowerCase();
    
    // Skip the initial welcome post
    if (index === 0 && content.includes('please let us know your feedback')) {
      return;
    }
    
    // Parse each post for actionable feedback
    const lines = post.content.split('\n');
    
    lines.forEach(line => {
      if (line.trim().length < 10) return;
      
      // Detect issues
      if (line.includes('reset') || line.includes('resets')) {
        issues.push({
          id: `issue-${issues.length + 1}`,
          type: 'bug',
          description: line.trim(),
          priority: 'high',
          component: 'equipment-selector',
          user: post.user?.username
        });
      }
      
      if (line.includes('username') && line.includes('display name')) {
        issues.push({
          id: `issue-${issues.length + 1}`,
          type: 'bug',
          description: line.trim(),
          priority: 'medium',
          component: 'forum',
          user: post.user?.username
        });
      }
      
      if (line.includes('button') && (line.includes('reply') || line.includes('comment'))) {
        issues.push({
          id: `issue-${issues.length + 1}`,
          type: 'improvement',
          description: line.trim(),
          priority: 'medium',
          component: 'forum',
          user: post.user?.username
        });
      }
      
      if (line.includes('edit') && line.includes("doesn't work")) {
        issues.push({
          id: `issue-${issues.length + 1}`,
          type: 'bug',
          description: line.trim(),
          priority: 'high',
          component: 'forum',
          user: post.user?.username
        });
      }
      
      if (line.includes('refresh') && line.includes('jump')) {
        issues.push({
          id: `issue-${issues.length + 1}`,
          type: 'bug',
          description: line.trim(),
          priority: 'medium',
          component: 'forum',
          user: post.user?.username
        });
      }
      
      if (line.includes('layout') && line.includes("doesn't make sense")) {
        issues.push({
          id: `issue-${issues.length + 1}`,
          type: 'improvement',
          description: line.trim(),
          priority: 'low',
          component: 'forum',
          user: post.user?.username
        });
      }
    });
  });
  
  // Remove duplicates
  const uniqueIssues = [];
  const seen = new Set();
  
  issues.forEach(issue => {
    const key = issue.description.substring(0, 50);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueIssues.push(issue);
    }
  });
  
  return uniqueIssues;
}

// Generate fix plan
function generateFixPlan(issues) {
  const fixes = [];
  
  issues.forEach(issue => {
    let fix = {
      issue: issue,
      files: [],
      actions: [],
      testPlan: []
    };
    
    if (issue.component === 'equipment-selector') {
      fix.files = [
        'src/components/EquipmentSelectorModal.tsx',
        'src/components/equipment/EquipmentSelector.tsx'
      ];
      fix.actions = [
        'Add state persistence when modal closes',
        'Store search/filter state in sessionStorage',
        'Restore state when modal reopens'
      ];
      fix.testPlan = [
        'Open equipment selector',
        'Search for item',
        'Click outside to close',
        'Reopen and verify search persists'
      ];
    }
    
    if (issue.component === 'forum' && issue.description.includes('username')) {
      fix.files = [
        'src/components/forum/PostCard.tsx',
        'src/components/forum/ThreadView.tsx'
      ];
      fix.actions = [
        'Update to use display_name instead of username',
        'Add fallback to username if display_name not set'
      ];
      fix.testPlan = [
        'View forum posts',
        'Verify display names show correctly'
      ];
    }
    
    if (issue.component === 'forum' && issue.description.includes('edit')) {
      fix.files = [
        'src/components/forum/PostCard.tsx',
        'src/services/forum.ts'
      ];
      fix.actions = [
        'Fix edit post functionality',
        'Add proper state management for editing',
        'Ensure UI updates after edit'
      ];
      fix.testPlan = [
        'Create a post',
        'Click edit',
        'Make changes',
        'Save and verify updates'
      ];
    }
    
    if (issue.component === 'forum' && issue.description.includes('refresh')) {
      fix.files = [
        'src/components/forum/ThreadView.tsx',
        'src/components/forum/PostThread.tsx'
      ];
      fix.actions = [
        'Prevent page scroll on post submission',
        'Maintain scroll position after posting',
        'Add smooth scroll to new post'
      ];
      fix.testPlan = [
        'Scroll to bottom of thread',
        'Post a comment',
        'Verify page doesn\'t jump to top'
      ];
    }
    
    if (fix.actions.length > 0) {
      fixes.push(fix);
    }
  });
  
  return fixes;
}

async function main() {
  log('🔍 Forum Feedback Processor - Analyzing Existing Feedback\n', '🚀');
  
  try {
    // Get Site Feedback category
    const { data: category } = await supabase
      .from('forum_categories')
      .select('*')
      .eq('slug', 'site-feedback')
      .single();
    
    if (!category) {
      log('Site Feedback category not found', '❌');
      return;
    }
    
    // Get the General Site Feedback thread
    const { data: threads } = await supabase
      .from('forum_threads')
      .select('*')
      .eq('category_id', category.id);
    
    if (!threads || threads.length === 0) {
      log('No feedback threads found', '❌');
      return;
    }
    
    const thread = threads[0];
    log(`Found thread: "${thread.title}"`, '📋');
    
    // Get all posts
    const { data: posts } = await supabase
      .from('forum_posts')
      .select('*, user:profiles(username, display_name)')
      .eq('thread_id', thread.id)
      .order('created_at');
    
    log(`Found ${posts.length} posts to analyze\n`, '📊');
    
    // Analyze feedback
    const issues = analyzeFeedback(posts);
    
    log(`Identified ${issues.length} actionable issues:\n`, '🔍');
    
    // Group by priority
    const highPriority = issues.filter(i => i.priority === 'high');
    const mediumPriority = issues.filter(i => i.priority === 'medium');
    const lowPriority = issues.filter(i => i.priority === 'low');
    
    if (highPriority.length > 0) {
      log('HIGH PRIORITY:', '🔴');
      highPriority.forEach(issue => {
        console.log(`  - ${issue.description}`);
        console.log(`    Type: ${issue.type} | Component: ${issue.component} | By: ${issue.user}`);
      });
      console.log('');
    }
    
    if (mediumPriority.length > 0) {
      log('MEDIUM PRIORITY:', '🟡');
      mediumPriority.forEach(issue => {
        console.log(`  - ${issue.description}`);
        console.log(`    Type: ${issue.type} | Component: ${issue.component} | By: ${issue.user}`);
      });
      console.log('');
    }
    
    if (lowPriority.length > 0) {
      log('LOW PRIORITY:', '🟢');
      lowPriority.forEach(issue => {
        console.log(`  - ${issue.description}`);
        console.log(`    Type: ${issue.type} | Component: ${issue.component} | By: ${issue.user}`);
      });
      console.log('');
    }
    
    // Generate fix plan
    const fixes = generateFixPlan(issues);
    
    log(`\n📝 FIX PLAN (${fixes.length} fixes to implement):\n`, '🔧');
    
    fixes.forEach((fix, index) => {
      console.log(`\n${index + 1}. ${fix.issue.description}`);
      console.log('   Priority:', fix.issue.priority.toUpperCase());
      console.log('   Files to modify:');
      fix.files.forEach(file => console.log(`     - ${file}`));
      console.log('   Actions:');
      fix.actions.forEach(action => console.log(`     ✓ ${action}`));
      console.log('   Test plan:');
      fix.testPlan.forEach(test => console.log(`     🧪 ${test}`));
    });
    
    console.log('\n');
    log('IMPLEMENTATION WORKFLOW:', '🚀');
    console.log('1. Create branch: feedback-fixes-' + new Date().toISOString().split('T')[0]);
    console.log('2. Implement each fix with tests');
    console.log('3. Create PR with all fixes');
    console.log('4. Update forum thread with "fixed" reactions');
    console.log('\n');
    
    log('To implement these fixes automatically, the full agent would:', '💡');
    console.log('- Create the branch');
    console.log('- Make the code changes');
    console.log('- Run tests');
    console.log('- Create a PR');
    console.log('- Post updates to the forum thread');
    
  } catch (error) {
    log(`Error: ${error.message}`, '❌');
  }
}

main();