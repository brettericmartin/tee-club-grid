/**
 * Scoring utility for waitlist applications
 * Based on user engagement potential and platform fit
 */

export interface WaitlistAnswers {
  role: 'golfer' | 'industry' | 'media' | 'investor' | 'other';
  share_channels: Array<'instagram' | 'twitter' | 'youtube' | 'tiktok' | 'facebook' | 'threads' | 'none'>;
  learn_channels: Array<'instagram' | 'twitter' | 'youtube' | 'podcast' | 'newsletter' | 'forum' | 'none'>;
  spend_bracket: '$0-500' | '$500-2000' | '$2000-5000' | '$5000+';
  uses: Array<'track_bag' | 'share_setup' | 'discover_gear' | 'connect_golfers' | 'buy_sell' | 'get_deals'>;
  buy_frequency: 'monthly' | 'quarterly' | 'yearly' | 'rarely';
  share_frequency: 'daily' | 'weekly' | 'monthly' | 'rarely';
  terms_accepted?: boolean;
  email?: string;
  display_name?: string;
  city_region?: string;
}

/**
 * Calculate application score (0-10 scale)
 * Higher scores indicate users more likely to engage with and benefit the platform
 */
export function scoreApplication(answers: WaitlistAnswers): number {
  let score = 0;
  
  // Role scoring (0-2 points)
  const roleScores = {
    'golfer': 2,      // Core audience
    'industry': 2,    // High value connections
    'media': 1.5,     // Content creators
    'investor': 1,    // Potential partners
    'other': 0.5      // Unknown value
  };
  score += roleScores[answers.role] || 0;
  
  // Social sharing potential (0-2 points)
  const shareChannels = answers.share_channels.filter(c => c !== 'none');
  if (shareChannels.length >= 3) score += 2;
  else if (shareChannels.length >= 2) score += 1.5;
  else if (shareChannels.length >= 1) score += 1;
  else score += 0;
  
  // Learning/consumption channels (0-1 point)
  const learnChannels = answers.learn_channels.filter(c => c !== 'none');
  if (learnChannels.length >= 3) score += 1;
  else if (learnChannels.length >= 2) score += 0.75;
  else if (learnChannels.length >= 1) score += 0.5;
  
  // Spending bracket (0-2 points) - indicates serious golfers
  const spendScores = {
    '$0-500': 0.5,
    '$500-2000': 1,
    '$2000-5000': 1.5,
    '$5000+': 2
  };
  score += spendScores[answers.spend_bracket] || 0;
  
  // Platform usage intentions (0-1.5 points)
  const uses = answers.uses;
  if (uses.includes('share_setup') && uses.includes('connect_golfers')) score += 1.5;
  else if (uses.includes('share_setup')) score += 1;
  else if (uses.length >= 3) score += 0.75;
  else if (uses.length >= 1) score += 0.5;
  
  // Buying frequency (0-0.75 points) - engagement indicator
  const buyScores = {
    'monthly': 0.75,
    'quarterly': 0.5,
    'yearly': 0.25,
    'rarely': 0
  };
  score += buyScores[answers.buy_frequency] || 0;
  
  // Sharing frequency (0-0.75 points) - content creation potential
  const shareScores = {
    'daily': 0.75,
    'weekly': 0.5,
    'monthly': 0.25,
    'rarely': 0
  };
  score += shareScores[answers.share_frequency] || 0;
  
  // Round to 1 decimal place and cap at 10
  return Math.min(Math.round(score * 10) / 10, 10);
}

/**
 * Determine if application should be auto-approved
 * @param score Application score
 * @param currentApproved Current number of approved beta users
 * @param betaCap Maximum beta users allowed
 */
export function shouldAutoApprove(
  score: number, 
  currentApproved: number, 
  betaCap: number
): boolean {
  // Auto-approve if score >= 4 and under capacity
  return score >= 4 && currentApproved < betaCap;
}