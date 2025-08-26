#!/usr/bin/env node

/**
 * Beta KPI Real-time Monitor
 * Displays live dashboard of beta metrics
 */

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import Table from 'cli-table3';
import blessed from 'blessed';
import contrib from 'blessed-contrib';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Configuration
const REFRESH_INTERVAL = parseInt(process.argv[2]) || 60; // seconds
const USE_SIMPLE_MODE = process.argv.includes('--simple');

// KPI Targets
const TARGETS = {
  activationRate: 0.8,      // 80% within 48h
  engagementRate: 0.6,       // 60% add equipment
  viralCoefficient: 0.5,     // K-factor
  retentionRate: 0.7,        // 7-day retention
  dailyContent: 100          // Items added per day
};

async function fetchCapacityMetrics() {
  const { data: flags } = await supabase
    .from('feature_flags')
    .select('beta_cap, approval_paused')
    .single();
  
  const { count: approved } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('beta_access', true)
    .is('deleted_at', null);
  
  return {
    capacity: flags?.beta_cap || 0,
    approved: approved || 0,
    remaining: (flags?.beta_cap || 0) - (approved || 0),
    paused: flags?.approval_paused || false,
    utilization: ((approved || 0) / (flags?.beta_cap || 1) * 100).toFixed(1)
  };
}

async function fetchQueueMetrics() {
  const { data: pending } = await supabase
    .from('waitlist_applications')
    .select('score')
    .eq('status', 'pending');
  
  const highScorers = pending?.filter(a => a.score >= 4).length || 0;
  const avgScore = pending?.length > 0 
    ? (pending.reduce((sum, a) => sum + a.score, 0) / pending.length).toFixed(2)
    : 0;
  
  // Today's applications
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count: todayCount } = await supabase
    .from('waitlist_applications')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString());
  
  return {
    pending: pending?.length || 0,
    highScorers,
    avgScore,
    todayApplications: todayCount || 0
  };
}

async function fetchEngagementMetrics() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  // Active users (logged in last 24h)
  const { count: activeToday } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('beta_access', true)
    .gte('last_seen_at', oneDayAgo);
  
  // Users with equipment
  const { count: withEquipment } = await supabase
    .from('user_bags')
    .select('user_id', { count: 'exact', head: true })
    .not('user_id', 'is', null);
  
  // Feed posts today
  const { count: postsToday } = await supabase
    .from('feed_posts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneDayAgo);
  
  // Equipment added today
  const { count: equipmentToday } = await supabase
    .from('equipment')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneDayAgo)
    .not('added_by_user_id', 'is', null);
  
  return {
    activeToday: activeToday || 0,
    withEquipment: withEquipment || 0,
    postsToday: postsToday || 0,
    equipmentToday: equipmentToday || 0
  };
}

async function fetchReferralMetrics() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  // Total referrals
  const { count: totalReferrals } = await supabase
    .from('waitlist_applications')
    .select('*', { count: 'exact', head: true })
    .not('referred_by', 'is', null);
  
  // Recent referrals
  const { count: recentReferrals } = await supabase
    .from('waitlist_applications')
    .select('*', { count: 'exact', head: true })
    .not('referred_by', 'is', null)
    .gte('created_at', oneWeekAgo);
  
  // Unique referrers
  const { data: referrers } = await supabase
    .from('waitlist_applications')
    .select('referred_by')
    .not('referred_by', 'is', null);
  
  const uniqueReferrers = new Set(referrers?.map(r => r.referred_by)).size;
  
  // Calculate K-factor (viral coefficient)
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('beta_access', true);
  
  const kFactor = totalUsers > 0 ? (totalReferrals / totalUsers).toFixed(2) : 0;
  
  return {
    totalReferrals: totalReferrals || 0,
    recentReferrals: recentReferrals || 0,
    uniqueReferrers,
    kFactor
  };
}

async function fetchConversionMetrics() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  // Applications this week
  const { data: weekApplications } = await supabase
    .from('waitlist_applications')
    .select('status')
    .gte('created_at', oneWeekAgo);
  
  const approved = weekApplications?.filter(a => a.status === 'approved').length || 0;
  const total = weekApplications?.length || 0;
  const conversionRate = total > 0 ? (approved / total * 100).toFixed(1) : 0;
  
  // Time to activation (first bag creation)
  // This would need a more complex query in production
  
  return {
    weeklyApplications: total,
    weeklyApprovals: approved,
    conversionRate,
    avgTimeToActivation: 'N/A' // Would need additional tracking
  };
}

