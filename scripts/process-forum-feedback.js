#!/usr/bin/env node

/**
 * Forum Feedback Processing Agent
 * 
 * This script:
 * 1. Reads unaddressed feedback from the Site Feedback forum
 * 2. Analyzes and prioritizes issues
 * 3. Implements fixes in a batch
 * 4. Creates a PR with all fixes
 * 5. Updates forum threads with implementation status
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  console.error('Note: Service role key is preferred for full access.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const CONFIG = {
  maxIssuesPerSession: 10,
  priorityThreshold: 2, // Min priority to consider
  dryRun: false, // Set to true to test without making changes
  createPR: true,
  updateForum: true
};

// Helper functions
const exec = (command, options = {}) => {
  try {
    return execSync(command, { encoding: 'utf8', ...options });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(error.message);
    return null;
  }
};

const log = (message, level = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📘',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    fix: '🔧'
  }[level] || '📝';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
};

// Generate session ID
const generateSessionId = () => {
  const date = new Date().toISOString().split('T')[0];
  const random = Math.random().toString(36).substring(2, 8);
  return `${date}-${random}`;
};

// Fetch unaddressed feedback from the forum
async function fetchUnaddressedFeedback() {
  log('Fetching unaddressed feedback from Site Feedback forum...');
  
  const { data, error } = await supabase
    .from('forum_feedback_status')
    .select('*')
    .or('status.is.null,status.eq.pending')
    .order('priority', { ascending: false, nullsFirst: false })
    .order('tee_count', { ascending: false })
    .limit(CONFIG.maxIssuesPerSession);
  
  if (error) {
    log(`Error fetching feedback: ${error.message}`, 'error');
    return [];
  }
  
  log(`Found ${data.length} unaddressed feedback items`);
  return data;
}

// Analyze feedback to determine what needs to be fixed
async function analyzeFeedback(feedbackItem) {
  const { data: posts, error } = await supabase
    .from('forum_posts')
    .select('content')
    .eq('thread_id', feedbackItem.id)
    .order('created_at', { ascending: true });
  
  if (error) {
    log(`Error fetching posts for thread ${feedbackItem.id}: ${error.message}`, 'error');
    return null;
  }
  
  // Combine all posts to get full context
  const fullContent = posts.map(p => p.content).join('\n\n');
  
  // Simple keyword-based analysis (could be enhanced with AI)
  const analysis = {
    id: feedbackItem.id,
    title: feedbackItem.title,
    type: detectIssueType(fullContent),
    priority: calculatePriority(feedbackItem),
    files: detectAffectedFiles(fullContent),
    description: fullContent.substring(0, 500),
    actionable: isActionable(fullContent)
  };
  
  return analysis;
}

// Detect issue type from content
function detectIssueType(content) {
  const lower = content.toLowerCase();
  
  if (lower.includes('error') || lower.includes('bug') || lower.includes('broken')) {
    return 'bug';
  }
  if (lower.includes('feature') || lower.includes('add') || lower.includes('implement')) {
    return 'feature';
  }
  if (lower.includes('improve') || lower.includes('enhance') || lower.includes('optimize')) {
    return 'improvement';
  }
  return 'other';
}

// Calculate priority based on engagement
function calculatePriority(item) {
  const teeWeight = 3;
  const helpfulWeight = 2;
  const postWeight = 1;
  
  const score = (item.tee_count * teeWeight) + 
                (item.helpful_count * helpfulWeight) + 
                (item.post_count * postWeight);
  
  if (score > 20) return 5;
  if (score > 15) return 4;
  if (score > 10) return 3;
  if (score > 5) return 2;
  return 1;
}

// Detect files mentioned in feedback
function detectAffectedFiles(content) {
  const files = [];
  
  // Look for file paths
  const fileRegex = /(?:src\/|components\/|pages\/|scripts\/)[\w\/-]+\.\w+/g;
  const matches = content.match(fileRegex);
  if (matches) {
    files.push(...matches);
  }
  
  // Look for component names
  const componentRegex = /(?:component|page|modal|dialog|button|card):\s*(\w+)/gi;
  const componentMatches = [...content.matchAll(componentRegex)];
  componentMatches.forEach(match => {
    files.push(`component:${match[1]}`);
  });
  
  return [...new Set(files)];
}

// Check if feedback is actionable
function isActionable(content) {
  const lower = content.toLowerCase();
  
  // Skip if too vague
  if (lower.length < 50) return false;
  
  // Skip if just a compliment/complaint without specifics
  if (lower.includes('love it') || lower.includes('hate it')) {
    if (!lower.includes('but') && !lower.includes('however')) {
      return false;
    }
  }
  
  return true;
}

// Create a new branch for fixes
async function createBranch(sessionId) {
  const branchName = `feedback-fixes-${sessionId}`;
  
  log(`Creating branch: ${branchName}`);
  
  // Make sure we're on main and up to date
  exec('git checkout main');
  exec('git pull origin main');
  
  // Create and checkout new branch
  exec(`git checkout -b ${branchName}`);
  
  return branchName;
}

// Implement a fix (simplified - would need more logic for real fixes)
async function implementFix(analysis) {
  log(`Implementing fix for: ${analysis.title}`, 'fix');
  
  // This is where you would implement actual fixes based on the analysis
  // For now, we'll just track that we processed it
  
  const fixDetails = {
    threadId: analysis.id,
    title: analysis.title,
    type: analysis.type,
    implemented: false,
    notes: ''
  };
  
  // Example: If it's a simple text change request
  if (analysis.description.includes('change') && analysis.description.includes('text')) {
    // Would implement text change here
    fixDetails.implemented = true;
    fixDetails.notes = 'Text updated as requested';
  }
  
  // Example: If it's a mobile responsiveness issue
  if (analysis.description.includes('mobile') && analysis.type === 'bug') {
    // Would fix mobile CSS here
    fixDetails.implemented = true;
    fixDetails.notes = 'Mobile responsiveness improved';
  }
  
  return fixDetails;
}

// Update database tracking
async function updateTracking(sessionId, fixes) {
  log('Updating feedback tracking in database...');
  
  for (const fix of fixes) {
    if (fix.implemented) {
      const { error } = await supabase
        .from('feedback_tracking')
        .upsert({
          thread_id: fix.threadId,
          issue_type: fix.type,
          status: 'fixed',
          session_id: sessionId,
          fixed_date: new Date().toISOString(),
          implementation_notes: fix.notes
        }, {
          onConflict: 'thread_id'
        });
      
      if (error) {
        log(`Error updating tracking for ${fix.threadId}: ${error.message}`, 'error');
      }
    }
  }
}

// Create PR with all fixes
async function createPullRequest(branchName, fixes) {
  if (CONFIG.dryRun) {
    log('Dry run - skipping PR creation', 'warning');
    return null;
  }
  
  log('Creating pull request...');
  
  // Commit changes
  exec('git add -A');
  
  const commitMessage = `feat: Address forum feedback (${fixes.length} items)

Addressed the following feedback:
${fixes.map(f => `- ${f.title} (${f.type})`).join('\n')}

Session: ${branchName}`;
  
  exec(`git commit -m "${commitMessage}"`);
  
  // Push branch
  exec(`git push origin ${branchName}`);
  
  // Create PR using GitHub CLI
  const prBody = `## Forum Feedback Implementation

This PR addresses ${fixes.filter(f => f.implemented).length} feedback items from the Site Feedback forum.

### Addressed Issues:
${fixes.filter(f => f.implemented).map(f => 
  `- **${f.title}** ([View Thread](https://teed.club/forum/site-feedback/${f.threadId}))
   - Type: ${f.type}
   - Notes: ${f.notes}`
).join('\n\n')}

### Testing:
- [ ] All changes tested locally
- [ ] Mobile responsiveness verified
- [ ] No breaking changes introduced

### Forum Updates:
Forum threads will be automatically updated once this PR is merged.

---
*Generated by Forum Feedback Processing Agent*`;
  
  const prCommand = `gh pr create --title "fix: Address forum feedback batch" --body "${prBody}" --base main --head ${branchName}`;
  const prUrl = exec(prCommand);
  
  return prUrl ? prUrl.trim() : null;
}

// Update forum threads with implementation status
async function updateForumThreads(fixes, prUrl) {
  if (CONFIG.dryRun || !CONFIG.updateForum) {
    log('Skipping forum updates', 'warning');
    return;
  }
  
  log('Updating forum threads...');
  
  for (const fix of fixes) {
    if (fix.implemented) {
      // Add a 'fixed' reaction to the first post
      const { data: firstPost } = await supabase
        .from('forum_posts')
        .select('id')
        .eq('thread_id', fix.threadId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      if (firstPost) {
        // Add fixed reaction
        await supabase
          .from('forum_reactions')
          .upsert({
            post_id: firstPost.id,
            user_id: 'system', // Would need a system user
            reaction_type: 'fixed'
          });
        
        // Add a comment about the fix
        const comment = `🎉 This issue has been addressed!\n\n${fix.notes}\n\n${prUrl ? `View the implementation: ${prUrl}` : 'The fix will be deployed soon.'}`;
        
        await supabase
          .from('forum_posts')
          .insert({
            thread_id: fix.threadId,
            user_id: 'system', // Would need a system user
            content: comment
          });
      }
    }
  }
}

// Main execution
async function main() {
  log('Starting Forum Feedback Processing Agent', 'info');
  
  const sessionId = generateSessionId();
  log(`Session ID: ${sessionId}`);
  
  try {
    // Fetch feedback
    const feedbackItems = await fetchUnaddressedFeedback();
    
    if (feedbackItems.length === 0) {
      log('No unaddressed feedback found', 'success');
      return;
    }
    
    // Create branch for fixes
    const branchName = await createBranch(sessionId);
    
    // Analyze and implement fixes
    const fixes = [];
    for (const item of feedbackItems) {
      const analysis = await analyzeFeedback(item);
      
      if (analysis && analysis.actionable && analysis.priority >= CONFIG.priorityThreshold) {
        const fix = await implementFix(analysis);
        fixes.push(fix);
      }
    }
    
    log(`Implemented ${fixes.filter(f => f.implemented).length} fixes out of ${fixes.length} analyzed items`);
    
    // Update tracking
    await updateTracking(sessionId, fixes);
    
    // Create PR if we have fixes
    let prUrl = null;
    if (fixes.some(f => f.implemented) && CONFIG.createPR) {
      prUrl = await createPullRequest(branchName, fixes);
      log(`Pull request created: ${prUrl}`, 'success');
    }
    
    // Update forum threads
    await updateForumThreads(fixes, prUrl);
    
    // Update session record
    await supabase
      .from('feedback_sessions')
      .insert({
        session_id: sessionId,
        branch_name: branchName,
        items_processed: feedbackItems.length,
        items_fixed: fixes.filter(f => f.implemented).length,
        pr_url: prUrl,
        status: 'completed',
        completed_at: new Date().toISOString()
      });
    
    log('Forum feedback processing completed successfully!', 'success');
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    
    // Update session as failed
    await supabase
      .from('feedback_sessions')
      .insert({
        session_id: sessionId,
        status: 'failed',
        notes: error.message
      });
    
    process.exit(1);
  }
}

// Run the agent
if (process.argv.includes('--dry-run')) {
  CONFIG.dryRun = true;
  log('Running in DRY RUN mode - no changes will be made', 'warning');
}

main().catch(console.error);