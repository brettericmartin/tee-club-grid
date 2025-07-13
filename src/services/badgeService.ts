import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type Badge = Database['public']['Tables']['badges']['Row'];
type UserBadge = Database['public']['Tables']['user_badges']['Row'];

export interface BadgeWithCategory extends Badge {
  category?: {
    name: string;
    display_name: string;
  };
}

export interface UserBadgeWithDetails extends UserBadge {
  badge: BadgeWithCategory;
}

export class BadgeService {
  // Track user action and evaluate badges
  static async trackUserAction(
    userId: string,
    actionType: string,
    actionData: Record<string, any> = {}
  ) {
    try {
      // Insert the action
      const { error: actionError } = await supabase
        .from('user_actions')
        .insert({
          user_id: userId,
          action_type: actionType,
          action_data: actionData
        });

      if (actionError) throw actionError;

      // Evaluate badges based on action type
      await this.evaluateBadges(userId, actionType);
    } catch (error) {
      console.error('Error tracking user action:', error);
    }
  }

  // Evaluate and award badges for a user
  static async evaluateBadges(userId: string, actionType?: string) {
    try {
      // Get all active badges
      const { data: badges, error: badgesError } = await supabase
        .from('badges')
        .select('*')
        .eq('is_active', true);

      if (badgesError) throw badgesError;
      if (!badges) return;

      // Get user's current badges
      const { data: userBadges, error: userBadgesError } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId);

      if (userBadgesError) throw userBadgesError;

      const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);

