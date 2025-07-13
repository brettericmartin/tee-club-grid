import { supabase } from '@/lib/supabase';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'equipment_explorer' | 'social_golfer' | 'gear_collector' | 'community_contributor' | 'milestone_achievement' | 'special_event';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface BadgeCriteria {
  id: string;
  badge_id: string;
  criteria_type: string;
  threshold: number;
  parameters: Record<string, any>;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string | null;
  progress: number;
  progress_data: Record<string, any>;
  is_featured: boolean;
  badge?: Badge;
}

export interface BadgeNotification {
  id: string;
  user_id: string;
  badge_id: string;
  is_read: boolean;
  created_at: string;
  badge?: Badge;
}

export const badgeService = {
  // Fetch all available badges
  async getAllBadges(): Promise<Badge[]> {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;
    return data || [];
  },

  // Fetch user's badges with progress
  async getUserBadges(userId: string): Promise<UserBadge[]> {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges(*)
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Fetch user's earned badges only
  async getUserEarnedBadges(userId: string): Promise<UserBadge[]> {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges(*)
      `)
      .eq('user_id', userId)
      .eq('progress', 100)
      .order('earned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Fetch user's featured badges
  async getUserFeaturedBadges(userId: string): Promise<UserBadge[]> {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges(*)
      `)
      .eq('user_id', userId)
      .eq('is_featured', true)
      .eq('progress', 100)
      .order('earned_at', { ascending: false })
      .limit(3);

    if (error) throw error;
    return data || [];
  },

  // Toggle badge featured status
  async toggleBadgeFeatured(userBadgeId: string, isFeatured: boolean): Promise<void> {
    const { error } = await supabase
      .from('user_badges')
      .update({ is_featured: isFeatured })
      .eq('id', userBadgeId);

    if (error) throw error;
  },

  // Check and update badge progress
  async checkAndAwardBadges(userId: string): Promise<{ badge_id: string; badge_name: string; newly_earned: boolean }[]> {
    const { data, error } = await supabase
      .rpc('check_and_award_badges', { p_user_id: userId });

    if (error) throw error;
    return data || [];
  },

  // Get badge notifications
  async getBadgeNotifications(userId: string): Promise<BadgeNotification[]> {
    const { data, error } = await supabase
      .from('badge_notifications')
      .select(`
        *,
        badge:badges(*)
      `)
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Mark notification as read
  async markNotificationRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('badge_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
  },

  // Get badge statistics for a user
  async getUserBadgeStats(userId: string) {
    const badges = await this.getUserBadges(userId);
    
    const stats = {
      total: badges.length,
      earned: badges.filter(b => b.progress === 100).length,
      inProgress: badges.filter(b => b.progress > 0 && b.progress < 100).length,
      byCategory: {} as Record<string, number>,
      byTier: {} as Record<string, number>,
    };

    badges.forEach(userBadge => {
      if (userBadge.badge && userBadge.progress === 100) {
        stats.byCategory[userBadge.badge.category] = (stats.byCategory[userBadge.badge.category] || 0) + 1;
        stats.byTier[userBadge.badge.tier] = (stats.byTier[userBadge.badge.tier] || 0) + 1;
      }
    });

    return stats;
  },

  // Helper to get tier colors
  getTierColor(tier: Badge['tier']): string {
    const colors = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      platinum: '#E5E4E2',
      diamond: '#B9F2FF',
    };
    return colors[tier] || '#000000';
  },

  // Helper to get tier gradient
  getTierGradient(tier: Badge['tier']): string {
    const gradients = {
      bronze: 'from-orange-600 to-orange-800',
      silver: 'from-gray-400 to-gray-600',
      gold: 'from-yellow-400 to-yellow-600',
      platinum: 'from-gray-200 to-gray-400',
      diamond: 'from-blue-300 to-blue-500',
    };
    return gradients[tier] || 'from-gray-500 to-gray-700';
  },

  // Helper to get category icon
  getCategoryIcon(category: Badge['category']): string {
    const icons = {
      equipment_explorer: '🔍',
      social_golfer: '👥',
      gear_collector: '🎒',
      community_contributor: '🤝',
      milestone_achievement: '🏆',
      special_event: '🎉',
    };
    return icons[category] || '🏅';
  },

  // Format progress for display
  formatProgress(progress: number): string {
    return `${Math.round(progress)}%`;
  },
};