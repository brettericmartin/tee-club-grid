#!/usr/bin/env node

/**
 * Beta Rollout Status Check
 * Run daily to verify system health before processing approvals
 */

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Configuration
const CHECKS = {
  capacity: { warning: 0.8, critical: 0.9 },
  errorRate: { warning: 0.02, critical: 0.05 },
  approvalRate: { warning: 0.2, critical: 0.1 },
  responseTime: { warning: 1000, critical: 2000 }
};

async function checkCapacity() {
  console.log(chalk.blue('\n📊 Checking Beta Capacity...'));
  
  try {
    // Get current capacity settings
    const { data: flags, error: flagError } = await supabase
      .from('feature_flags')
      .select('beta_cap, approval_paused')
      .single();
    
    if (flagError) throw flagError;
    
    // Count approved users
    const { count: approved, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('beta_access', true)
      .is('deleted_at', null);
    
    if (countError) throw countError;
    
    const usage = approved / flags.beta_cap;
    const remaining = flags.beta_cap - approved;
    
    // Status output
    console.log(`  Capacity: ${approved}/${flags.beta_cap} (${(usage * 100).toFixed(1)}%)`);
    console.log(`  Remaining: ${remaining} spots`);
    console.log(`  Approvals: ${flags.approval_paused ? chalk.red('PAUSED') : chalk.green('ACTIVE')}`);
    
    // Warnings
    if (usage >= CHECKS.capacity.critical) {
      console.log(chalk.red('  ⚠️  CRITICAL: Capacity at ' + (usage * 100).toFixed(1) + '%'));
      return { status: 'critical', usage, remaining };
    } else if (usage >= CHECKS.capacity.warning) {
      console.log(chalk.yellow('  ⚠️  WARNING: Capacity at ' + (usage * 100).toFixed(1) + '%'));
      return { status: 'warning', usage, remaining };
    }
    
    console.log(chalk.green('  ✅ Capacity healthy'));
    return { status: 'ok', usage, remaining };
    
  } catch (error) {
    console.error(chalk.red('  ❌ Error checking capacity:'), error.message);
    return { status: 'error', error: error.message };
  }
}

async function checkQueueHealth() {
  console.log(chalk.blue('\n📋 Checking Waitlist Queue...'));
  
  try {
    // Get queue statistics
    const { data: stats, error } = await supabase.rpc('get_waitlist_stats');
    
    if (error) throw error;
    
    console.log(`  Total pending: ${stats.pending_count}`);
    console.log(`  Avg score: ${stats.avg_score?.toFixed(2) || 'N/A'}`);
    console.log(`  High scorers (≥4): ${stats.high_scorers}`);
    console.log(`  With referrals: ${stats.with_referrals}`);
    
    // Check today's activity
    const { data: todayStats, error: todayError } = await supabase
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
    
    if (todayError) throw todayError;
    
    console.log(`  Today's applications: ${todayStats.count || 0}`);
    
    console.log(chalk.green('  ✅ Queue healthy'));
    return { status: 'ok', ...stats };
    
  } catch (error) {
    console.error(chalk.red('  ❌ Error checking queue:'), error.message);
    return { status: 'error', error: error.message };
  }
}

async function checkApprovalRate() {
  console.log(chalk.blue('\n📈 Checking Approval Rates...'));
  
  try {
    // Get last 24 hours of approvals
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recent, error } = await supabase
      .from('waitlist_applications')
      .select('status')
      .gte('updated_at', yesterday);
    
    if (error) throw error;
    
    const approved = recent.filter(a => a.status === 'approved').length;
    const total = recent.length;
    const rate = total > 0 ? approved / total : 0;
    
    console.log(`  Last 24h: ${approved}/${total} (${(rate * 100).toFixed(1)}% approval rate)`);
    
    // Get auto-approval stats
    const { data: autoApproved, error: autoError } = await supabase
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('score', 4)
      .gte('updated_at', yesterday);
    
    if (!autoError) {
      console.log(`  Auto-approved: ${autoApproved.count || 0}`);
    }
    
    // Check if rate is healthy
    if (rate < CHECKS.approvalRate.critical) {
      console.log(chalk.red('  ⚠️  CRITICAL: Approval rate very low'));
      return { status: 'critical', rate };
    } else if (rate < CHECKS.approvalRate.warning) {
      console.log(chalk.yellow('  ⚠️  WARNING: Approval rate low'));
      return { status: 'warning', rate };
    }
    
    console.log(chalk.green('  ✅ Approval rate healthy'));
    return { status: 'ok', rate };
    
  } catch (error) {
    console.error(chalk.red('  ❌ Error checking approval rate:'), error.message);
    return { status: 'error', error: error.message };
  }
}

async function checkEmailService() {
  console.log(chalk.blue('\n📧 Checking Email Service...'));
  
  try {
    // Check if email service is configured
    if (!process.env.SENDGRID_API_KEY && !process.env.RESEND_API_KEY) {
      console.log(chalk.yellow('  ⚠️  No email service configured'));
      return { status: 'warning', message: 'No email service configured' };
    }
    
    // Could add actual email service health check here
    console.log(chalk.green('  ✅ Email service configured'));
    return { status: 'ok' };
    
  } catch (error) {
    console.error(chalk.red('  ❌ Error checking email service:'), error.message);
    return { status: 'error', error: error.message };
  }
}

