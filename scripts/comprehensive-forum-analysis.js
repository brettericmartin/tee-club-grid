#!/usr/bin/env node

/**
 * Comprehensive Forum Analysis
 * 
 * This script provides a complete view of forum feedback including:
 * - All non-locked forum threads with full context
 * - All associated posts and comments
 * - Feedback tracking status
 * - Priority scoring and categorization
 * - Direct links to forum discussions
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

async function fetchAllForumThreadsWithContext() {
  console.log('🔍 Fetching all non-locked forum threads with full context...');
  
  const { data: threads, error } = await supabase
    .from('forum_threads')
    .select(`
      id,
      title,
      slug,
      views,
      is_pinned,
      is_locked,
      created_at,
      updated_at,
      profiles (
        display_name,
        username,
        id
      ),
      forum_categories (
        name,
        slug
      )
    `)
    .eq('is_locked', false)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching forum threads:', error.message);
    return [];
  }

  console.log(`📊 Found ${threads.length} non-locked forum threads`);
  return threads;
}

async function fetchPostsForThread(threadId) {
  const { data: posts, error } = await supabase
    .from('forum_posts')
    .select(`
      id,
      content,
      is_edited,
      edited_at,
      created_at,
      profiles (
        display_name,
        username,
        id
      )
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error(`Error fetching posts for thread ${threadId}:`, error.message);
    return [];
  }

  return posts;
}

async function fetchReactionsForThread(threadId) {
  const { data: reactions, error } = await supabase
    .from('forum_reactions')
    .select(`
      reaction_type,
      forum_posts!inner (
        thread_id
      )
    `)
    .eq('forum_posts.thread_id', threadId);

  if (error) {
    console.error(`Error fetching reactions for thread ${threadId}:`, error.message);
    return [];
  }

  // Count reactions by type
  const reactionCounts = reactions.reduce((acc, reaction) => {
    acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1;
    return acc;
  }, {});

  return reactionCounts;
}

async function fetchFeedbackTracking(threadId) {
  const { data, error } = await supabase
    .from('feedback_tracking')
    .select('*')
    .eq('thread_id', threadId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error(`Error fetching feedback tracking for thread ${threadId}:`, error.message);
  }

  return data;
}

function categorizeIssueType(title, posts) {
  const allText = (title + ' ' + posts.map(p => p.content).join(' ')).toLowerCase();
  
  const categories = [];
  
  // Bug reports
  if (allText.match(/\b(bug|error|broken|fail|not working|doesn't work|crash|issue)\b/)) {
    categories.push('bug');
  }
  
  // Feature requests
  if (allText.match(/\b(feature|add|implement|suggest|would like|request|new)\b/)) {
    categories.push('feature_request');
  }
  
  // UI/UX issues
  if (allText.match(/\b(ui|ux|interface|design|layout|confusing|hard to use|difficult|navigation|button|modal)\b/)) {
    categories.push('ui_ux');
  }
  
  // Mobile/responsive issues
  if (allText.match(/\b(mobile|responsive|mobile window|mobile optimized|mobile view)\b/)) {
    categories.push('mobile_responsive');
  }
  
  // Performance issues
  if (allText.match(/\b(slow|performance|lag|loading|speed|flicker)\b/)) {
    categories.push('performance');
  }
  
  // Feedback/general
  if (categories.length === 0 || allText.match(/\b(feedback|opinion|suggestion|idea)\b/)) {
    categories.push('general_feedback');
  }
  
  return categories;
}

function calculatePriority(thread, posts, reactions, feedbackTracking) {
  let priority = 1;
  
  // Boost for engagement
  if (posts.length > 5) priority += 2;
  else if (posts.length > 2) priority += 1;
  
  // Boost for reactions
  const totalReactions = Object.values(reactions).reduce((sum, count) => sum + count, 0);
  if (totalReactions > 10) priority += 2;
  else if (totalReactions > 5) priority += 1;
  
  // Boost for recent activity
  const lastActivity = new Date(thread.updated_at);
  const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceActivity < 7) priority += 2;
  else if (daysSinceActivity < 30) priority += 1;
  
  // Boost for pinned threads
  if (thread.is_pinned) priority += 1;
  
  // Boost for high-impact keywords
  const allText = (thread.title + ' ' + posts.map(p => p.content).join(' ')).toLowerCase();
  if (allText.includes('critical') || allText.includes('urgent') || allText.includes('breaking')) {
    priority += 3;
  }
  
  // Reduce for completed items
  if (feedbackTracking && feedbackTracking.status === 'fixed') {
    priority = Math.max(1, priority - 2);
  }
  
  return Math.min(priority, 5);
}

function extractKeyInsights(posts) {
  const insights = [];
  
  for (const post of posts) {
    const content = post.content.toLowerCase();
    
    // Extract specific bug mentions
    const bugPatterns = [
      /edit.*doesn't work|edit.*not working|edit.*broken/,
      /button.*not working|button.*broken|button.*outside/,
      /modal.*can't exit|modal.*no x|modal.*behind/,
      /mobile.*outside|mobile.*not optimized/,
      /tees.*not working|tees.*broken/,
      /flicker|flickering/,
      /search.*doesn't work|search.*not working/
    ];
    
    for (const pattern of bugPatterns) {
      const match = post.content.match(new RegExp(pattern.source, 'i'));
      if (match) {
        insights.push({
          type: 'specific_bug',
          description: match[0],
          author: post.profiles?.display_name || post.profiles?.username || 'Unknown',
          date: post.created_at
        });
      }
    }
    
    // Extract feature requests
    const featurePatterns = [
      /add.*search function/,
      /need.*multiple photos/,
      /add.*default.*option/,
      /show.*in.*feed/,
      /allow swiping/
    ];
    
    for (const pattern of featurePatterns) {
      const match = post.content.match(new RegExp(pattern.source, 'i'));
      if (match) {
        insights.push({
          type: 'feature_request',
          description: match[0],
          author: post.profiles?.display_name || post.profiles?.username || 'Unknown',
          date: post.created_at
        });
      }
    }
  }
  
  return insights;
}

async function analyzeAllThreads() {
  const threads = await fetchAllForumThreadsWithContext();
  const analyzedThreads = [];
  
  console.log('\n📝 Analyzing each thread with full context...\n');
  
  for (const thread of threads) {
    console.log(`Analyzing: ${thread.title}`);
    
    const [posts, reactions, feedbackTracking] = await Promise.all([
      fetchPostsForThread(thread.id),
      fetchReactionsForThread(thread.id),
      fetchFeedbackTracking(thread.id)
    ]);
    
    const categories = categorizeIssueType(thread.title, posts);
    const priority = calculatePriority(thread, posts, reactions, feedbackTracking);
    const insights = extractKeyInsights(posts);
    
    analyzedThreads.push({
      thread,
      posts,
      reactions,
      feedbackTracking,
      categories,
      priority,
      insights,
      url: `https://teed.club/forum/${thread.forum_categories?.slug}/${thread.slug}`
    });
  }
  
  return analyzedThreads.sort((a, b) => b.priority - a.priority);
}

function printComprehensiveResults(analyzedThreads) {
  console.log('\n' + '='.repeat(80));
  console.log('🎯 COMPREHENSIVE FORUM FEEDBACK ANALYSIS');
  console.log('='.repeat(80));
  
  // Summary stats
  const totalThreads = analyzedThreads.length;
  const totalPosts = analyzedThreads.reduce((sum, t) => sum + t.posts.length, 0);
  const siteFeedbackThreads = analyzedThreads.filter(t => t.thread.forum_categories?.slug === 'site-feedback');
  const pendingIssues = analyzedThreads.filter(t => !t.feedbackTracking || t.feedbackTracking.status === 'pending');
  
  console.log(`\n📊 OVERVIEW:`);
  console.log(`   Total Threads: ${totalThreads}`);
  console.log(`   Total Posts: ${totalPosts}`);
  console.log(`   Site Feedback Threads: ${siteFeedbackThreads.length}`);
  console.log(`   Pending/Unaddressed Issues: ${pendingIssues.length}`);
  
  // High Priority Issues
  const highPriorityThreads = analyzedThreads.filter(t => t.priority >= 4);
  if (highPriorityThreads.length > 0) {
    console.log('\n🚨 HIGH PRIORITY ISSUES (Priority 4-5)');
    console.log('-'.repeat(60));
    
    for (const item of highPriorityThreads) {
      console.log(`\n📌 ${item.thread.title}`);
      console.log(`   Priority: ${item.priority}/5`);
      console.log(`   Category: ${item.thread.forum_categories?.name}`);
      console.log(`   Categories: ${item.categories.join(', ')}`);
      console.log(`   Author: ${item.thread.profiles?.display_name || item.thread.profiles?.username}`);
      console.log(`   Posts: ${item.posts.length} | Views: ${item.thread.views}`);
      console.log(`   Reactions: ${JSON.stringify(item.reactions)}`);
      console.log(`   Status: ${item.feedbackTracking?.status || 'Not tracked'}`);
      console.log(`   URL: ${item.url}`);
      
      if (item.insights.length > 0) {
        console.log(`   Key Insights:`);
        for (const insight of item.insights.slice(0, 3)) {
          console.log(`     - ${insight.type}: "${insight.description}" (${insight.author})`);
        }
      }
    }
  }
  
  // Site Feedback Details
  if (siteFeedbackThreads.length > 0) {
    console.log('\n💬 SITE FEEDBACK THREADS - FULL DISCUSSION CONTEXT');
    console.log('-'.repeat(60));
    
    for (const item of siteFeedbackThreads) {
      console.log(`\n🧵 ${item.thread.title}`);
      console.log(`   Created: ${new Date(item.thread.created_at).toLocaleDateString()}`);
      console.log(`   Updated: ${new Date(item.thread.updated_at).toLocaleDateString()}`);
      console.log(`   Priority: ${item.priority}/5`);
      console.log(`   Categories: ${item.categories.join(', ')}`);
      console.log(`   Status: ${item.feedbackTracking?.status || 'Not tracked'}`);
      console.log(`   URL: ${item.url}\n`);
      
      console.log(`   📄 FULL DISCUSSION (${item.posts.length} posts):`);
      
      for (let i = 0; i < item.posts.length; i++) {
        const post = item.posts[i];
        const author = post.profiles?.display_name || post.profiles?.username || 'Unknown';
        const date = new Date(post.created_at).toLocaleDateString();
        
        console.log(`\n   ${i + 1}. ${author} (${date}):`);
        console.log(`      "${post.content}"`);
        
        if (post.is_edited) {
          console.log(`      [Edited: ${new Date(post.edited_at).toLocaleDateString()}]`);
        }
      }
      
      if (Object.keys(item.reactions).length > 0) {
        console.log(`\n   👥 Reactions: ${JSON.stringify(item.reactions)}`);
      }
      
      if (item.feedbackTracking) {
        console.log(`\n   📋 Tracking Info:`);
        console.log(`      Type: ${item.feedbackTracking.issue_type}`);
        console.log(`      Status: ${item.feedbackTracking.status}`);
        console.log(`      Priority: ${item.feedbackTracking.priority}/5`);
        if (item.feedbackTracking.implementation_notes) {
          console.log(`      Notes: ${item.feedbackTracking.implementation_notes}`);
        }
        if (item.feedbackTracking.pr_url) {
          console.log(`      PR: ${item.feedbackTracking.pr_url}`);
        }
      }
      
      console.log('\n' + '-'.repeat(60));
    }
  }
  
  // Issues by Category
  console.log('\n📋 ISSUES BY CATEGORY');
  console.log('-'.repeat(40));
  
  const categoryStats = {};
  for (const item of analyzedThreads) {
    for (const category of item.categories) {
      if (!categoryStats[category]) {
        categoryStats[category] = [];
      }
      categoryStats[category].push(item);
    }
  }
  
  for (const [category, items] of Object.entries(categoryStats)) {
    console.log(`\n${category.toUpperCase()}: ${items.length} threads`);
    for (const item of items.slice(0, 3)) { // Top 3 per category
      console.log(`  • ${item.thread.title} (Priority: ${item.priority}/5)`);
    }
  }
  
  // Unaddressed Issues
  const unaddressed = analyzedThreads.filter(t => 
    !t.feedbackTracking || 
    t.feedbackTracking.status === 'pending' || 
    t.feedbackTracking.status === null
  );
  
  console.log('\n⚠️  UNADDRESSED ISSUES');
  console.log('-'.repeat(40));
  console.log(`Found ${unaddressed.length} unaddressed issues:\n`);
  
  for (const item of unaddressed.slice(0, 10)) { // Top 10 unaddressed
    console.log(`  ${item.priority}/5 - ${item.thread.title}`);
    console.log(`       Categories: ${item.categories.join(', ')}`);
    console.log(`       Posts: ${item.posts.length} | Last activity: ${new Date(item.thread.updated_at).toLocaleDateString()}`);
    console.log(`       ${item.url}\n`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🎯 RECOMMENDED ACTIONS');
  console.log('='.repeat(80));
  
  console.log(`\n1. Address ${highPriorityThreads.length} high-priority issues first`);
  console.log(`2. Review ${unaddressed.length} unaddressed issues for implementation`);
  console.log(`3. Update feedback tracking for pending items`);
  console.log(`4. Consider closing or archiving resolved discussions`);
  
  const bugCount = analyzedThreads.filter(t => t.categories.includes('bug')).length;
  const featureCount = analyzedThreads.filter(t => t.categories.includes('feature_request')).length;
  const mobileCount = analyzedThreads.filter(t => t.categories.includes('mobile_responsive')).length;
  
  console.log(`\nPriority Focus Areas:`);
  console.log(`• Bug Fixes: ${bugCount} threads`);
  console.log(`• Mobile/Responsive: ${mobileCount} threads`);
  console.log(`• Feature Requests: ${featureCount} threads`);
}

async function main() {
  try {
    console.log('🚀 Starting comprehensive forum analysis...');
    
    const analyzedThreads = await analyzeAllThreads();
    
    if (analyzedThreads.length === 0) {
      console.log('\n✅ No forum threads found');
      return;
    }
    
    printComprehensiveResults(analyzedThreads);
    
  } catch (error) {
    console.error('❌ Error analyzing forum:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();