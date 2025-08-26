/**
 * Scoring Engine
 * Configuration-driven scoring system for waitlist applications
 */

import { 
  ScoringConfig, 
  ScoringWeights, 
  scoringConfigLoader 
} from '@/config/scoring-config';
import { WaitlistAnswers } from './waitlist';
import { supabase } from './supabase';

// Profile completion data
export interface ProfileData {
  userId?: string;
  email: string;
  displayName?: string;
  bio?: string;
  location?: string;
  handicap?: number;
  favoriteClub?: string;
  profilePhotoUrl?: string;
  completionPercentage?: number;
}

// Equipment engagement data
export interface EquipmentData {
  itemCount: number;
  hasPhotos: boolean;
  uniqueBrands: number;
  totalValue?: number;
}

// Extended score result with detailed breakdown
export interface ExtendedScoreResult {
  total: number;
  cappedTotal: number;
  breakdown: {
    role: number;
    shareChannels: number;
    learnChannels: number;
    uses: number;
    buyFrequency: number;
    shareFrequency: number;
    location: number;
    inviteCode: number;
    profileCompletion: number;
    equipmentEngagement: number;
  };
  metadata: {
    configVersion: string;
    configSource: string;
    scoredAt: string;
    autoApproveEligible: boolean;
    profileCompletionPercentage?: number;
    equipmentCount?: number;
  };
}

/**
 * Main scoring engine class
 */
export class ScoringEngine {
  private config: ScoringConfig | null = null;
  private phoenixMetroRegex = /phoenix|scottsdale|tempe|mesa|chandler|gilbert|glendale|peoria|surprise|avondale|goodyear|buckeye/i;

  /**
   * Score a waitlist application with optional profile and equipment data
   */
  public async scoreApplication(
    answers: WaitlistAnswers,
    profileData?: ProfileData,
    equipmentData?: EquipmentData
  ): Promise<ExtendedScoreResult> {
    // Load configuration
    this.config = await scoringConfigLoader.getConfig();
    const weights = this.config.weights;

    // Initialize breakdown
    const breakdown = {
      role: 0,
      shareChannels: 0,
      learnChannels: 0,
      uses: 0,
      buyFrequency: 0,
      shareFrequency: 0,
      location: 0,
      inviteCode: 0,
      profileCompletion: 0,
      equipmentEngagement: 0
    };

    // Score role
    breakdown.role = weights.role[answers.role] || 0;

    // Score share channels (with cap)
    breakdown.shareChannels = this.scoreShareChannels(answers.share_channels, weights);

    // Score learn channels (with cap)
    breakdown.learnChannels = this.scoreLearnChannels(answers.learn_channels, weights);

    // Score uses (with cap)
    breakdown.uses = this.scoreUses(answers.uses, weights);

    // Score buy frequency
    breakdown.buyFrequency = weights.buyFrequency[answers.buy_frequency] || 0;

    // Score share frequency
    breakdown.shareFrequency = weights.shareFrequency[answers.share_frequency] || 0;

    // Score location
    breakdown.location = this.scoreLocation(answers.city_region, weights);

    // Score invite code
    breakdown.inviteCode = this.scoreInviteCode(answers.invite_code, weights);

    // Score profile completion (if data provided)
    if (profileData) {
      breakdown.profileCompletion = await this.scoreProfileCompletion(profileData, weights);
    }

    // Score equipment engagement (if data provided)
    if (equipmentData) {
      breakdown.equipmentEngagement = this.scoreEquipmentEngagement(equipmentData, weights);
    }

    // Calculate totals
    const total = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
    const cappedTotal = Math.min(total, weights.totalCap);

    // Check auto-approval eligibility
    const autoApproveEligible = cappedTotal >= this.config.autoApproval.threshold;

    return {
      total,
      cappedTotal,
      breakdown,
      metadata: {
        configVersion: this.config.version,
        configSource: scoringConfigLoader.getSource(),
        scoredAt: new Date().toISOString(),
        autoApproveEligible,
        profileCompletionPercentage: profileData?.completionPercentage,
        equipmentCount: equipmentData?.itemCount
      }
    };
  }

