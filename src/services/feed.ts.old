import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type FeedPost = Database['public']['Tables']['feed_posts']['Row'];

export interface FeedItemData {
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userHandicap: number;
  postType: 'bag_photo' | 'new_equipment' | 'equipment_showcase' | 'tournament_prep';
  imageUrl: string;
  caption: string;
  likes: number;
  commentCount: number;
  timestamp: Date;
  isFromFollowed: boolean;
  bagId?: string;
  bagData?: {
    featuredClubs: string[];
    handicap: number;
    totalValue: number;
  };
  equipmentAdded?: {
    name: string;
    brand: string;
    model: string;
  };
}

export async function getFeedPosts(userId?: string): Promise<FeedItemData[]> {
  // For now, return sample data transformed from user bags
  // In a real implementation, you'd fetch from feed_posts table
  
  try {
    // Get all public bags to create feed items
    const { data: bags } = await supabase
      .from('user_bags')
      .select(`
        *,
        profile:profiles!user_bags_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url,
          handicap
        ),
        bag_equipment (
          equipment:equipment (
            id,
            brand,
            model,
            category,
            image_url,
            msrp
          ),
          is_featured,
          purchase_price
        ),
        bag_likes (count)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!bags) return [];

    // Transform bags into feed items
    const feedItems: FeedItemData[] = bags.map((bag, index) => {
      const featuredEquipment = bag.bag_equipment?.filter(be => be.is_featured) || [];
      const totalValue = bag.bag_equipment?.reduce((sum, item) => 
        sum + (item.purchase_price || item.equipment?.msrp || 0), 0
      ) || 0;

      // Alternate between different post types for variety
      const postTypes: FeedItemData['postType'][] = ['bag_photo', 'new_equipment', 'equipment_showcase', 'tournament_prep'];
      const postType = postTypes[index % postTypes.length];

      // Get random equipment for "new equipment" posts
      const randomEquipment = bag.bag_equipment?.[Math.floor(Math.random() * bag.bag_equipment.length)];

      return {
        postId: bag.id,
        userId: bag.profile?.id || '',
        userName: bag.profile?.full_name || bag.profile?.username || 'Unknown',
        userAvatar: bag.profile?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop',
        userHandicap: bag.profile?.handicap || 0,
        postType,
        imageUrl: featuredEquipment[0]?.equipment?.image_url || 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&h=750&fit=crop',
        caption: getCaptionForPostType(postType, bag.name, randomEquipment?.equipment),
        likes: bag.bag_likes?.[0]?.count || Math.floor(Math.random() * 500),
        commentCount: Math.floor(Math.random() * 50),
        timestamp: new Date(bag.created_at),
        isFromFollowed: Math.random() > 0.5, // Random for demo
        bagId: bag.id,
        bagData: {
          featuredClubs: featuredEquipment.map(eq => eq.equipment?.id || '').filter(Boolean),
          handicap: bag.profile?.handicap || 0,
          totalValue
        },
        ...(postType === 'new_equipment' && randomEquipment ? {
          equipmentAdded: {
            name: `${randomEquipment.equipment?.brand} ${randomEquipment.equipment?.model}`,
            brand: randomEquipment.equipment?.brand || '',
            model: randomEquipment.equipment?.model || ''
          }
        } : {})
      };
    });

    return feedItems;
  } catch (error) {
    console.error('Error fetching feed posts:', error);
    return [];
  }
}

function getCaptionForPostType(
  postType: FeedItemData['postType'], 
  bagName: string,
  equipment?: any
): string {
  switch (postType) {
    case 'bag_photo':
      return `Check out my ${bagName}! What do you think of the setup? 🏌️`;
    case 'new_equipment':
      return equipment 
        ? `Just added ${equipment.brand} ${equipment.model} to my bag! Can't wait to test it out ⛳`
        : 'New addition to the bag! 🎯';
    case 'equipment_showcase':
      return `Detailed look at my setup. Every club has a purpose! 💯`;
    case 'tournament_prep':
      return `Getting ready for the weekend tournament with my ${bagName} 🏆`;
    default:
      return 'Love this game! ⛳';
  }
}

// Generate feed items from bags data
export function generateFeedFromBags(bags: any[]): FeedItemData[] {
  return bags.map((bag, index) => {
    const featuredEquipment = bag.bag_equipment?.filter((be: any) => be.is_featured) || [];
    const totalValue = bag.bag_equipment?.reduce((sum: number, item: any) => 
      sum + (item.purchase_price || item.equipment?.msrp || 0), 0
    ) || 0;

    // Alternate between different post types for variety
    const postTypes: FeedItemData['postType'][] = ['bag_photo', 'new_equipment', 'equipment_showcase', 'tournament_prep'];
    const postType = postTypes[index % postTypes.length];

    // Get random equipment for "new equipment" posts
    const randomEquipment = bag.bag_equipment?.[Math.floor(Math.random() * bag.bag_equipment.length)];

    return {
      postId: bag.id,
      userId: bag.profile?.id || '',
      userName: bag.profile?.full_name || bag.profile?.username || 'Unknown',
      userAvatar: bag.profile?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop',
      userHandicap: bag.profile?.handicap || 0,
      postType,
      imageUrl: featuredEquipment[0]?.equipment?.image_url || 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&h=750&fit=crop',
      caption: getCaptionForPostType(postType, bag.name, randomEquipment?.equipment),
      likes: Math.floor(Math.random() * 500),
      commentCount: Math.floor(Math.random() * 50),
      timestamp: new Date(bag.created_at || Date.now()),
      isFromFollowed: Math.random() > 0.5, // Random for demo
      bagId: bag.id,
      bagData: {
        featuredClubs: featuredEquipment.map((eq: any) => eq.equipment?.id || '').filter(Boolean),
        handicap: bag.profile?.handicap || 0,
        totalValue
      },
      ...(postType === 'new_equipment' && randomEquipment ? {
        equipmentAdded: {
          name: `${randomEquipment.equipment?.brand} ${randomEquipment.equipment?.model}`,
          brand: randomEquipment.equipment?.brand || '',
          model: randomEquipment.equipment?.model || ''
        }
      } : {})
    };
  });
}

// Create a new feed post
export async function createFeedPost(
  userId: string,
  type: string,
  content: Record<string, any>
) {
  const { data, error } = await supabase
    .from('feed_posts')
    .insert({
      user_id: userId,
      type,
      content
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}