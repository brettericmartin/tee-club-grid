import type { UserBadgeWithDetails } from '@/services/badgeService';

const rarityOrder = {
  legendary: 5,
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1
};

export function sortBadgesByPriority(badges: UserBadgeWithDetails[]): UserBadgeWithDetails[] {
  return badges.sort((a, b) => {
    // Featured badges first
    if (a.is_featured && !b.is_featured) return -1;
    if (!a.is_featured && b.is_featured) return 1;
    
    // Then by rarity
    const aRarity = rarityOrder[a.badge.rarity as keyof typeof rarityOrder] || 0;
    const bRarity = rarityOrder[b.badge.rarity as keyof typeof rarityOrder] || 0;
    const rarityDiff = bRarity - aRarity;
    if (rarityDiff !== 0) return rarityDiff;
    
    // Then by earned date (newest first)
    return new Date(b.earned_at || 0).getTime() - new Date(a.earned_at || 0).getTime();
  });
}