function displaySimpleMetrics(metrics) {
  console.clear();
  console.log(chalk.bold.blue('\n🎯 TEED.CLUB BETA KPIs'));
  console.log(chalk.gray(`Last updated: ${new Date().toLocaleTimeString()}`));
  console.log(chalk.gray(`Refreshing every ${REFRESH_INTERVAL} seconds\n`));
  
  // Capacity Table
  const capacityTable = new Table({
    head: ['Metric', 'Value', 'Status'],
    colWidths: [25, 20, 15]
  });
  
  capacityTable.push(
    ['Beta Capacity', `${metrics.capacity.approved}/${metrics.capacity.capacity}`, 
     metrics.capacity.utilization > 90 ? chalk.red('CRITICAL') : 
     metrics.capacity.utilization > 80 ? chalk.yellow('WARNING') : chalk.green('OK')],
    ['Utilization', `${metrics.capacity.utilization}%`, ''],
    ['Remaining Spots', metrics.capacity.remaining, ''],
    ['Approvals', metrics.capacity.paused ? chalk.red('PAUSED') : chalk.green('ACTIVE'), '']
  );
  
  console.log(chalk.blue.bold('📊 Capacity'));
  console.log(capacityTable.toString());
  
  // Queue Table
  const queueTable = new Table({
    head: ['Metric', 'Value'],
    colWidths: [25, 20]
  });
  
  queueTable.push(
    ['Pending Applications', metrics.queue.pending],
    ['High Scorers (≥4)', metrics.queue.highScorers],
    ['Average Score', metrics.queue.avgScore],
    ["Today's Applications", metrics.queue.todayApplications]
  );
  
  console.log(chalk.blue.bold('\n📋 Queue'));
  console.log(queueTable.toString());
  
  // Engagement Table
  const engagementTable = new Table({
    head: ['Metric', 'Value', 'vs Target'],
    colWidths: [25, 20, 15]
  });
  
  const engagementRate = metrics.capacity.approved > 0 
    ? (metrics.engagement.withEquipment / metrics.capacity.approved * 100).toFixed(1)
    : 0;
  
  engagementTable.push(
    ['Active Today', metrics.engagement.activeToday, ''],
    ['With Equipment', `${metrics.engagement.withEquipment} (${engagementRate}%)`,
     engagementRate >= TARGETS.engagementRate * 100 ? chalk.green('✓') : chalk.yellow('↓')],
    ['Posts Today', metrics.engagement.postsToday, ''],
    ['Equipment Added Today', metrics.engagement.equipmentToday,
     metrics.engagement.equipmentToday >= TARGETS.dailyContent ? chalk.green('✓') : chalk.yellow('↓')]
  );
  
  console.log(chalk.blue.bold('\n💡 Engagement'));
  console.log(engagementTable.toString());
  
  // Referral Table
  const referralTable = new Table({
    head: ['Metric', 'Value', 'vs Target'],
    colWidths: [25, 20, 15]
  });
  
  referralTable.push(
    ['Total Referrals', metrics.referral.totalReferrals, ''],
    ['Recent (7 days)', metrics.referral.recentReferrals, ''],
    ['Unique Referrers', metrics.referral.uniqueReferrers, ''],
    ['K-Factor', metrics.referral.kFactor,
     metrics.referral.kFactor >= TARGETS.viralCoefficient ? chalk.green('✓') : chalk.yellow('↓')]
  );
  
  console.log(chalk.blue.bold('\n🔗 Referrals'));
  console.log(referralTable.toString());
  
  // Conversion Table
  const conversionTable = new Table({
    head: ['Metric', 'Value'],
    colWidths: [25, 20]
  });
  
  conversionTable.push(
    ['Weekly Applications', metrics.conversion.weeklyApplications],
    ['Weekly Approvals', metrics.conversion.weeklyApprovals],
    ['Conversion Rate', `${metrics.conversion.conversionRate}%`]
  );
  
  console.log(chalk.blue.bold('\n🎯 Conversion'));
  console.log(conversionTable.toString());
  
  // Health Summary
  console.log(chalk.blue.bold('\n📈 Health Summary'));
  
  const issues = [];
  if (metrics.capacity.utilization > 90) issues.push(chalk.red('⚠️  Capacity critical'));
  if (metrics.referral.kFactor < TARGETS.viralCoefficient) issues.push(chalk.yellow('⚠️  Low viral coefficient'));
  if (engagementRate < TARGETS.engagementRate * 100) issues.push(chalk.yellow('⚠️  Low engagement'));
  
  if (issues.length === 0) {
    console.log(chalk.green('  ✅ All systems healthy'));
  } else {
    issues.forEach(issue => console.log(`  ${issue}`));
  }
  
  console.log(chalk.gray(`\nPress Ctrl+C to exit`));
}

