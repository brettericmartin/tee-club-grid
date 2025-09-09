import { supabase } from '@/lib/supabase';

export async function getTopBagsWithEquipment(equipmentId: string, limit: number = 10) {
  try {
    // Step 1: Get all bag_equipment entries for this equipment
    const { data: bagEquipment, error: bagError } = await supabase
      .from('bag_equipment')
      .select('bag_id')
      .eq('equipment_id', equipmentId);
    
    if (bagError) throw bagError;
    
    // Step 2: Get unique bag IDs (handles duplicates if equipment appears multiple times in same bag)
    const uniqueBagIds = [...new Set(bagEquipment?.map(item => item.bag_id) || [])];
    
    if (uniqueBagIds.length === 0) return [];
    
    // Step 3: Fetch the bags with their details
    const { data: bags, error: bagsError } = await supabase
      .from('user_bags')
      .select(`
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
      `)
      .in('id', uniqueBagIds)
      .order('likes_count', { ascending: false })
      .limit(limit);
    
    if (bagsError) throw bagsError;
    
    // Transform the data to a cleaner format
    return bags?.map(item => ({
      bagId: item.id,
      bagName: item.name,
      likesCount: item.likes_count || 0,
      user: {
        username: item.profiles?.username,
        displayName: item.profiles?.display_name,
        avatar: item.profiles?.avatar_url,
        handicap: item.profiles?.handicap
      }
    })) || [];
  } catch (error) {
    console.error('Error fetching top bags:', error);
    return [];
  }
}