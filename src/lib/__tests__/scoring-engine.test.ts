/**
 * Comprehensive Test Suite for Scoring Engine
 * Tests configuration-driven scoring, edge cases, and data drift detection
 */

import { 
  scoringEngine,
  ScoringEngine,
  ProfileData,
  EquipmentData,
  ExtendedScoreResult
} from '../scoring-engine';
import { 
  ScoringConfig,
  DEFAULT_SCORING_CONFIG,
  scoringConfigLoader
} from '@/config/scoring-config';
import { WaitlistAnswers } from '../waitlist';

// Test helpers
class TestHelpers {
  static assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`❌ Assertion failed: ${message}`);
    }
    console.log(`✅ ${message}`);
  }

  static assertScore(
    result: ExtendedScoreResult,
    expectedScore: number,
    message: string
  ): void {
    this.assert(
      result.cappedTotal === expectedScore,
      `${message} (expected ${expectedScore}, got ${result.cappedTotal})`
    );
  }

  static assertInRange(
    value: number,
    min: number,
    max: number,
    message: string
  ): void {
    this.assert(
      value >= min && value <= max,
      `${message} (${value} should be between ${min} and ${max})`
    );
  }

  static createBaseAnswers(): WaitlistAnswers {
    return {
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
  }

  static createProfileData(overrides: Partial<ProfileData> = {}): ProfileData {
    return {
      email: 'test@example.com',
      displayName: 'Test User',
      bio: 'Golf enthusiast',
      location: 'New York',
      handicap: 15,
      favoriteClub: '7 Iron',
      profilePhotoUrl: 'https://example.com/photo.jpg',
      completionPercentage: 100,
      ...overrides
    };
  }

  static createEquipmentData(overrides: Partial<EquipmentData> = {}): EquipmentData {
    return {
      itemCount: 14,
      hasPhotos: true,
      uniqueBrands: 5,
      totalValue: 3000,
      ...overrides
    };
  }

  static async measurePerformance(
    fn: () => Promise<any>,
    iterations: number = 100
  ): Promise<{ avg: number; min: number; max: number }> {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    return {
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times)
    };
  }
}

// Test suites
class ScoringEngineTests {
  private engine: ScoringEngine;

  constructor() {
    this.engine = new ScoringEngine();
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Running Comprehensive Scoring Engine Tests\n');

    await this.testBasicScoring();
    await this.testConfigurationDriven();
    await this.testProfileBonus();
    await this.testEquipmentBonus();
    await this.testEdgeCases();
    await this.testDataDrift();
    await this.testPerformance();
    await this.testAutoApproval();
    await this.testSimulation();
    await this.testDistribution();

    console.log('\n✨ All tests passed!');
  }

  /**
   * Test basic scoring functionality
   */
  async testBasicScoring(): Promise<void> {
    console.log('📋 Basic Scoring Tests');

    const baseAnswers = TestHelpers.createBaseAnswers();

    // Test base score
    const baseResult = await this.engine.scoreApplication(baseAnswers);
    TestHelpers.assertScore(baseResult, 0, 'Base answers score 0');

    // Test role scoring
    const fitterAnswers = { ...baseAnswers, role: 'fitter_builder' as const };
    const fitterResult = await this.engine.scoreApplication(fitterAnswers);
    TestHelpers.assertScore(fitterResult, 3, 'Fitter/builder role scores 3');

    // Test invite code
    const inviteAnswers = { ...baseAnswers, invite_code: 'TEST123' };
    const inviteResult = await this.engine.scoreApplication(inviteAnswers);
    TestHelpers.assertScore(inviteResult, 2, 'Invite code scores 2');

    // Test Phoenix location
    const phoenixAnswers = { ...baseAnswers, city_region: 'Scottsdale, AZ' };
    const phoenixResult = await this.engine.scoreApplication(phoenixAnswers);
    TestHelpers.assertScore(phoenixResult, 1, 'Phoenix metro location scores 1');

    console.log('');
  }

