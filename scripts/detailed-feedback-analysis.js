#!/usr/bin/env node

/**
 * Detailed Forum Feedback Analysis
 * 
 * This script reads all individual posts in the Site Feedback forum
 * to get a more granular view of user feedback and issues
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

async function fetchDetailedFeedback() {
  console.log('🔍 Fetching detailed Site Feedback posts...');
  
  const { data, error } = await supabase
    .from('forum_posts')
    .select(`
      id,
      content,
      created_at,
      profiles (
        display_name,
        username
      ),
      forum_threads!inner (
        id,
        title,
        slug,
        forum_categories!inner (
          slug
        )
      )
    `)
    .eq('forum_threads.forum_categories.slug', 'site-feedback')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching forum posts:', error.message);
    return [];
  }

  console.log(`📊 Found ${data.length} individual posts in Site Feedback`);
  return data;
}

function analyzeIndividualPost(post) {
  const content = post.content;
  const lowerContent = content.toLowerCase();
  
  const issues = [];
  
  // Look for specific mentions of "edit"
  if (lowerContent.includes('edit')) {
    if (lowerContent.includes("doesn't work") || 
        lowerContent.includes("not working") ||
        lowerContent.includes("broken") ||
        lowerContent.includes("can't") ||
        lowerContent.includes("cannot")) {
      issues.push({
        type: 'edit_functionality',
        severity: 'high',
        keywords: ['edit', 'broken'],
        excerpt: extractContext(content, 'edit', 100)
      });
    }
  }
  
  // Look for layout/mobile issues
  const layoutKeywords = ['mobile', 'responsive', 'layout', 'spacing', 'overflow', 'alignment', 'css', 'styling'];
  for (const keyword of layoutKeywords) {
    if (lowerContent.includes(keyword)) {
      issues.push({
        type: 'layout_issue',
        severity: 'medium',
        keywords: [keyword],
        excerpt: extractContext(content, keyword, 100)
      });
    }
  }
  
  // Look for UI/navigation issues
  const uiKeywords = ['navigation', 'menu', 'button', 'modal', 'popup', 'confusing', 'hard to use'];
  for (const keyword of uiKeywords) {
    if (lowerContent.includes(keyword)) {
      issues.push({
        type: 'ui_ux',
        severity: 'medium',
        keywords: [keyword],
        excerpt: extractContext(content, keyword, 100)
      });
    }
  }
  
  // Look for general bugs
  const bugKeywords = ['bug', 'error', 'broken', 'fails', 'not working', "doesn't work"];
  for (const keyword of bugKeywords) {
    if (lowerContent.includes(keyword)) {
      issues.push({
        type: 'bug',
        severity: 'high',
        keywords: [keyword],
        excerpt: extractContext(content, keyword, 100)
      });
    }
  }
  
  return issues;
}

function extractContext(content, keyword, maxLength = 100) {
  const lowerContent = content.toLowerCase();
  const keywordIndex = lowerContent.indexOf(keyword.toLowerCase());
  
  if (keywordIndex === -1) return content.substring(0, maxLength);
  
  const start = Math.max(0, keywordIndex - 50);
  const end = Math.min(content.length, keywordIndex + keyword.length + 50);
  
  let excerpt = content.substring(start, end);
  
  // Clean up the excerpt
  if (start > 0) excerpt = '...' + excerpt;
  if (end < content.length) excerpt = excerpt + '...';
  
  return excerpt.trim();
}

async function analyzeDetailedFeedback() {
  const posts = await fetchDetailedFeedback();
  const analyzedPosts = [];
  
  console.log('\n📝 Analyzing individual posts...');
  
  for (const post of posts) {
    const issues = analyzeIndividualPost(post);
    
    if (issues.length > 0) {
      analyzedPosts.push({
        postId: post.id,
        threadTitle: post.forum_threads.title,
        threadSlug: post.forum_threads.slug,
        author: post.profiles?.display_name || post.profiles?.username || 'Anonymous',
        createdAt: post.created_at,
        content: post.content,
        issues: issues,
        url: `https://teed.club/forum/site-feedback/${post.forum_threads.slug}`
      });
    }
  }
  
  return analyzedPosts;
}

function printDetailedResults(analyzedPosts) {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 DETAILED FORUM FEEDBACK ANALYSIS');
  console.log('='.repeat(70));
  
  // Group by issue type
  const byType = {
    edit_functionality: [],
    layout_issue: [],
    ui_ux: [],
    bug: []
  };
  
  for (const post of analyzedPosts) {
    for (const issue of post.issues) {
      byType[issue.type].push({
        ...post,
        specificIssue: issue
      });
    }
  }
  
  // Print edit issues first
  if (byType.edit_functionality.length > 0) {
    console.log('\n🚨 EDIT FUNCTIONALITY ISSUES');
    console.log('-'.repeat(50));
    byType.edit_functionality.forEach((item, index) => {
      console.log(`\n${index + 1}. Thread: ${item.threadTitle}`);
      console.log(`   Author: ${item.author}`);
      console.log(`   Date: ${new Date(item.createdAt).toLocaleDateString()}`);
      console.log(`   Keywords: ${item.specificIssue.keywords.join(', ')}`);
      console.log(`   Context: "${item.specificIssue.excerpt}"`);
      console.log(`   URL: ${item.url}`);
    });
  }
  
  // Print layout issues
  if (byType.layout_issue.length > 0) {
    console.log('\n📐 LAYOUT/RESPONSIVE ISSUES');
    console.log('-'.repeat(50));
    byType.layout_issue.forEach((item, index) => {
      console.log(`\n${index + 1}. Thread: ${item.threadTitle}`);
      console.log(`   Author: ${item.author}`);
      console.log(`   Date: ${new Date(item.createdAt).toLocaleDateString()}`);
      console.log(`   Keywords: ${item.specificIssue.keywords.join(', ')}`);
      console.log(`   Context: "${item.specificIssue.excerpt}"`);
      console.log(`   URL: ${item.url}`);
    });
  }
  
  // Print UI/UX issues
  if (byType.ui_ux.length > 0) {
    console.log('\n🎨 UI/UX ISSUES');
    console.log('-'.repeat(50));
    byType.ui_ux.forEach((item, index) => {
      console.log(`\n${index + 1}. Thread: ${item.threadTitle}`);
      console.log(`   Author: ${item.author}`);
      console.log(`   Date: ${new Date(item.createdAt).toLocaleDateString()}`);
      console.log(`   Keywords: ${item.specificIssue.keywords.join(', ')}`);
      console.log(`   Context: "${item.specificIssue.excerpt}"`);
      console.log(`   URL: ${item.url}`);
    });
  }
  
  // Print general bugs
  if (byType.bug.length > 0) {
    console.log('\n🐛 GENERAL BUGS');
    console.log('-'.repeat(50));
    byType.bug.forEach((item, index) => {
      console.log(`\n${index + 1}. Thread: ${item.threadTitle}`);
      console.log(`   Author: ${item.author}`);
      console.log(`   Date: ${new Date(item.createdAt).toLocaleDateString()}`);
      console.log(`   Keywords: ${item.specificIssue.keywords.join(', ')}`);
      console.log(`   Context: "${item.specificIssue.excerpt}"`);
      console.log(`   URL: ${item.url}`);
    });
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📄 FULL POST CONTENTS');
  console.log('='.repeat(70));
  
  analyzedPosts.forEach((post, index) => {
    console.log(`\n${index + 1}. ${post.threadTitle} - by ${post.author}`);
    console.log(`   Date: ${new Date(post.createdAt).toLocaleDateString()}`);
    console.log(`   Content: "${post.content}"`);
    console.log(`   Detected Issues: ${post.issues.map(i => i.type).join(', ')}`);
  });
  
  console.log('\n' + '='.repeat(70));
  const totalUniqueIssues = Object.values(byType).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`📊 SUMMARY: Found ${totalUniqueIssues} issue mentions in ${analyzedPosts.length} posts`);
  console.log('='.repeat(70));
}

async function main() {
  try {
    console.log('🚀 Starting detailed forum feedback analysis...');
    
    const analyzedPosts = await analyzeDetailedFeedback();
    
    if (analyzedPosts.length === 0) {
      console.log('\n✅ No unaddressed issues found in forum feedback');
      return;
    }
    
    printDetailedResults(analyzedPosts);
    
  } catch (error) {
    console.error('❌ Error analyzing feedback:', error.message);
    process.exit(1);
  }
}

main();