async function checkScoringConfig() {
  console.log(chalk.blue('\n⚙️  Checking Scoring Configuration...'));
  
  try {
    const { data: flags, error } = await supabase
      .from('feature_flags')
      .select('scoring_config, auto_approval_enabled')
      .single();
    
    if (error) throw error;
    
    const config = flags.scoring_config || {};
    const threshold = config.autoApproval?.threshold || 4;
    
    console.log(`  Auto-approval: ${flags.auto_approval_enabled ? chalk.green('ENABLED') : chalk.yellow('DISABLED')}`);
    console.log(`  Threshold: ${threshold} points`);
    console.log(`  Email verification: ${config.autoApproval?.requireEmailVerification ? 'Required' : 'Not required'}`);
    
    // Validate config structure
    if (!config.weights || !config.autoApproval) {
      console.log(chalk.yellow('  ⚠️  Scoring config incomplete'));
      return { status: 'warning', config };
    }
    
    console.log(chalk.green('  ✅ Scoring config valid'));
    return { status: 'ok', config };
    
  } catch (error) {
    console.error(chalk.red('  ❌ Error checking scoring config:'), error.message);
    return { status: 'error', error: error.message };
  }
}

async function checkRecentErrors() {
  console.log(chalk.blue('\n🚨 Checking Recent Errors...'));
  
  try {
    // This would integrate with your error tracking service
    // For now, we'll check application logs
    
    const { data: recentErrors, error } = await supabase
      .from('error_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
    
    const errorCount = recentErrors?.count || 0;
    
    if (errorCount > 10) {
      console.log(chalk.red(`  ⚠️  High error rate: ${errorCount} errors in last hour`));
      return { status: 'critical', count: errorCount };
    } else if (errorCount > 5) {
      console.log(chalk.yellow(`  ⚠️  Elevated errors: ${errorCount} in last hour`));
      return { status: 'warning', count: errorCount };
    }
    
    console.log(chalk.green(`  ✅ Error rate normal (${errorCount} in last hour)`));
    return { status: 'ok', count: errorCount };
    
  } catch (error) {
    // Error log table might not exist yet
    console.log(chalk.gray('  ℹ️  Error tracking not configured'));
    return { status: 'unknown' };
  }
}

async function generateSummary(results) {
  console.log(chalk.blue('\n' + '='.repeat(50)));
  console.log(chalk.blue.bold('BETA ROLLOUT STATUS SUMMARY'));
  console.log(chalk.blue('='.repeat(50)));
  
  const criticalIssues = Object.values(results).filter(r => r.status === 'critical');
  const warnings = Object.values(results).filter(r => r.status === 'warning');
  
  if (criticalIssues.length > 0) {
    console.log(chalk.red.bold(`\n🚨 ${criticalIssues.length} CRITICAL ISSUES FOUND`));
    console.log(chalk.red('DO NOT PROCEED WITH APPROVALS'));
  } else if (warnings.length > 0) {
    console.log(chalk.yellow.bold(`\n⚠️  ${warnings.length} warnings found`));
    console.log(chalk.yellow('Review before proceeding'));
  } else {
    console.log(chalk.green.bold('\n✅ ALL SYSTEMS OPERATIONAL'));
    console.log(chalk.green('Safe to proceed with daily operations'));
  }
  
  // Recommendations
  console.log(chalk.blue('\n📝 Recommendations:'));
  
  if (results.capacity.remaining < 20) {
    console.log('  • Consider increasing beta capacity soon');
  }
  
  if (results.queue.high_scorers > 10) {
    console.log(`  • Process ${results.queue.high_scorers} high-scoring applications`);
  }
  
  if (results.approvalRate.rate < 0.3) {
    console.log('  • Review scoring thresholds - approval rate is low');
  }
  
  // Next steps
  console.log(chalk.blue('\n🎯 Next Steps:'));
  console.log('  1. Review any warnings above');
  console.log('  2. Run: npm run beta:process-approvals');
  console.log('  3. Monitor: npm run beta:monitor');
  
  return criticalIssues.length === 0;
}

// Main execution
async function main() {
  console.log(chalk.bold.blue('\n🚀 TEED.CLUB BETA ROLLOUT CHECK'));
  console.log(chalk.gray(`Started at: ${new Date().toLocaleString()}`));
  
  const results = {
    capacity: await checkCapacity(),
    queue: await checkQueueHealth(),
    approvalRate: await checkApprovalRate(),
    email: await checkEmailService(),
    scoring: await checkScoringConfig(),
    errors: await checkRecentErrors()
  };
  
  const canProceed = await generateSummary(results);
  
  // Exit with appropriate code
  process.exit(canProceed ? 0 : 1);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export { checkCapacity, checkQueueHealth, checkApprovalRate };