  /**
   * Test configuration-driven scoring
   */
  async testConfigurationDriven(): Promise<void> {
    console.log('⚙️ Configuration-Driven Tests');

    const baseAnswers = TestHelpers.createBaseAnswers();
    
    // Test with modified configuration
    const customConfig: Partial<ScoringConfig> = {
      weights: {
        ...DEFAULT_SCORING_CONFIG.weights,
        role: {
          ...DEFAULT_SCORING_CONFIG.weights.role,
          golfer: 5 // Give golfers more points
        }
      }
    };

    const result = await this.engine.simulateScoring(baseAnswers, customConfig);
    TestHelpers.assertScore(result, 5, 'Custom config gives golfers 5 points');

    // Test with different cap
    const highCapConfig: Partial<ScoringConfig> = {
      weights: {
        ...DEFAULT_SCORING_CONFIG.weights,
        totalCap: 20
      }
    };

    const maxAnswers: WaitlistAnswers = {
      role: 'fitter_builder',
      share_channels: ['reddit', 'golfwrx', 'instagram'],
      learn_channels: ['youtube', 'reddit', 'fitter sites', 'brand sites'],
      spend_bracket: '5000_plus',
      uses: ['discover', 'follow friends', 'track builds'],
      buy_frequency: 'monthly',
      share_frequency: 'weekly_plus',
      display_name: 'Max Scorer',
      city_region: 'Phoenix, AZ',
      email: 'max@example.com',
      termsAccepted: true,
      invite_code: 'PREMIUM'
    };

    const highCapResult = await this.engine.simulateScoring(maxAnswers, highCapConfig);
    TestHelpers.assert(
      highCapResult.cappedTotal <= 20,
      `Score respects new cap (got ${highCapResult.cappedTotal})`
    );

    console.log('');
  }

  /**
   * Test profile completion bonus
   */
  async testProfileBonus(): Promise<void> {
    console.log('👤 Profile Completion Bonus Tests');

    const baseAnswers = TestHelpers.createBaseAnswers();

    // Test with complete profile
    const completeProfile = TestHelpers.createProfileData({
      completionPercentage: 100
    });
    const completeResult = await this.engine.scoreApplication(
      baseAnswers,
      completeProfile
    );
    TestHelpers.assert(
      completeResult.breakdown.profileCompletion === 1,
      'Complete profile gets bonus'
    );

    // Test with incomplete profile
    const incompleteProfile = TestHelpers.createProfileData({
      completionPercentage: 50,
      bio: undefined,
      profilePhotoUrl: undefined
    });
    const incompleteResult = await this.engine.scoreApplication(
      baseAnswers,
      incompleteProfile
    );
    TestHelpers.assert(
      incompleteResult.breakdown.profileCompletion === 0,
      'Incomplete profile gets no bonus'
    );

    // Test at threshold
    const thresholdProfile = TestHelpers.createProfileData({
      completionPercentage: 80
    });
    const thresholdResult = await this.engine.scoreApplication(
      baseAnswers,
      thresholdProfile
    );
    TestHelpers.assert(
      thresholdResult.breakdown.profileCompletion === 1,
      'Profile at 80% threshold gets bonus'
    );

    console.log('');
  }

  /**
   * Test equipment engagement bonus
   */
  async testEquipmentBonus(): Promise<void> {
    console.log('⛳ Equipment Engagement Bonus Tests');

    const baseAnswers = TestHelpers.createBaseAnswers();

    // Test with no equipment
    const noEquipment: EquipmentData = {
      itemCount: 0,
      hasPhotos: false,
      uniqueBrands: 0
    };
    const noEquipResult = await this.engine.scoreApplication(
      baseAnswers,
      undefined,
      noEquipment
    );
    TestHelpers.assert(
      noEquipResult.breakdown.equipmentEngagement === 0,
      'No equipment gets no bonus'
    );

    // Test with first item
    const firstItem: EquipmentData = {
      itemCount: 1,
      hasPhotos: false,
      uniqueBrands: 1
    };
    const firstResult = await this.engine.scoreApplication(
      baseAnswers,
      undefined,
      firstItem
    );
    TestHelpers.assert(
      firstResult.breakdown.equipmentEngagement === 1,
      'First equipment item gets 1 point'
    );

    // Test with multiple items and photos
    const fullBag: EquipmentData = {
      itemCount: 14,
      hasPhotos: true,
      uniqueBrands: 5
    };
    const fullResult = await this.engine.scoreApplication(
      baseAnswers,
      undefined,
      fullBag
    );
    TestHelpers.assert(
      fullResult.breakdown.equipmentEngagement === 4,
      'Full bag with photos gets maximum bonus (1 + 2 + 1)'
    );

    console.log('');
  }

