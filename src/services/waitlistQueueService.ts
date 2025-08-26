/**
 * Service for managing waitlist queue position and status
 */

export interface QueuePosition {
  position: number;
  total_waiting: number;
  score: number;
  referral_count: number;
  estimated_days: number;
  wave_cap: number;
  wave_filled_today: number;
  ahead_of_you: number;
  behind_you: number;
  referral_boost: number;
  application_date: string;
  status: 'pending' | 'approved' | 'rejected';
  approval_wave?: number;
  last_movement?: {
    direction: 'up' | 'down' | 'none';
    spots: number;
    timestamp: string;
  };
}

export interface BetaSummary {
  cap: number;
  approved: number;
  approvedActive: number;
  approvedTotal: number;
  remaining: number;
  publicBetaEnabled: boolean;
  waitlistCount?: number;
  referralStats?: {
    totalReferrals: number;
    uniqueReferrers: number;
    acceptanceRate: number;
    averageChainDepth: number;
    topReferrers: Array<{
      username: string | null;
      display_name: string | null;
      count: number;
    }>;
  };
}

// Cache for queue position
let queueCache: {
  data: QueuePosition | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION = 30000; // 30 seconds

/**
 * Get the user's waitlist queue position
 */
export async function getQueuePosition(forceRefresh = false): Promise<QueuePosition | null> {
  // Check cache
  if (!forceRefresh && queueCache.data && Date.now() - queueCache.timestamp < CACHE_DURATION) {
    return queueCache.data;
  }
  
  try {
    const response = await fetch('/api/waitlist/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        // No application found
        return null;
      }
      throw new Error('Failed to fetch queue position');
    }
    
    const data = await response.json();
    
    // Update cache
    queueCache = {
      data,
      timestamp: Date.now()
    };
    
    return data;
  } catch (error) {
    console.error('[WaitlistQueueService] Error fetching queue position:', error);
    throw error;
  }
}

/**
 * Get beta summary with spots remaining
 */
export async function getBetaSummary(): Promise<BetaSummary | null> {
  try {
    const response = await fetch('/api/beta/summary', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch beta summary');
    }
    
    return await response.json();
  } catch (error) {
    console.error('[WaitlistQueueService] Error fetching beta summary:', error);
    return null;
  }
}

/**
 * Poll for queue position updates
 */
export function pollQueuePosition(
  callback: (position: QueuePosition | null) => void,
  interval = 30000
): () => void {
  // Initial fetch
  getQueuePosition().then(callback).catch(console.error);
  
  // Set up polling
  const intervalId = setInterval(async () => {
    try {
      const position = await getQueuePosition(true);
      callback(position);
    } catch (error) {
      console.error('[WaitlistQueueService] Polling error:', error);
    }
  }, interval);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
}

/**
 * Calculate position change from last check
 */
export function calculateMovement(
  currentPosition: number,
  previousPosition: number | null
): { direction: 'up' | 'down' | 'none'; spots: number } {
  if (previousPosition === null) {
    return { direction: 'none', spots: 0 };
  }
  
  const diff = previousPosition - currentPosition;
  
  if (diff > 0) {
    return { direction: 'up', spots: Math.abs(diff) };
  } else if (diff < 0) {
    return { direction: 'down', spots: Math.abs(diff) };
  } else {
    return { direction: 'none', spots: 0 };
  }
}

/**
 * Format wait time estimate
 */
export function formatWaitTime(days: number): string {
  if (days === 0) {
    return 'Today!';
  } else if (days === 1) {
    return 'Tomorrow';
  } else if (days < 7) {
    return `${days} days`;
  } else if (days < 14) {
    return '1 week';
  } else if (days < 30) {
    return `${Math.floor(days / 7)} weeks`;
  } else if (days < 60) {
    return '1 month';
  } else {
    return `${Math.floor(days / 30)} months`;
  }
}

/**
 * Calculate urgency level based on remaining spots
 */
export function getUrgencyLevel(remaining: number): 'critical' | 'high' | 'medium' | 'low' {
  if (remaining <= 5) return 'critical';
  if (remaining <= 10) return 'high';
  if (remaining <= 20) return 'medium';
  return 'low';
}

/**
 * Generate share message for referrals
 */
export function generateShareMessage(position: QueuePosition): {
  text: string;
  url: string;
  hashtags: string;
} {
  const baseUrl = window.location.origin;
  const referralUrl = `${baseUrl}/waitlist?ref=${Date.now().toString(36)}`;
  
  const text = position.position <= 10
    ? `I'm #${position.position} in line for @TeedClub beta access! 🏌️‍♂️ Join me on the ultimate golf equipment platform.`
    : `Just joined the @TeedClub waitlist! Can't wait to share my golf bag with the community. 🏌️‍♂️⛳`;
  
  return {
    text,
    url: referralUrl,
    hashtags: 'golf,golfing,TeedClub,golfequipment'
  };
}

/**
 * Track queue position changes
 */
let lastPosition: number | null = null;

export function trackPositionChange(
  newPosition: QueuePosition,
  onImprovement?: (spots: number) => void,
  onDecline?: (spots: number) => void
): void {
  if (lastPosition !== null) {
    const movement = calculateMovement(newPosition.position, lastPosition);
    
    if (movement.direction === 'up' && movement.spots > 0 && onImprovement) {
      onImprovement(movement.spots);
    } else if (movement.direction === 'down' && movement.spots > 0 && onDecline) {
      onDecline(movement.spots);
    }
  }
  
  lastPosition = newPosition.position;
}