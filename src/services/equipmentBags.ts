import { supabase } from '@/lib/supabase';

export async function getTopBagsWithEquipment(equipmentId: string, limit: number = 10) {
  try {
    // Get bags that contain this equipment, ordered by likes
    const { data, error } = await supabase
      .from('bag_equipment')
      .select(`
        bag_id,
        user_bags!inner (
          id,
          name,
          likes_count,
          user_id,
          profiles (
            username,
            display_name,
            avatar_url,
            handicap
          )
        )
      `)
      .eq('equipment_id', equipmentId)
      .order('likes_count', { ascending: false, referencedTable: 'user_bags' })
      .limit(limit);

    if (error) throw error;

    // Transform the data to a cleaner format
    return data?.map(item => ({
      bagId: item.user_bags.id,
      bagName: item.user_bags.name,
      likesCount: item.user_bags.likes_count || 0,
      user: {
        username: item.user_bags.profiles?.username,
        displayName: item.user_bags.profiles?.display_name,
        avatar: item.user_bags.profiles?.avatar_url,
        handicap: item.user_bags.profiles?.handicap
      }
    })) || [];
  } catch (error) {
    console.error('Error fetching top bags:', error);
    return [];
  }
}