#!/usr/bin/env node

/**
 * Seed Beta Test Data
 * Creates realistic test data for beta testing
 * ONLY for use in development/staging environments
 */

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Configuration
const TEST_DATA_CONFIG = {
  applications: 200,        // Number of test applications
  highScoreRatio: 0.3,     // 30% high scorers
  referralRatio: 0.4,      // 40% have referrals
  approvedRatio: 0.2,      // 20% pre-approved
  profileCompletionRatio: 0.6  // 60% have complete profiles
};

// Test data generators
const GOLF_ROLES = [
  'golfer',
  'fitter_builder',
  'creator',
  'league_captain',
  'industry_professional',
  'course_owner'
];

const CITIES = [
  'Austin, TX',
  'Scottsdale, AZ',
  'San Diego, CA',
  'Orlando, FL',
  'Charlotte, NC',
  'Denver, CO',
  'Seattle, WA',
  'Portland, OR',
  'Miami, FL',
  'Nashville, TN'
];

const HANDICAPS = [
  'Scratch',
  '+2',
  '5',
  '10',
  '15',
  '20',
  '25',
  '30+'
];

const ACHIEVEMENTS = [
  'Broke 80 for the first time',
  'Hole in one at local course',
  'Won club championship',
  'Played 100 rounds this year',
  'Eagle on a par 5',
  'Shot my personal best',
  'Qualified for state amateur',
  'Completed a golf trip to Scotland'
];

function generateTestApplication(index, referrerIds = []) {
  const isHighScore = Math.random() < TEST_DATA_CONFIG.highScoreRatio;
  const hasReferral = Math.random() < TEST_DATA_CONFIG.referralRatio && referrerIds.length > 0;
  const isComplete = Math.random() < TEST_DATA_CONFIG.profileCompletionRatio;
  
  // Generate role with bias towards higher scoring roles
  const role = isHighScore 
    ? faker.helpers.arrayElement(['fitter_builder', 'creator', 'league_captain'])
    : faker.helpers.arrayElement(GOLF_ROLES);
  
  // Calculate score based on role and completeness
  const roleScores = {
    fitter_builder: 3,
    creator: 2,
    league_captain: 1,
    golfer: 0,
    industry_professional: 3,
    course_owner: 3
  };
  
  let score = roleScores[role] || 0;
  if (isComplete) score += 1;
  if (hasReferral) score += 1;
  
  const email = `test-${index}-${faker.internet.email()}`;
  
  return {
    email,
    display_name: faker.person.fullName(),
    role,
    city_region: faker.helpers.arrayElement(CITIES),
    handicap: isComplete ? faker.helpers.arrayElement(HANDICAPS) : null,
    favorite_golfer: isComplete ? faker.helpers.arrayElement(['Tiger Woods', 'Rory McIlroy', 'Jordan Spieth', 'Brooks Koepka']) : null,
    best_achievement: isComplete ? faker.helpers.arrayElement(ACHIEVEMENTS) : null,
    why_join: faker.lorem.sentence(),
    social_media_handle: isComplete ? `@${faker.internet.userName()}` : null,
    referred_by: hasReferral ? faker.helpers.arrayElement(referrerIds) : null,
    score,
    status: 'pending',
    created_at: faker.date.recent({ days: 30 }),
    is_test_data: true  // Flag for easy cleanup
  };
}

async function clearTestData() {
  console.log(chalk.yellow('\n🧹 Clearing existing test data...'));
  
  try {
    // Delete test applications
    const { error: appError } = await supabase
      .from('waitlist_applications')
      .delete()
      .eq('is_test_data', true);
    
    if (appError) throw appError;
    
    // Delete test profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .like('email', 'test-%');
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.log(chalk.gray('  No test profiles to clear'));
    }
    
    console.log(chalk.green('  ✅ Test data cleared'));
  } catch (error) {
    console.error(chalk.red('  ❌ Error clearing test data:'), error.message);
    throw error;
  }
}

async function seedApplications() {
  console.log(chalk.blue(`\n📝 Creating ${TEST_DATA_CONFIG.applications} test applications...`));
  
  const applications = [];
  const referrerIds = [];
  
  // Create some initial applications to act as referrers
  for (let i = 0; i < 10; i++) {
    const app = generateTestApplication(i, []);
    applications.push(app);
    referrerIds.push(faker.string.uuid());
  }
  
  // Create remaining applications with potential referrals
  for (let i = 10; i < TEST_DATA_CONFIG.applications; i++) {
    const app = generateTestApplication(i, referrerIds);
    applications.push(app);
    
    // Occasionally add to referrer pool
    if (Math.random() < 0.1) {
      referrerIds.push(faker.string.uuid());
    }
  }
  
  // Insert in batches
  const batchSize = 50;
  for (let i = 0; i < applications.length; i += batchSize) {
    const batch = applications.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('waitlist_applications')
      .insert(batch);
    
    if (error) {
      console.error(chalk.red(`  ❌ Error inserting batch ${i / batchSize + 1}:`), error.message);
      throw error;
    }
    
    console.log(chalk.gray(`  Inserted ${i + batch.length}/${applications.length} applications`));
  }
  
  console.log(chalk.green(`  ✅ Created ${applications.length} test applications`));
  
  // Show distribution
  const highScorers = applications.filter(a => a.score >= 4).length;
  const withReferrals = applications.filter(a => a.referred_by).length;
  
  console.log(chalk.gray(`  Distribution:`));
  console.log(chalk.gray(`    - High scorers (≥4): ${highScorers}`));
  console.log(chalk.gray(`    - With referrals: ${withReferrals}`));
  console.log(chalk.gray(`    - Average score: ${(applications.reduce((sum, a) => sum + a.score, 0) / applications.length).toFixed(2)}`));
  
  return applications;
}