  /**
   * Test edge cases
   */
  async testEdgeCases(): Promise<void> {
    console.log('🔍 Edge Case Tests');

    const baseAnswers = TestHelpers.createBaseAnswers();

    // Test with null/undefined values
    const nullAnswers = {
      ...baseAnswers,
      invite_code: undefined,
      city_region: ''
    };
    const nullResult = await this.engine.scoreApplication(nullAnswers);
    TestHelpers.assert(
      nullResult.cappedTotal >= 0,
      'Handles null/undefined values gracefully'
    );

    // Test with very long strings
    const longAnswers = {
      ...baseAnswers,
      city_region: 'Phoenix'.repeat(100),
      display_name: 'A'.repeat(1000)
    };
    const longResult = await this.engine.scoreApplication(longAnswers);
    TestHelpers.assert(
      longResult.breakdown.location === 1,
      'Handles long strings correctly'
    );

    // Test with special characters
    const specialAnswers = {
      ...baseAnswers,
      city_region: 'Phoenix!@#$%^&*()',
      email: 'test+special@example.com'
    };
    const specialResult = await this.engine.scoreApplication(specialAnswers);
    TestHelpers.assert(
      specialResult.breakdown.location === 1,
      'Handles special characters'
    );

    // Test case insensitivity
    const caseAnswers = {
      ...baseAnswers,
      city_region: 'PHOENIX',
      share_channels: ['Reddit', 'GOLFWRX']
    };
    const caseResult = await this.engine.scoreApplication(caseAnswers);
    TestHelpers.assert(
      caseResult.breakdown.location === 1,
      'Location is case insensitive'
    );
    TestHelpers.assert(
      caseResult.breakdown.shareChannels === 2,
      'Share channels are case insensitive'
    );

    console.log('');
  }

  /**
   * Test data drift detection
   */
  async testDataDrift(): Promise<void> {
    console.log('📊 Data Drift Detection Tests');

    // Create a set of consistent test cases
    const testCases: WaitlistAnswers[] = [
      TestHelpers.createBaseAnswers(),
      { ...TestHelpers.createBaseAnswers(), role: 'creator' },
      { ...TestHelpers.createBaseAnswers(), role: 'fitter_builder' },
      { ...TestHelpers.createBaseAnswers(), invite_code: 'TEST' },
      { ...TestHelpers.createBaseAnswers(), city_region: 'Phoenix' }
    ];

    // Score all test cases
    const baseline = await Promise.all(
      testCases.map(tc => this.engine.scoreApplication(tc))
    );

    // Re-score and check for drift
    const retest = await Promise.all(
      testCases.map(tc => this.engine.scoreApplication(tc))
    );

    for (let i = 0; i < baseline.length; i++) {
      TestHelpers.assert(
        baseline[i].cappedTotal === retest[i].cappedTotal,
        `Consistent scoring for test case ${i + 1}`
      );
    }

    // Test expected scores haven't drifted from known values
    const knownScores = [0, 2, 3, 2, 1];
    for (let i = 0; i < baseline.length; i++) {
      TestHelpers.assert(
        baseline[i].cappedTotal === knownScores[i],
        `Score matches expected value for test case ${i + 1}`
      );
    }

    console.log('');
  }

  /**
   * Test performance
   */
  async testPerformance(): Promise<void> {
    console.log('⚡ Performance Tests');

    const baseAnswers = TestHelpers.createBaseAnswers();

    // Test single scoring performance
    const singlePerf = await TestHelpers.measurePerformance(
      () => this.engine.scoreApplication(baseAnswers),
      100
    );
    
    TestHelpers.assert(
      singlePerf.avg < 10,
      `Single scoring avg time < 10ms (${singlePerf.avg.toFixed(2)}ms)`
    );

    // Test batch scoring performance
    const batchSize = 100;
    const batchAnswers = Array(batchSize).fill(baseAnswers);
    
    const batchPerf = await TestHelpers.measurePerformance(
      () => this.engine.batchScore(batchAnswers),
      10
    );
    
    const perItemTime = batchPerf.avg / batchSize;
    TestHelpers.assert(
      perItemTime < 5,
      `Batch scoring per item < 5ms (${perItemTime.toFixed(2)}ms)`
    );

    console.log('');
  }

