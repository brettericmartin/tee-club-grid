/**
 * Unit tests for waitlist library
 * Run with: node --loader ts-node/esm src/lib/__tests__/waitlist.test.ts
 * Or compile and run: npx tsc src/lib/__tests__/waitlist.test.ts && node src/lib/__tests__/waitlist.test.js
 */

import { 
  WaitlistAnswersSchema, 
  scoreApplication, 
  shouldAutoApprove,
  validateWaitlistSubmission,
  type WaitlistAnswers 
} from '../waitlist';

// Test helpers
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

function assertScore(
  answers: WaitlistAnswers, 
  expectedScore: number, 
  message: string
) {
  const result = scoreApplication(answers);
  assert(
    result.cappedTotal === expectedScore, 
    `${message} (expected ${expectedScore}, got ${result.cappedTotal})`
  );
}

// Base valid answer object
const baseAnswers: WaitlistAnswers = {
  role: 'golfer',
  share_channels: [],
  learn_channels: [],
  spend_bracket: '<300',
  uses: [],
  buy_frequency: 'never',
  share_frequency: 'never',
  display_name: 'Test User',
  city_region: 'New York',
  email: 'test@example.com',
  termsAccepted: true
};

// Test suite
async function runTests() {
  console.log('🧪 Running Waitlist Library Tests\n');
  
  // Schema Validation Tests
  console.log('📋 Schema Validation Tests');
  
  // Valid submission
  const validResult = validateWaitlistSubmission(baseAnswers);
  assert(validResult.success === true, 'Valid submission passes validation');
  
  // Invalid email
  const invalidEmail = { ...baseAnswers, email: 'not-an-email' };
  const emailResult = validateWaitlistSubmission(invalidEmail);
  assert(emailResult.success === false, 'Invalid email fails validation');
  
  // Short display name
  const shortName = { ...baseAnswers, display_name: '' };
  const nameResult = validateWaitlistSubmission(shortName);
  assert(nameResult.success === false, 'Empty display name fails validation');
  
  // Short city
  const shortCity = { ...baseAnswers, city_region: 'A' };
  const cityResult = validateWaitlistSubmission(shortCity);
  assert(cityResult.success === false, 'Single character city fails validation');
  
  console.log('');
  
  // Scoring Tests
  console.log('🎯 Scoring Algorithm Tests');
  
  // Test 1: Base score (should be 0)
  assertScore(baseAnswers, 0, 'Base answers score 0');
  
  // Test 2: Role scoring
  assertScore(
    { ...baseAnswers, role: 'fitter_builder' },
    3,
    'Fitter/builder role scores 3'
  );
  
  assertScore(
    { ...baseAnswers, role: 'creator' },
    2,
    'Creator role scores 2'
  );
  
  assertScore(
    { ...baseAnswers, role: 'league_captain' },
    1,
    'League captain role scores 1'
  );
  
  // Test 3: Share channels (cap at 2)
  assertScore(
    { ...baseAnswers, share_channels: ['reddit'] },
    1,
    'Reddit share channel scores 1'
  );
  
  assertScore(
    { ...baseAnswers, share_channels: ['golfwrx'] },
    1,
    'GolfWRX share channel scores 1'
  );
  
  assertScore(
    { ...baseAnswers, share_channels: ['instagram'] },
    1,
    'Instagram share channel scores 1'
  );
  
  assertScore(
    { ...baseAnswers, share_channels: ['reddit', 'golfwrx', 'instagram'] },
    2,
    'Multiple share channels cap at 2'
  );
  
  // Test 4: Learn channels (cap at 3)
  assertScore(
    { ...baseAnswers, learn_channels: ['youtube', 'reddit', 'fitter websites', 'manufacturer sites'] },
    3,
    'Multiple learn channels cap at 3'
  );
  
  // Test 5: Uses (cap at 2)
  assertScore(
    { ...baseAnswers, uses: ['discover gear', 'follow friends', 'track builds'] },
    2,
    'Multiple uses cap at 2'
  );
  
  // Test 6: Buy frequency
  assertScore(
    { ...baseAnswers, buy_frequency: 'few_per_year' },
    1,
    'Few per year buy frequency scores 1'
  );
  
  assertScore(
    { ...baseAnswers, buy_frequency: 'monthly' },
    2,
    'Monthly buy frequency scores 2'
  );
  
  assertScore(
    { ...baseAnswers, buy_frequency: 'weekly_plus' },
    2,
    'Weekly+ buy frequency scores 2'
  );
  
  // Test 7: Share frequency
  assertScore(
    { ...baseAnswers, share_frequency: 'few_per_year' },
    1,
    'Few per year share frequency scores 1'
  );
  
  assertScore(
    { ...baseAnswers, share_frequency: 'monthly' },
    2,
    'Monthly share frequency scores 2'
  );
  
  // Test 8: Phoenix metro bonus
  assertScore(
    { ...baseAnswers, city_region: 'Phoenix, AZ' },
    1,
    'Phoenix location scores 1'
  );
  
  assertScore(
    { ...baseAnswers, city_region: 'Scottsdale' },
    1,
    'Scottsdale location scores 1'
  );
  
  assertScore(
    { ...baseAnswers, city_region: 'Tempe, Arizona' },
    1,
    'Tempe location scores 1'
  );
  
  // Test 9: Invite code bonus
  assertScore(
    { ...baseAnswers, invite_code: 'ABC123' },
    2,
    'Invite code scores 2'
  );
  
  // Test 10: Maximum score (should cap at 10)
  const maxAnswers: WaitlistAnswers = {
    role: 'fitter_builder', // +3
    share_channels: ['reddit', 'golfwrx', 'instagram'], // +2 (capped)
    learn_channels: ['youtube', 'reddit', 'fitter sites', 'brand sites'], // +3 (capped)
    spend_bracket: '5000_plus', // +0
    uses: ['discover and deep-dive', 'follow friends', 'track builds'], // +2 (capped)
    buy_frequency: 'monthly', // +2
    share_frequency: 'weekly_plus', // +2
    display_name: 'Max Scorer',
    city_region: 'Scottsdale, AZ', // +1
    email: 'max@example.com',
    termsAccepted: true,
    invite_code: 'PREMIUM' // +2
  };
  
  const maxResult = scoreApplication(maxAnswers);
  console.log(`\n📊 Max score breakdown:`, maxResult.breakdown);
  console.log(`   Raw total: ${maxResult.total}`);
  assert(
    maxResult.cappedTotal === 10,
    `Maximum possible score caps at 10 (got ${maxResult.cappedTotal})`
  );
  
  console.log('');
  
  // Auto-approval Tests
  console.log('🚦 Auto-Approval Tests');
  
  assert(
    shouldAutoApprove(4, 50, 100) === true,
    'Score 4, under capacity → auto-approve'
  );
  
  assert(
    shouldAutoApprove(3, 50, 100) === false,
    'Score 3, under capacity → do not auto-approve'
  );
  
  assert(
    shouldAutoApprove(5, 100, 100) === false,
    'Score 5, at capacity → do not auto-approve'
  );
  
  assert(
    shouldAutoApprove(10, 99, 100) === true,
    'Score 10, one spot left → auto-approve'
  );
  
  console.log('');
  
  // Complex Scenario Tests
  console.log('🎭 Complex Scenario Tests');
  
  // Typical good candidate
  const goodCandidate: WaitlistAnswers = {
    role: 'creator',
    share_channels: ['instagram', 'youtube'],
    learn_channels: ['youtube', 'reddit'],
    spend_bracket: '1500_3000',
    uses: ['discover gear', 'share setup'],
    buy_frequency: 'few_per_year',
    share_frequency: 'monthly',
    display_name: 'Golf Creator',
    city_region: 'Los Angeles',
    email: 'creator@example.com',
    termsAccepted: true
  };
  
  const goodResult = scoreApplication(goodCandidate);
  console.log(`Good candidate score: ${goodResult.cappedTotal}`);
  assert(
    goodResult.cappedTotal >= 4,
    `Good candidate should auto-approve (score: ${goodResult.cappedTotal})`
  );
  
  // Edge case: All Phoenix cities
  const phoenixCities = ['Phoenix', 'Scottsdale', 'Tempe', 'Mesa', 'Chandler', 'Gilbert'];
  phoenixCities.forEach(city => {
    const phoenixAnswers = { ...baseAnswers, city_region: city };
    const result = scoreApplication(phoenixAnswers);
    assert(
      result.breakdown.location === 1,
      `${city} gets location bonus`
    );
  });
  
  console.log('\n✨ All tests passed!');
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});