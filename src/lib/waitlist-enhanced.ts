/**
 * Enhanced Waitlist Module
 * Uses configuration-driven scoring engine
 */

import { z } from 'zod';
import { scoringEngine } from './scoring-engine';
import { scoringConfigLoader } from '@/config/scoring-config';

// Re-export existing schemas and types
export { 
  WaitlistAnswersSchema,
  type WaitlistAnswers,
  type Role,
  type SpendBracket,
  type Frequency
} from './waitlist';

// Import original validation
import { WaitlistAnswersSchema, WaitlistAnswers } from './waitlist';

// Enhanced score result with configuration metadata
export interface EnhancedScoreResult {
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
 * Enhanced scoring function that uses the configuration-driven engine
 * @param answers - The waitlist application answers
 * @param options - Optional scoring parameters
 * @returns Enhanced score result with metadata
 */
export async function scoreApplicationEnhanced(
  answers: WaitlistAnswers,
  options?: {
    includeProfile?: boolean;
    includeEquipment?: boolean;
    userEmail?: string;
    userId?: string;
  }
): Promise<EnhancedScoreResult> {
  // Fetch profile and equipment data if requested
  let profileData;
  let equipmentData;

  if (options?.includeProfile && options?.userEmail) {
    profileData = await scoringEngine.fetchProfileData(options.userEmail);
  }

  if (options?.includeEquipment && options?.userId) {
    equipmentData = await scoringEngine.fetchEquipmentData(options.userId);
  }

  // Score using the enhanced engine
  const result = await scoringEngine.scoreApplication(
    answers,
    profileData || undefined,
    equipmentData || undefined
  );

  return result;
}

/**
 * Check if an application should be auto-approved using dynamic configuration
 * @param score - The application score
 * @param currentApproved - Current number of approved users
 * @param betaCap - Maximum beta users allowed
 * @returns true if should auto-approve
 */
export async function shouldAutoApproveEnhanced(
  score: number,
  currentApproved: number,
  betaCap: number
): Promise<boolean> {
  return await scoringEngine.shouldAutoApprove(score, currentApproved, betaCap);
}

/**
 * Validate and parse waitlist submission data
 * @param data - Raw submission data
 * @returns Parsed and validated data or validation errors
 */
export function validateWaitlistSubmission(data: unknown) {
  try {
    const validated = WaitlistAnswersSchema.parse(data);
    return { success: true as const, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false as const, 
        errors: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      };
    }
    return { 
      success: false as const, 
      errors: [{ path: 'unknown', message: 'Validation failed' }]
    };
  }
}

/**
 * Get current scoring configuration
 * @returns Current configuration and metadata
 */
export async function getScoringConfiguration() {
  const config = await scoringConfigLoader.getConfig();
  const source = scoringConfigLoader.getSource();
  
  return {
    config,
    source,
    version: config.version,
    threshold: config.autoApproval.threshold,
    lastUpdated: config.metadata.lastUpdated
  };
}

/**
 * Calculate score distribution for a set of applications
 * @param applications - Array of waitlist applications
 * @returns Distribution statistics
 */
export async function calculateScoreDistribution(
  applications: WaitlistAnswers[]
): Promise<{
  mean: number;
  median: number;
  mode: number;
  min: number;
  max: number;
  distribution: Record<number, number>;
  autoApproveCount: number;
}> {
  const stats = await scoringEngine.getScoreDistribution(applications);
  const config = await scoringConfigLoader.getConfig();
  
  // Count how many would auto-approve
  const scores = await Promise.all(
    applications.map(app => scoringEngine.scoreApplication(app))
  );
  const autoApproveCount = scores.filter(
    s => s.cappedTotal >= config.autoApproval.threshold
  ).length;

  return {
    ...stats,
    autoApproveCount
  };
}

/**
 * Backward compatibility wrapper for existing code
 * Maps to original scoring function signature
 */
export async function scoreApplication(answers: WaitlistAnswers) {
  const result = await scoreApplicationEnhanced(answers);
  
  // Return in original format for backward compatibility
  return {
    total: result.total,
    breakdown: {
      role: result.breakdown.role,
      shareChannels: result.breakdown.shareChannels,
      learnChannels: result.breakdown.learnChannels,
      uses: result.breakdown.uses,
      buyFrequency: result.breakdown.buyFrequency,
      shareFrequency: result.breakdown.shareFrequency,
      location: result.breakdown.location,
      inviteCode: result.breakdown.inviteCode
    },
    cappedTotal: result.cappedTotal
  };
}

/**
 * Backward compatibility wrapper for auto-approval check
 */
export async function shouldAutoApprove(
  score: number,
  currentApproved: number,
  betaCap: number
): Promise<boolean> {
  return await shouldAutoApproveEnhanced(score, currentApproved, betaCap);
}