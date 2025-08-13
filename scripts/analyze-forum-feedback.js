#!/usr/bin/env node

/**
 * Analyze Forum Feedback for Unaddressed Issues
 * 
 * This script searches through forum posts in the Site Feedback category
 * to identify unaddressed issues, focusing on:
 * - Edit functionality issues
 * - Layout problems
 * - Other bugs mentioned by users
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

// Search terms for different types of issues
const SEARCH_PATTERNS = {
  edit_issues: [
    'edit doesn\'t work',
    'edit not working',
    'can\'t edit',
    'cannot edit',
    'edit button',
    'edit fails',
    'edit broken'
  ],
  layout_issues: [
    'layout',
    'responsive',
    'mobile',
    'spacing',
    'overflow',
    'alignment',
    'positioning',
    'css',
    'styling'
  ],
  general_bugs: [
    'bug',
    'broken',
    'doesn\'t work',
    'not working',
    'error',
    'fails',
    'issue',
    'problem'
  ],
  ui_ux_issues: [
    'confusing',
    'hard to use',
    'difficult',
    'unclear',
    'navigation',
    'menu',
    'button',
    'modal',
    'popup'
  ]
};

// Known fixed issues (to exclude from results)
const FIXED_ISSUES = [
  'equipment selector state persistence',
  'display names instead of usernames',
  'reply button at top',
  'scroll jump after posting',
  'forum showing display names',
  'reply button top of posts'
];

async function fetchSiteFeedbackPosts() {
  console.log('🔍 Fetching Site Feedback forum posts...');
  
  const { data, error } = await supabase
    .from('forum_threads')
    .select(`
      id,
      title,
      slug,
      created_at,
      forum_posts (
        id,
        content,
        created_at,
        profiles (
          display_name,
          username
        )
      ),
      forum_categories!inner (
        slug
      )
    `)
    .eq('forum_categories.slug', 'site-feedback')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching forum posts:', error.message);
    return [];
  }

  console.log(`📊 Found ${data.length} Site Feedback threads`);
  return data;
}

function analyzePostContent(content, threadTitle) {
  const issues = [];
  const lowerContent = content.toLowerCase();
  const lowerTitle = threadTitle.toLowerCase();
  
  // Check if this is about a known fixed issue
  const isKnownFixed = FIXED_ISSUES.some(fixed => 
    lowerContent.includes(fixed.toLowerCase()) || 
    lowerTitle.includes(fixed.toLowerCase())
  );
  
  if (isKnownFixed) {
    return []; // Skip known fixed issues
  }
  
  // Check for edit issues
  for (const pattern of SEARCH_PATTERNS.edit_issues) {
    if (lowerContent.includes(pattern) || lowerTitle.includes(pattern)) {
      issues.push({
        type: 'edit_functionality',
        pattern,
        severity: 'high',
        description: extractRelevantSentences(content, pattern)
      });
    }
  }
  
  // Check for layout issues
  for (const pattern of SEARCH_PATTERNS.layout_issues) {
    if (lowerContent.includes(pattern) || lowerTitle.includes(pattern)) {
      issues.push({
        type: 'layout_issue',
        pattern,
        severity: 'medium',
        description: extractRelevantSentences(content, pattern)
      });
    }
  }
  
  // Check for general bugs
  for (const pattern of SEARCH_PATTERNS.general_bugs) {
    if (lowerContent.includes(pattern) || lowerTitle.includes(pattern)) {
      issues.push({
        type: 'bug',
        pattern,
        severity: 'high',
        description: extractRelevantSentences(content, pattern)
      });
    }
  }
  
  // Check for UI/UX issues
  for (const pattern of SEARCH_PATTERNS.ui_ux_issues) {
    if (lowerContent.includes(pattern) || lowerTitle.includes(pattern)) {
      issues.push({
        type: 'ui_ux',
        pattern,
        severity: 'medium',
        description: extractRelevantSentences(content, pattern)
      });
    }
  }
  
  return issues;
}

function extractRelevantSentences(content, pattern) {
  const sentences = content.split(/[.!?]+/);
  const relevantSentences = sentences.filter(sentence => 
    sentence.toLowerCase().includes(pattern.toLowerCase())
  );
  
  return relevantSentences.slice(0, 2).join('. ').trim();
}

function calculatePriority(thread, issues) {
  const postCount = thread.forum_posts.length;
  const recentness = new Date() - new Date(thread.created_at);
  const daysSinceCreated = recentness / (1000 * 60 * 60 * 24);
  
  let priority = 1;
  
  // Boost priority for edit issues
  if (issues.some(i => i.type === 'edit_functionality')) {
    priority += 2;
  }
  
  // Boost for high severity
  if (issues.some(i => i.severity === 'high')) {
    priority += 1;
  }
  
  // Boost for engagement
  if (postCount > 3) {
    priority += 1;
  }
  
  // Boost for recent posts
  if (daysSinceCreated < 7) {
    priority += 1;
  }
  
  return Math.min(priority, 5);
}

async function analyzeAllFeedback() {
  const threads = await fetchSiteFeedbackPosts();
  const allIssues = [];
  
  console.log('\n📝 Analyzing feedback content...');
  
  for (const thread of threads) {
    const threadIssues = [];
    
    // Analyze thread title
    const titleIssues = analyzePostContent(thread.title, thread.title);
    threadIssues.push(...titleIssues);
    
    // Analyze all posts in thread
    for (const post of thread.forum_posts) {
      const postIssues = analyzePostContent(post.content, thread.title);
      threadIssues.push(...postIssues);
    }
    
    if (threadIssues.length > 0) {
      // Remove duplicates and consolidate
      const uniqueIssues = threadIssues.filter((issue, index, self) =>
        index === self.findIndex(i => i.type === issue.type && i.pattern === issue.pattern)
      );
      
      allIssues.push({
        threadId: thread.id,
        title: thread.title,
        slug: thread.slug,
        createdAt: thread.created_at,
        postCount: thread.forum_posts.length,
        issues: uniqueIssues,
        priority: calculatePriority(thread, uniqueIssues),
        url: `https://teed.club/forum/site-feedback/${thread.slug}`
      });
    }
  }
  
  return allIssues;
}

function groupIssuesByType(allIssues) {
  const grouped = {
    edit_functionality: [],
    layout_issue: [],
    bug: [],
    ui_ux: []
  };
  
  for (const threadData of allIssues) {
    for (const issue of threadData.issues) {
      if (!grouped[issue.type]) {
        grouped[issue.type] = [];
      }
      
      grouped[issue.type].push({
        ...threadData,
        specificIssue: issue
      });
    }
  }
  
  return grouped;
}

function printResults(groupedIssues) {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 UNADDRESSED FORUM FEEDBACK ANALYSIS');
  console.log('='.repeat(60));
  
  let totalIssues = 0;
  
  // Print edit functionality issues first (highest priority)
  if (groupedIssues.edit_functionality.length > 0) {
    console.log('\n🚨 EDIT FUNCTIONALITY ISSUES (HIGH PRIORITY)');
    console.log('-'.repeat(50));
    groupedIssues.edit_functionality
      .sort((a, b) => b.priority - a.priority)
      .forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.title}`);
        console.log(`   Priority: ${item.priority}/5`);
        console.log(`   Pattern: "${item.specificIssue.pattern}"`);
        console.log(`   Description: ${item.specificIssue.description}`);
        console.log(`   Thread: ${item.url}`);
        console.log(`   Posts: ${item.postCount} | Created: ${new Date(item.createdAt).toLocaleDateString()}`);
        totalIssues++;
      });
  }
  
  // Layout issues
  if (groupedIssues.layout_issue.length > 0) {
    console.log('\n📐 LAYOUT/RESPONSIVE ISSUES');
    console.log('-'.repeat(50));
    groupedIssues.layout_issue
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5) // Top 5 layout issues
      .forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.title}`);
        console.log(`   Priority: ${item.priority}/5`);
        console.log(`   Pattern: "${item.specificIssue.pattern}"`);
        console.log(`   Description: ${item.specificIssue.description}`);
        console.log(`   Thread: ${item.url}`);
        totalIssues++;
      });
  }
  
  // General bugs
  if (groupedIssues.bug.length > 0) {
    console.log('\n🐛 GENERAL BUGS');
    console.log('-'.repeat(50));
    groupedIssues.bug
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5) // Top 5 bugs
      .forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.title}`);
        console.log(`   Priority: ${item.priority}/5`);
        console.log(`   Pattern: "${item.specificIssue.pattern}"`);
        console.log(`   Description: ${item.specificIssue.description}`);
        console.log(`   Thread: ${item.url}`);
        totalIssues++;
      });
  }
  
  // UI/UX issues
  if (groupedIssues.ui_ux.length > 0) {
    console.log('\n🎨 UI/UX IMPROVEMENTS');
    console.log('-'.repeat(50));
    groupedIssues.ui_ux
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3) // Top 3 UI/UX issues
      .forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.title}`);
        console.log(`   Priority: ${item.priority}/5`);
        console.log(`   Pattern: "${item.specificIssue.pattern}"`);
        console.log(`   Description: ${item.specificIssue.description}`);
        console.log(`   Thread: ${item.url}`);
        totalIssues++;
      });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 SUMMARY: Found ${totalIssues} unaddressed issues across ${Object.keys(groupedIssues).length} categories`);
  console.log('='.repeat(60));
  
  // Priority recommendations
  console.log('\n🎯 RECOMMENDED NEXT ACTIONS:');
  console.log('1. Fix edit functionality issues first (highest user impact)');
  console.log('2. Address top layout/responsive issues');
  console.log('3. Resolve critical bugs affecting user workflows');
  console.log('4. Implement UI/UX improvements for better user experience');
}

async function main() {
  try {
    console.log('🚀 Starting forum feedback analysis...');
    
    const allIssues = await analyzeAllFeedback();
    const groupedIssues = groupIssuesByType(allIssues);
    
    printResults(groupedIssues);
    
  } catch (error) {
    console.error('❌ Error analyzing feedback:', error.message);
    process.exit(1);
  }
}

main();