  /**
   * Score share channels with cap
   */
  private scoreShareChannels(channels: string[], weights: ScoringWeights): number {
    let score = 0;
    const lowerChannels = channels.map(c => c.toLowerCase());

    if (lowerChannels.includes('reddit')) {
      score += weights.shareChannels.reddit;
    }
    if (lowerChannels.includes('golfwrx')) {
      score += weights.shareChannels.golfwrx;
    }
    if (lowerChannels.some(c => ['instagram', 'tiktok', 'youtube'].includes(c))) {
      score += weights.shareChannels.socialMedia;
    }

    return Math.min(score, weights.shareChannels.cap);
  }

  /**
   * Score learn channels with cap
   */
  private scoreLearnChannels(channels: string[], weights: ScoringWeights): number {
    let score = 0;
    const lowerChannels = channels.map(c => c.toLowerCase());

    if (lowerChannels.includes('youtube')) {
      score += weights.learnChannels.youtube;
    }
    if (lowerChannels.includes('reddit')) {
      score += weights.learnChannels.reddit;
    }
    if (lowerChannels.some(c => c.includes('fitter') || c.includes('builder'))) {
      score += weights.learnChannels.fitterBuilder;
    }
    if (lowerChannels.some(c => c.includes('manufacturer') || c.includes('brand'))) {
      score += weights.learnChannels.manufacturerSites;
    }

    return Math.min(score, weights.learnChannels.cap);
  }

  /**
   * Score platform uses with cap
   */
  private scoreUses(uses: string[], weights: ScoringWeights): number {
    let score = 0;
    const lowerUses = uses.map(u => u.toLowerCase());

    if (lowerUses.some(u => u.includes('discover') || u.includes('deep-dive') || u.includes('research'))) {
      score += weights.uses.discoverDeepDive;
    }
    if (lowerUses.some(u => u.includes('follow') || u.includes('friend'))) {
      score += weights.uses.followFriends;
    }
    if (lowerUses.some(u => u.includes('track') || u.includes('build'))) {
      score += weights.uses.trackBuilds;
    }

    return Math.min(score, weights.uses.cap);
  }

  /**
   * Score location (Phoenix metro bonus)
   */
  private scoreLocation(cityRegion: string, weights: ScoringWeights): number {
    if (this.phoenixMetroRegex.test(cityRegion)) {
      return weights.location.phoenixMetro;
    }
    return 0;
  }

  /**
   * Score invite code presence
   */
  private scoreInviteCode(inviteCode: string | undefined, weights: ScoringWeights): number {
    if (inviteCode && inviteCode.length > 0) {
      return weights.inviteCode.present;
    }
    return 0;
  }

  /**
   * Score profile completion
   */
  private async scoreProfileCompletion(profileData: ProfileData, weights: ScoringWeights): Promise<number> {
    // Calculate completion percentage if not provided
    let completionPercentage = profileData.completionPercentage;
    
    if (completionPercentage === undefined) {
      completionPercentage = this.calculateProfileCompletion(profileData);
    }

    // Award bonus if above threshold
    if (completionPercentage >= weights.profileCompletion.threshold) {
      return weights.profileCompletion.bonus;
    }

    return 0;
  }

  /**
   * Calculate profile completion percentage
   */
  private calculateProfileCompletion(profileData: ProfileData): number {
    const fields = [
      profileData.displayName,
      profileData.bio,
      profileData.location,
      profileData.handicap !== undefined,
      profileData.favoriteClub,
      profileData.profilePhotoUrl
    ];

    const completedFields = fields.filter(field => !!field).length;
    return Math.round((completedFields / fields.length) * 100);
  }

  /**
   * Score equipment engagement
   */
  private scoreEquipmentEngagement(equipmentData: EquipmentData, weights: ScoringWeights): number {
    let score = 0;

    // First item bonus
    if (equipmentData.itemCount > 0) {
      score += weights.equipmentEngagement.firstItem;
    }

    // Multiple items bonus
    if (equipmentData.itemCount >= weights.equipmentEngagement.multipleItemsThreshold) {
      score += weights.equipmentEngagement.multipleItemsBonus;
    }

    // Photo bonus
    if (equipmentData.hasPhotos) {
      score += weights.equipmentEngagement.photoBonus;
    }

    return score;
  }

  /**
   * Fetch profile data for scoring
   */
  public async fetchProfileData(email: string): Promise<ProfileData | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (error || !data) {
        return null;
      }