function createDashboard() {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Teed.club Beta KPI Dashboard'
  });
  
  const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });
  
  // Capacity gauge
  const capacityGauge = grid.set(0, 0, 4, 3, contrib.gauge, {
    label: 'Beta Capacity',
    stroke: 'green',
    fill: 'white'
  });
  
  // Queue line chart
  const queueLine = grid.set(0, 3, 4, 6, contrib.line, {
    style: { line: 'yellow', text: 'green', baseline: 'black' },
    label: 'Application Queue',
    showLegend: true
  });
  
  // Referral donut
  const referralDonut = grid.set(0, 9, 4, 3, contrib.donut, {
    label: 'Referral Sources',
    radius: 8,
    arcWidth: 3
  });
  
  // Metrics table
  const metricsTable = grid.set(4, 0, 4, 6, contrib.table, {
    keys: true,
    fg: 'white',
    selectedFg: 'white',
    selectedBg: 'blue',
    label: 'Key Metrics',
    columnSpacing: 3,
    columnWidth: [20, 10, 10]
  });
  
  // Activity log
  const activityLog = grid.set(4, 6, 4, 6, contrib.log, {
    fg: 'green',
    selectedFg: 'green',
    label: 'Recent Activity'
  });
  
  // Error rate sparkline
  const errorSparkline = grid.set(8, 0, 4, 12, contrib.sparkline, {
    label: 'Error Rate',
    tags: true,
    style: { fg: 'blue' }
  });
  
  screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
  });
  
  return {
    screen,
    widgets: {
      capacityGauge,
      queueLine,
      referralDonut,
      metricsTable,
      activityLog,
      errorSparkline
    }
  };
}

async function updateDashboard(dashboard) {
  const metrics = await fetchAllMetrics();
  
  // Update capacity gauge
  dashboard.widgets.capacityGauge.setPercent(
    parseInt(metrics.capacity.utilization)
  );
  
  // Update metrics table
  dashboard.widgets.metricsTable.setData({
    headers: ['Metric', 'Value', 'Target'],
    data: [
      ['Active Users', metrics.engagement.activeToday.toString(), '-'],
      ['K-Factor', metrics.referral.kFactor, TARGETS.viralCoefficient.toString()],
      ['Conversion', `${metrics.conversion.conversionRate}%`, '-'],
      ['Queue Size', metrics.queue.pending.toString(), '-']
    ]
  });
  
  // Add to activity log
  dashboard.widgets.activityLog.log(`Update at ${new Date().toLocaleTimeString()}`);
  dashboard.widgets.activityLog.log(`New applications: ${metrics.queue.todayApplications}`);
  
  dashboard.screen.render();
}

async function fetchAllMetrics() {
  const [capacity, queue, engagement, referral, conversion] = await Promise.all([
    fetchCapacityMetrics(),
    fetchQueueMetrics(),
    fetchEngagementMetrics(),
    fetchReferralMetrics(),
    fetchConversionMetrics()
  ]);
  
  return {
    capacity,
    queue,
    engagement,
    referral,
    conversion
  };
}

// Main execution
async function main() {
  if (USE_SIMPLE_MODE) {
    // Simple text mode
    const update = async () => {
      try {
        const metrics = await fetchAllMetrics();
        displaySimpleMetrics(metrics);
      } catch (error) {
        console.error(chalk.red('Error fetching metrics:'), error.message);
      }
    };
    
    // Initial update
    await update();
    
    // Set up refresh interval
    setInterval(update, REFRESH_INTERVAL * 1000);
    
  } else {
    // Rich dashboard mode
    try {
      const dashboard = createDashboard();
      
      const update = async () => {
        try {
          await updateDashboard(dashboard);
        } catch (error) {
          dashboard.widgets.activityLog.log(`Error: ${error.message}`);
        }
      };
      
      // Initial update
      await update();
      
      // Set up refresh interval
      setInterval(update, REFRESH_INTERVAL * 1000);
      
      dashboard.screen.render();
      
    } catch (error) {
      console.error(chalk.red('Dashboard mode failed, falling back to simple mode'));
      console.error(error);
      process.argv.push('--simple');
      main();
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(chalk.blue.bold('Starting Beta KPI Monitor...'));
  console.log(chalk.gray(`Refresh interval: ${REFRESH_INTERVAL} seconds`));
  console.log(chalk.gray(`Mode: ${USE_SIMPLE_MODE ? 'Simple' : 'Dashboard'}\n`));
  
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export { fetchAllMetrics };