  /**
   * Test auto-approval logic
   */
  async testAutoApproval(): Promise<void> {
    console.log('🚦 Auto-Approval Tests');

    // Test with score above threshold
    const shouldApprove = await this.engine.shouldAutoApprove(5, 50, 100);
    TestHelpers.assert(
      shouldApprove === true,
      'Score 5, under capacity → auto-approve'
    );

    // Test with score below threshold
    const shouldNotApprove = await this.engine.shouldAutoApprove(3, 50, 100);
    TestHelpers.assert(
      shouldNotApprove === false,
      'Score 3, under capacity → do not auto-approve'
    );

    // Test at capacity
    const atCapacity = await this.engine.shouldAutoApprove(10, 100, 100);
    TestHelpers.assert(
      atCapacity === false,
      'Score 10, at capacity → do not auto-approve'
    );

    // Test with capacity buffer (assuming buffer of 10)
    const withBuffer = await this.engine.shouldAutoApprove(10, 89, 100);
    TestHelpers.assert(
      withBuffer === true,
      'Score 10, under buffer threshold → auto-approve'
    );

    const atBuffer = await this.engine.shouldAutoApprove(10, 90, 100);
    TestHelpers.assert(
      atBuffer === false,
      'Score 10, at buffer threshold → do not auto-approve'
    );

    console.log('');
  }

  /**
   * Test simulation functionality
   */
  async testSimulation(): Promise<void> {
    console.log('🔬 Simulation Tests');

    const baseAnswers = TestHelpers.createBaseAnswers();

    // Simulate with different thresholds
    const thresholds = [3, 4, 5, 6];
    for (const threshold of thresholds) {
      const config: Partial<ScoringConfig> = {
        autoApproval: {
          ...DEFAULT_SCORING_CONFIG.autoApproval,
          threshold
        }
      };

      const result = await this.engine.simulateScoring(baseAnswers, config);
      TestHelpers.assert(
        result.metadata.autoApproveEligible === (result.cappedTotal >= threshold),
        `Simulation correctly determines eligibility for threshold ${threshold}`
      );
    }

    console.log('');
  }

  /**
   * Test score distribution
   */
  async testDistribution(): Promise<void> {
    console.log('📈 Score Distribution Tests');

    // Create diverse test data
    const applications: WaitlistAnswers[] = [
      { ...TestHelpers.createBaseAnswers(), role: 'golfer' },
      { ...TestHelpers.createBaseAnswers(), role: 'creator' },
      { ...TestHelpers.createBaseAnswers(), role: 'fitter_builder' },
      { ...TestHelpers.createBaseAnswers(), role: 'creator', invite_code: 'TEST' },
      { ...TestHelpers.createBaseAnswers(), role: 'fitter_builder', city_region: 'Phoenix' }
    ];

    const stats = await this.engine.getScoreDistribution(applications);

    TestHelpers.assert(
      stats.min >= 0,
      `Minimum score is non-negative (${stats.min})`
    );

    TestHelpers.assert(
      stats.max <= 10,
      `Maximum score respects cap (${stats.max})`
    );

    TestHelpers.assert(
      stats.mean >= stats.min && stats.mean <= stats.max,
      `Mean is between min and max (${stats.mean})`
    );

    TestHelpers.assert(
      Object.keys(stats.distribution).length > 0,
      'Distribution contains data'
    );

    console.log(`  Distribution stats: min=${stats.min}, max=${stats.max}, mean=${stats.mean}, median=${stats.median}`);
    console.log('');
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tests = new ScoringEngineTests();
  tests.runAllTests().catch(error => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
}

export { ScoringEngineTests, TestHelpers };