async function approveTestUsers(applications, count) {
  console.log(chalk.blue(`\n✅ Pre-approving ${count} test users...`));
  
  // Select high-scoring applications for approval
  const toApprove = applications
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(a => a.email);
  
  for (const email of toApprove) {
    const { error } = await supabase
      .from('waitlist_applications')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('email', email);
    
    if (error) {
      console.error(chalk.red(`  ❌ Error approving ${email}:`), error.message);
    }
  }
  
  console.log(chalk.green(`  ✅ Approved ${count} test users`));
}

async function createTestInviteCodes() {
  console.log(chalk.blue('\n🎟️  Creating test invite codes...'));
  
  const codes = [];
  
  for (let i = 0; i < 10; i++) {
    codes.push({
      code: `TEST${faker.string.alphanumeric(6).toUpperCase()}`,
      created_by: faker.string.uuid(),
      max_uses: faker.helpers.arrayElement([1, 3, 5]),
      uses: 0,
      expires_at: faker.date.future(),
      is_test_data: true
    });
  }
  
  const { error } = await supabase
    .from('invite_codes')
    .insert(codes);
  
  if (error) {
    console.error(chalk.red('  ❌ Error creating invite codes:'), error.message);
  } else {
    console.log(chalk.green(`  ✅ Created ${codes.length} test invite codes`));
    console.log(chalk.gray(`  Sample codes: ${codes.slice(0, 3).map(c => c.code).join(', ')}`));
  }
  
  return codes;
}

async function generateAnalytics() {
  console.log(chalk.blue('\n📊 Generating test analytics events...'));
  
  const events = [];
  const eventTypes = [
    'waitlist_viewed',
    'waitlist_submitted',
    'referral_link_copied',
    'invite_code_used',
    'beta_approved',
    'profile_completed'
  ];
  
  // Generate events for the last 30 days
  for (let i = 0; i < 100; i++) {
    events.push({
      event_name: faker.helpers.arrayElement(eventTypes),
      properties: {
        test_data: true,
        source: faker.helpers.arrayElement(['direct', 'referral', 'social', 'email']),
        user_agent: faker.internet.userAgent()
      },
      created_at: faker.date.recent({ days: 30 })
    });
  }
  
  // This assumes you have an analytics_events table
  const { error } = await supabase
    .from('analytics_events')
    .insert(events);
  
  if (error && error.code !== 'PGRST000') {
    console.log(chalk.gray('  Analytics events table not found - skipping'));
  } else if (error) {
    console.error(chalk.red('  ❌ Error creating analytics events:'), error.message);
  } else {
    console.log(chalk.green(`  ✅ Created ${events.length} test analytics events`));
  }
}

async function showSummary() {
  console.log(chalk.blue('\n📈 Test Data Summary:'));
  
  try {
    const { count: totalApps } = await supabase
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true })
      .eq('is_test_data', true);
    
    const { count: approved } = await supabase
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true })
      .eq('is_test_data', true)
      .eq('status', 'approved');
    
    const { count: highScorers } = await supabase
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true })
      .eq('is_test_data', true)
      .gte('score', 4);
    
    console.log(chalk.gray(`  Total test applications: ${totalApps || 0}`));
    console.log(chalk.gray(`  Approved: ${approved || 0}`));
    console.log(chalk.gray(`  High scorers: ${highScorers || 0}`));
    
  } catch (error) {
    console.error(chalk.red('  Error getting summary:'), error.message);
  }
}

// Main execution
async function main() {
  console.log(chalk.bold.blue('\n🚀 SEEDING BETA TEST DATA'));
  console.log(chalk.red.bold('⚠️  WARNING: Only run in development/staging!'));
  
  // Safety check
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error(chalk.red('\n❌ Cannot seed test data in production!'));
    console.error(chalk.red('Add --force flag if you really want to do this (not recommended)'));
    process.exit(1);
  }
  
  const clearFirst = process.argv.includes('--clear');
  const skipApprovals = process.argv.includes('--skip-approvals');
  
  try {
    if (clearFirst) {
      await clearTestData();
    }
    
    const applications = await seedApplications();
    
    if (!skipApprovals) {
      const approveCount = Math.floor(applications.length * TEST_DATA_CONFIG.approvedRatio);
      await approveTestUsers(applications, approveCount);
    }
    
    await createTestInviteCodes();
    await generateAnalytics();
    await showSummary();
    
    console.log(chalk.green.bold('\n✅ Test data seeded successfully!'));
    console.log(chalk.gray('Run "npm run beta:clean-test-data" to remove test data'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Fatal error:'), error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { clearTestData };