      return {
        userId: data.id,
        email: data.email,
        displayName: data.display_name,
        bio: data.bio,
        location: data.location,
        handicap: data.handicap,
        favoriteClub: data.favorite_club,
        profilePhotoUrl: data.avatar_url,
        completionPercentage: this.calculateProfileCompletion({
          email: data.email,
          displayName: data.display_name,
          bio: data.bio,
          location: data.location,
          handicap: data.handicap,
          favoriteClub: data.favorite_club,
          profilePhotoUrl: data.avatar_url
        })
      };
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
      return null;
    }
  }

  /**
   * Fetch equipment data for scoring
   */
  public async fetchEquipmentData(userId: string): Promise<EquipmentData | null> {
    try {
      // Get user's bag
      const { data: bagData, error: bagError } = await supabase
        .from('user_bags')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (bagError || !bagData) {
        return { itemCount: 0, hasPhotos: false, uniqueBrands: 0 };
      }

      // Get equipment in bag
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('bag_equipment')
        .select(`
          equipment:equipment_id (
            brand,
            model,
            photos:equipment_photos(id)
          )
        `)
        .eq('bag_id', bagData.id);

      if (equipmentError || !equipmentData) {
        return { itemCount: 0, hasPhotos: false, uniqueBrands: 0 };
      }

      const uniqueBrands = new Set(equipmentData.map((item: any) => item.equipment?.brand).filter(Boolean));
      const hasPhotos = equipmentData.some((item: any) => item.equipment?.photos?.length > 0);

      return {
        itemCount: equipmentData.length,
        hasPhotos,
        uniqueBrands: uniqueBrands.size
      };
    } catch (error) {
      console.error('Failed to fetch equipment data:', error);
      return null;
    }
  }

  /**
   * Check if score meets auto-approval threshold
   */
  public async shouldAutoApprove(
    score: number,
    currentApproved: number,
    betaCap: number
  ): Promise<boolean> {
    const config = await scoringConfigLoader.getConfig();
    
    // Check score threshold
    if (score < config.autoApproval.threshold) {
      return false;
    }

    // Check capacity with buffer
    const effectiveCapacity = betaCap - config.autoApproval.capacityBuffer;
    if (currentApproved >= effectiveCapacity) {
      return false;
    }

    return true;
  }

  /**
   * Simulate scoring with different configurations
   */
  public async simulateScoring(
    answers: WaitlistAnswers,
    testConfig: Partial<ScoringConfig>
  ): Promise<ExtendedScoreResult> {
    // Temporarily use test configuration
    const originalConfig = this.config;
    this.config = {
      ...await scoringConfigLoader.getConfig(),
      ...testConfig
    } as ScoringConfig;

    // Score with test configuration
    const result = await this.scoreApplication(answers);

    // Restore original configuration
    this.config = originalConfig;

    return result;
  }

  /**
   * Batch score multiple applications
   */
  public async batchScore(
    applications: WaitlistAnswers[]
  ): Promise<ExtendedScoreResult[]> {
    const results: ExtendedScoreResult[] = [];
    
    for (const app of applications) {
      // Try to fetch profile and equipment data
      const profileData = await this.fetchProfileData(app.email);
      const equipmentData = profileData?.userId 
        ? await this.fetchEquipmentData(profileData.userId)
        : null;

      const result = await this.scoreApplication(app, profileData || undefined, equipmentData || undefined);
      results.push(result);
    }

    return results;
  }

  /**
   * Get score distribution statistics
   */
  public async getScoreDistribution(
    applications: WaitlistAnswers[]
  ): Promise<{
    mean: number;
    median: number;
    mode: number;
    min: number;
    max: number;
    distribution: Record<number, number>;
  }> {
    const scores = await this.batchScore(applications);
    const values = scores.map(s => s.cappedTotal).sort((a, b) => a - b);

    // Calculate statistics
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const median = values[Math.floor(values.length / 2)];
    
    // Calculate mode
    const frequency: Record<number, number> = {};
    values.forEach(v => {
      frequency[v] = (frequency[v] || 0) + 1;
    });
    const mode = Number(Object.keys(frequency).reduce((a, b) => 
      frequency[a] > frequency[b] ? a : b
    ));

    return {
      mean: Math.round(mean * 10) / 10,
      median,
      mode,
      min: Math.min(...values),
      max: Math.max(...values),
      distribution: frequency
    };
  }
}

// Export singleton instance
export const scoringEngine = new ScoringEngine();