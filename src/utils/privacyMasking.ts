/**
 * Privacy masking utilities for protecting user information
 * in public-facing features like leaderboards
 */

export type PrivacyMode = 'username_first' | 'name_only' | 'anonymous';

/**
 * Format a display name based on privacy settings
 */
export function formatDisplayName(
  displayName: string | null | undefined,
  username: string | null | undefined,
  privacyMode: PrivacyMode,
  fallback: string = 'Anonymous User'
): string {
  switch (privacyMode) {
    case 'anonymous':
      return fallback;
    
    case 'username_first':
      // Prefer username with @ prefix
      if (username) {
        return `@${username}`;
      }
      return displayName || fallback;
    
    case 'name_only':
      // Prefer display name
      if (displayName) {
        return displayName;
      }
      if (username) {
        return `@${username}`;
      }
      return fallback;
    
    default:
      return displayName || (username ? `@${username}` : fallback);
  }
}

/**
 * Get initials from a name for avatar placeholders
 */
export function getInitials(
  displayName: string | null | undefined,
  username: string | null | undefined,
  privacyMode: PrivacyMode
): string {
  if (privacyMode === 'anonymous') {
    return '?';
  }

  const name = displayName || username || '';
  
  if (!name) {
    return '?';
  }

  // If it's a username (starts with @ or no spaces), use first two characters
  if (name.startsWith('@') || !name.includes(' ')) {
    return name.slice(0, 2).toUpperCase();
  }

  // Otherwise, get first letter of first and last word
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Mask email addresses for privacy
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) return '***@***.***';
  
  const maskedLocal = localPart.length > 2 
    ? localPart[0] + '*'.repeat(Math.min(localPart.length - 2, 5)) + localPart[localPart.length - 1]
    : '*'.repeat(localPart.length);
  
  return `${maskedLocal}@${domain}`;
}

/**
 * Format a user rank with appropriate label
 */
export function formatRank(rank: number, isCurrentUser: boolean = false): string {
  if (isCurrentUser) {
    return `Your Rank: #${rank}`;
  }
  
  // Add ordinal suffix
  const suffix = getOrdinalSuffix(rank);
  return `${rank}${suffix}`;
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
export function getOrdinalSuffix(num: number): string {
  const lastDigit = num % 10;
  const lastTwoDigits = num % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return 'th';
  }
  
  switch (lastDigit) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Generate a consistent anonymous identifier for a user
 * Used for "User #1", "User #2" format
 */
export function getAnonymousIdentifier(
  rank: number,
  prefix: string = 'User'
): string {
  return `${prefix} #${rank}`;
}

/**
 * Determine if avatar should be shown based on privacy settings
 */
export function shouldShowAvatar(
  privacyMode: PrivacyMode,
  showAvatars: boolean,
  isCurrentUser: boolean = false
): boolean {
  // Always show for current user
  if (isCurrentUser) {
    return true;
  }
  
  // Never show in anonymous mode
  if (privacyMode === 'anonymous') {
    return false;
  }
  
  // Otherwise respect the showAvatars setting
  return showAvatars;
}

/**
 * Format referral count with appropriate label
 */
export function formatReferralCount(
  count: number,
  verbose: boolean = false
): string {
  if (verbose) {
    return count === 1 ? '1 referral' : `${count} referrals`;
  }
  return count.toString();
}

/**
 * Get trend arrow for leaderboard movement
 */
export function getTrendIndicator(
  trend?: 'up' | 'down' | 'same' | 'new',
  showRankChange: boolean = false,
  previousRank?: number,
  currentRank?: number
): string {
  if (!trend) return '';
  
  switch (trend) {
    case 'up':
      if (showRankChange && previousRank && currentRank) {
        const change = previousRank - currentRank;
        return `↑ ${change}`;
      }
      return '↑';
    
    case 'down':
      if (showRankChange && previousRank && currentRank) {
        const change = currentRank - previousRank;
        return `↓ ${change}`;
      }
      return '↓';
    
    case 'same':
      return '−';
    
    case 'new':
      return '✨';
    
    default:
      return '';
  }
}

/**
 * Get color class for trend indicator
 */
export function getTrendColorClass(trend?: 'up' | 'down' | 'same' | 'new'): string {
  switch (trend) {
    case 'up':
      return 'text-green-500';
    case 'down':
      return 'text-red-500';
    case 'same':
      return 'text-gray-500';
    case 'new':
      return 'text-yellow-500';
    default:
      return 'text-gray-400';
  }
}

/**
 * Format time period label
 */
export function formatTimePeriod(period: '7d' | '30d' | 'all'): string {
  switch (period) {
    case '7d':
      return 'Last 7 Days';
    case '30d':
      return 'Last 30 Days';
    case 'all':
      return 'All Time';
    default:
      return period;
  }
}