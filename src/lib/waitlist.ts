import { z } from 'zod';

/**
 * Waitlist form validation schemas and scoring logic
 */

// Enum schemas
const RoleSchema = z.enum([
  'golfer',
  'fitter_builder',
  'creator',
  'league_captain',
  'retailer_other'
]);

const SpendBracketSchema = z.enum([
  '<300',
  '300_750',
  '750_1500',
  '1500_3000',
  '3000_5000',
  '5000_plus'
]);

const FrequencySchema = z.enum([
  'never',
  'yearly_1_2',
  'few_per_year',
  'monthly',
  'weekly_plus'
]);

// Main waitlist answers schema
export const WaitlistAnswersSchema = z.object({
  role: RoleSchema,
  share_channels: z.array(z.string()),
  learn_channels: z.array(z.string()),
  spend_bracket: SpendBracketSchema,
  uses: z.array(z.string()),
  buy_frequency: FrequencySchema,
  share_frequency: FrequencySchema,
  display_name: z.string().min(1, 'Display name is required'),
  city_region: z.string().min(2, 'City/region must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  termsAccepted: z.boolean(),
  invite_code: z.string().optional(),
  contact_phone: z.string().optional() // Honeypot field
});

// Type exports
export type WaitlistAnswers = z.infer<typeof WaitlistAnswersSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type SpendBracket = z.infer<typeof SpendBracketSchema>;
export type Frequency = z.infer<typeof FrequencySchema>;

// Score result type
export interface ScoreResult {
  total: number;
  breakdown: {
    role: number;
    shareChannels: number;
    learnChannels: number;
    uses: number;
    buyFrequency: number;
    shareFrequency: number;
    location: number;
    inviteCode: number;
  };
  cappedTotal: number;
}

// Scoring weights and caps
const SCORING_WEIGHTS = {
  role: {
    fitter_builder: 3,
    creator: 2,
    league_captain: 1,
    golfer: 0,
    retailer_other: 0
  },
  shareChannels: {
    reddit: 1,
    golfwrx: 1,
    socialMedia: 1, // instagram/tiktok/youtube
    cap: 2
  },
  learnChannels: {
    youtube: 1,
    reddit: 1,
    fitterBuilder: 1,
    manufacturerSites: 1,
    cap: 3
  },
  uses: {
    discoverDeepDive: 1,
    followFriends: 1,
    trackBuilds: 1,
    cap: 2
  },
  buyFrequency: {
    never: 0,
    yearly_1_2: 0,
    few_per_year: 1,
    monthly: 2,
    weekly_plus: 2
  },
  shareFrequency: {
    never: 0,
    yearly_1_2: 0,
    few_per_year: 1,
    monthly: 2,
    weekly_plus: 2
  },
  location: {
    phoenixMetro: 1
  },
  inviteCode: {
    present: 2
  },
  totalCap: 10
} as const;

// Phoenix metro area cities regex
const PHOENIX_METRO_REGEX = /phoenix|scottsdale|tempe|mesa|chandler|gilbert/i;

/**
 * Score a waitlist application based on engagement potential
 * @param answers - The waitlist application answers
 * @returns ScoreResult with total score and breakdown
 */
export function scoreApplication(answers: WaitlistAnswers): ScoreResult {
  const breakdown = {
    role: 0,
    shareChannels: 0,
    learnChannels: 0,
    uses: 0,
    buyFrequency: 0,
    shareFrequency: 0,
    location: 0,
    inviteCode: 0
  };

  // Score role
  breakdown.role = SCORING_WEIGHTS.role[answers.role] || 0;

  // Score share channels (cap at 2)
  let shareScore = 0;
  const shareChannels = answers.share_channels.map(c => c.toLowerCase());
  
  if (shareChannels.includes('reddit')) {
    shareScore += SCORING_WEIGHTS.shareChannels.reddit;
  }
  if (shareChannels.includes('golfwrx')) {
    shareScore += SCORING_WEIGHTS.shareChannels.golfwrx;
  }
  if (shareChannels.some(c => ['instagram', 'tiktok', 'youtube'].includes(c))) {
    shareScore += SCORING_WEIGHTS.shareChannels.socialMedia;
  }
  breakdown.shareChannels = Math.min(shareScore, SCORING_WEIGHTS.shareChannels.cap);

  // Score learn channels (cap at 3)
  let learnScore = 0;
  const learnChannels = answers.learn_channels.map(c => c.toLowerCase());
  
  if (learnChannels.includes('youtube')) {
    learnScore += SCORING_WEIGHTS.learnChannels.youtube;
  }
  if (learnChannels.includes('reddit')) {
    learnScore += SCORING_WEIGHTS.learnChannels.reddit;
  }
  if (learnChannels.some(c => c.includes('fitter') || c.includes('builder'))) {
    learnScore += SCORING_WEIGHTS.learnChannels.fitterBuilder;
  }
  if (learnChannels.some(c => c.includes('manufacturer') || c.includes('brand'))) {
    learnScore += SCORING_WEIGHTS.learnChannels.manufacturerSites;
  }
  breakdown.learnChannels = Math.min(learnScore, SCORING_WEIGHTS.learnChannels.cap);

  // Score uses (cap at 2)
  let usesScore = 0;
  const uses = answers.uses.map(u => u.toLowerCase());
  
  if (uses.some(u => u.includes('discover') || u.includes('deep-dive') || u.includes('research'))) {
    usesScore += SCORING_WEIGHTS.uses.discoverDeepDive;
  }
  if (uses.some(u => u.includes('follow') || u.includes('friend'))) {
    usesScore += SCORING_WEIGHTS.uses.followFriends;
  }
  if (uses.some(u => u.includes('track') || u.includes('build'))) {
    usesScore += SCORING_WEIGHTS.uses.trackBuilds;
  }
  breakdown.uses = Math.min(usesScore, SCORING_WEIGHTS.uses.cap);

  // Score buy frequency
  breakdown.buyFrequency = SCORING_WEIGHTS.buyFrequency[answers.buy_frequency] || 0;

  // Score share frequency
  breakdown.shareFrequency = SCORING_WEIGHTS.shareFrequency[answers.share_frequency] || 0;

  // Score location (Phoenix metro bonus)
  if (PHOENIX_METRO_REGEX.test(answers.city_region)) {
    breakdown.location = SCORING_WEIGHTS.location.phoenixMetro;
  }

  // Score invite code
  if (answers.invite_code && answers.invite_code.length > 0) {
    breakdown.inviteCode = SCORING_WEIGHTS.inviteCode.present;
  }

  // Calculate total
  const total = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
  const cappedTotal = Math.min(total, SCORING_WEIGHTS.totalCap);

  return {
    total,
    breakdown,
    cappedTotal
  };
}

/**
 * Determine if an application should be auto-approved
 * @param score - The application score
 * @param currentApproved - Current number of approved users
 * @param betaCap - Maximum beta users allowed
 * @returns true if should auto-approve
 */
export function shouldAutoApprove(
  score: number,
  currentApproved: number,
  betaCap: number
): boolean {
  // Auto-approve if score >= 4 and under capacity
  return score >= 4 && currentApproved < betaCap;
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