      // Check each badge
      for (const badge of badges) {
        // Skip if already earned
        if (earnedBadgeIds.has(badge.id)) continue;

        // Check if user meets criteria
        const earned = await this.checkBadgeCriteria(userId, badge);
        
        if (earned) {
          await this.awardBadge(userId, badge.id);
        }
      }
    } catch (error) {
      console.error('Error evaluating badges:', error);
    }
  }

  // Check if user meets badge criteria
  private static async checkBadgeCriteria(
    userId: string,
    badge: Badge
  ): Promise<boolean> {
    const criteria = badge.criteria as any;
    
    switch (criteria.type) {
      case 'user_count':
        return await this.checkUserCountCriteria(userId, criteria.max_users);
      
      case 'photo_count':
        return await this.checkPhotoCountCriteria(userId, criteria.threshold);
      
      case 'equipment_count':
        return await this.checkEquipmentCountCriteria(userId, criteria.threshold);
      
      case 'brand_equipment':
        return await this.checkBrandEquipmentCriteria(userId, criteria.brand, criteria.threshold);
      
      case 'tees_given':
        return await this.checkTeesGivenCriteria(userId, criteria.threshold);
      
      case 'bag_value':
        return await this.checkBagValueCriteria(userId, criteria.threshold);
      
      case 'single_brand_bag':
        return await this.checkSingleBrandBagCriteria(userId, criteria.min_items);
      
      default:
        return false;
    }
  }

  // Specific criteria checkers
  private static async checkUserCountCriteria(userId: string, maxUsers: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .single();

    if (error || !data) return false;

    // Count users created before this user
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .lte('created_at', data.created_at);

    return (count || 0) <= maxUsers;
  }

  private static async checkPhotoCountCriteria(userId: string, threshold: number): Promise<boolean> {
    const { count } = await supabase
      .from('equipment_photos')
      .select('*', { count: 'exact', head: true })
      .eq('uploaded_by', userId);

    return (count || 0) >= threshold;
  }

  private static async checkEquipmentCountCriteria(userId: string, threshold: number): Promise<boolean> {
    const { count } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .eq('submitted_by', userId);

    return (count || 0) >= threshold;
  }

  private static async checkBrandEquipmentCriteria(
    userId: string,
    brand: string,
    threshold: number
  ): Promise<boolean> {
    // Get user's primary bag
    const { data: bag } = await supabase
      .from('user_bags')
      .select('id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();

    if (!bag) return false;

    // Count equipment from specific brand
    const { count } = await supabase
      .from('bag_equipment')
      .select(`
        equipment!inner(brand)
      `, { count: 'exact', head: true })
      .eq('bag_id', bag.id)
      .eq('equipment.brand', brand);

    return (count || 0) >= threshold;
  }

  private static async checkTeesGivenCriteria(userId: string, threshold: number): Promise<boolean> {
    // Count tees given to bags
    const { count: bagTees } = await supabase
      .from('bag_likes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Count tees given to posts
    const { count: postTees } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return ((bagTees || 0) + (postTees || 0)) >= threshold;
  }

  private static async checkBagValueCriteria(userId: string, threshold: number): Promise<boolean> {
    // Get user's primary bag value
    const { data: bag } = await supabase
      .from('user_bags')
      .select(`
        id,
        bag_equipment (
          purchase_price,
          equipment (
            msrp
          )
        )
      `)
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();

    if (!bag) return false;

    const totalValue = bag.bag_equipment?.reduce((sum, item) => {
      return sum + (item.purchase_price || item.equipment?.msrp || 0);
    }, 0) || 0;

    return totalValue >= threshold;
  }

  private static async checkSingleBrandBagCriteria(userId: string, minItems: number): Promise<boolean> {
    // Get user's primary bag
    const { data: bag } = await supabase
      .from('user_bags')
      .select(`
        bag_equipment (
          equipment (
            brand
          )
        )
      `)
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();

    if (!bag || !bag.bag_equipment || bag.bag_equipment.length < minItems) return false;

    // Count equipment by brand
    const brandCounts: Record<string, number> = {};
    bag.bag_equipment.forEach(item => {
      if (item.equipment?.brand) {
        brandCounts[item.equipment.brand] = (brandCounts[item.equipment.brand] || 0) + 1;
      }
    });

    // Check if any brand has enough items
    return Object.values(brandCounts).some(count => count >= minItems);
  }

  // Award badge to user
  private static async awardBadge(userId: string, badgeId: string) {
    try {
      const { error } = await supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_id: badgeId,
          notification_seen: false
        });

      if (error) throw error;

      console.log(`Badge ${badgeId} awarded to user ${userId}`);
    } catch (error) {
      console.error('Error awarding badge:', error);
    }
  }

  // Get user's badges
  static async getUserBadges(userId: string): Promise<UserBadgeWithDetails[]> {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges (
          *,
          category:badge_categories (
            name,
            display_name
          )
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      console.error('Error fetching user badges:', error);
      return [];
    }

    return data || [];
  }

  // Get featured badges for display
  static async getUserFeaturedBadges(userId: string, limit: number = 6): Promise<UserBadgeWithDetails[]> {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges (
          *,
          category:badge_categories (
            name,
            display_name
          )
        )
      `)
      .eq('user_id', userId)
      .eq('is_featured', true)
      .order('earned_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching featured badges:', error);
      return [];
    }

    // If not enough featured badges, fill with recent badges
    if (!data || data.length < limit) {
      const { data: recentBadges } = await supabase
        .from('user_badges')
        .select(`
          *,
          badge:badges (
            *,
            category:badge_categories (
              name,
              display_name
            )
          )
        `)
        .eq('user_id', userId)
        .eq('is_featured', false)
        .order('earned_at', { ascending: false })
        .limit(limit - (data?.length || 0));

      return [...(data || []), ...(recentBadges || [])];
    }

    return data;
  }

  // Mark badge notification as seen
  static async markBadgeNotificationSeen(userBadgeId: string) {
    await supabase
      .from('user_badges')
      .update({ notification_seen: true })
      .eq('id', userBadgeId);
  }

  // Toggle badge featured status
  static async toggleBadgeFeatured(userBadgeId: string, isFeatured: boolean) {
    await supabase
      .from('user_badges')
      .update({ is_featured: isFeatured })
      .eq('id', userBadgeId);
  }
}