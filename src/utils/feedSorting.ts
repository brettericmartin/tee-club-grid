/**
 * Feed Sorting Algorithms
 * Based on industry standards (Reddit, Hacker News)
 */

export type FeedSortOption = 'new' | 'hot' | 'top';

/**
 * Calculate "hot" score for a post
 * Balances recency with engagement using logarithmic scaling
 * Based on Reddit's hot algorithm
 */
export function calculateHotScore(
  likes: number,
  comments: number,
  createdAt: Date | string
): number {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  
  // Engagement score with comment weighting
  // Comments are weighted 2x because they indicate deeper engagement
  const engagement = Math.max(likes + (comments * 2), 1);
  
  // Logarithmic scaling prevents extreme values from dominating
  const logEngagement = Math.log10(engagement);
  
  // Time component - posts get a boost based on how recent they are
  // Using epoch seconds divided by 45000 (~12.5 hours) for reasonable decay
  const epochSeconds = created.getTime() / 1000;
  const timeScore = epochSeconds / 45000;
  
  // Combine engagement and time
  // Sign preservation for edge cases
  const sign = engagement > 0 ? 1 : engagement < 0 ? -1 : 0;
  
  return (sign * logEngagement) + timeScore;
}

/**
 * Calculate "top" score for a post
 * Pure popularity with time decay
 * Similar to Hacker News algorithm
 */
export function calculateTopScore(
  likes: number,
  comments: number,
  createdAt: Date | string
): number {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  
  // Total engagement
  const engagement = likes + comments;
  
  // Age in hours
  const ageInMillis = Date.now() - created.getTime();
  const ageInHours = ageInMillis / (1000 * 60 * 60);
  
  // Apply gravity factor (1.5 provides good balance)
  // Adding 2 prevents division by very small numbers
  const gravity = Math.pow(ageInHours + 2, 1.5);
  
  // Score decreases over time
  return engagement / gravity;
}

/**
 * Sort feed posts based on selected algorithm
 */
export function sortFeedPosts<T extends {
  likes: number;
  commentCount?: number;
  timestamp: string;
}>(posts: T[], sortBy: FeedSortOption): T[] {
  const sorted = [...posts];
  
  switch (sortBy) {
    case 'new':
      // Simple chronological sort
      return sorted.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
    case 'hot':
      // Calculate hot scores and sort
      return sorted.sort((a, b) => {
        const scoreA = calculateHotScore(
          a.likes,
          a.commentCount || 0,
          a.timestamp
        );
        const scoreB = calculateHotScore(
          b.likes,
          b.commentCount || 0,
          b.timestamp
        );
        return scoreB - scoreA;
      });
      
    case 'top':
      // Calculate top scores and sort
      return sorted.sort((a, b) => {
        const scoreA = calculateTopScore(
          a.likes,
          a.commentCount || 0,
          a.timestamp
        );
        const scoreB = calculateTopScore(
          b.likes,
          b.commentCount || 0,
          b.timestamp
        );
        return scoreB - scoreA;
      });
      
    default:
      return sorted;
  }
}

/**
 * Get display label for sort option
 */
export function getSortLabel(sortBy: FeedSortOption): string {
  switch (sortBy) {
    case 'new':
      return 'New';
    case 'hot':
      return 'Hot';
    case 'top':
      return 'Top';
    default:
      return 'New';
  }
}

/**
 * Get description for sort option
 */
export function getSortDescription(sortBy: FeedSortOption): string {
  switch (sortBy) {
    case 'new':
      return 'Most recent posts';
    case 'hot':
      return 'Trending now';
    case 'top':
      return 'Most popular';
    default:
      return '';
  }
}