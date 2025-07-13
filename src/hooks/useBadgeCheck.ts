import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { badgeService } from '@/services/badges';
import { Badge } from '@/services/badges';

interface BadgeCheckResult {
  checkBadgeProgress: () => Promise<void>;
  newBadges: Badge[];
  clearNewBadges: () => void;
}

export function useBadgeCheck(): BadgeCheckResult {
  const { user } = useAuth();
  const [newBadges, setNewBadges] = useState<Badge[]>([]);

  const checkBadgeProgress = async () => {
    if (!user) return;

    try {
      const results = await badgeService.checkAndAwardBadges(user.id);
      
      // Filter for newly earned badges
      const newlyEarned = results.filter(r => r.newly_earned);
      
      if (newlyEarned.length > 0) {
        // Fetch full badge details for newly earned badges
        const badges = await badgeService.getAllBadges();
        const earnedBadges = newlyEarned
          .map(ne => badges.find(b => b.id === ne.badge_id))
          .filter(Boolean) as Badge[];
        
        setNewBadges(earnedBadges);
      }
    } catch (error) {
      console.error('Error checking badge progress:', error);
    }
  };

  const clearNewBadges = () => {
    setNewBadges([]);
  };

  return {
    checkBadgeProgress,
    newBadges,
    clearNewBadges,
  };
}

// Hook to automatically check badges on specific events
export function useBadgeCheckOnEvent(eventType: 'equipment_added' | 'review_submitted' | 'photo_uploaded' | 'profile_updated') {
  const { checkBadgeProgress } = useBadgeCheck();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Define which badge criteria types to check for each event
    const eventToCriteria = {
      equipment_added: ['equipment_count', 'unique_brands', 'equipment_value'],
      review_submitted: ['reviews_written'],
      photo_uploaded: ['photos_uploaded'],
      profile_updated: ['profile_complete'],
    };

    // Only check relevant badges based on the event
    const relevantCriteria = eventToCriteria[eventType];
    
    // For now, we'll check all badges, but in a production app,
    // you'd want to optimize this to only check relevant badges
    checkBadgeProgress();
  }, [eventType, user, checkBadgeProgress]);
}