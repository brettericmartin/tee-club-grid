import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type Equipment = Database['public']['Tables']['equipment']['Row'];

// Get saved equipment with pagination
export async function getUserSavedEquipmentPaginated(
  userId: string, 
  page: number = 1, 
  pageSize: number = 20
) {
  const offset = (page - 1) * pageSize;
  
  const { data, error, count } = await supabase
    .from('equipment_saves')
    .select(`
      *,
      equipment:equipment_id (
        *,
        equipment_photos (
          photo_url,
          is_primary,
          likes_count
        )
      )
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  
  const items = data?.map(item => {
    if (!item.equipment) return null;
    
    const sortedPhotos = item.equipment?.equipment_photos?.sort((a, b) => 
      (b.likes_count || 0) - (a.likes_count || 0)
    );
    const primaryPhoto = sortedPhotos?.[0]?.photo_url || 
                        item.equipment?.equipment_photos?.find(p => p.is_primary)?.photo_url || 
                        item.equipment?.image_url;
    
    return {
      ...item.equipment,
      primaryPhoto,
      savedAt: item.created_at
    };
  }).filter(Boolean);

  return {
    items: items || [],
    totalCount: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
    currentPage: page
  };
}

// Get equipment by multiple IDs (batch fetch)
export async function getEquipmentByIds(equipmentIds: string[]) {
  if (!equipmentIds.length) return [];
  
  const { data, error } = await supabase
    .from('equipment')
    .select(`
      *,
      equipment_photos (
        photo_url,
        is_primary,
        likes_count
      )
    `)
    .in('id', equipmentIds);

  if (error) throw error;
  
  return data?.map(equipment => {
    const sortedPhotos = equipment.equipment_photos?.sort((a, b) => 
      (b.likes_count || 0) - (a.likes_count || 0)
    );
    const primaryPhoto = sortedPhotos?.[0]?.photo_url || equipment.image_url;
    
    return {
      ...equipment,
      primaryPhoto
    };
  }) || [];
}

// Subscribe to real-time equipment saves
export function subscribeToEquipmentSaves(
  userId: string,
  onInsert?: (payload: any) => void,
  onDelete?: (payload: any) => void
) {
  const channel = supabase
    .channel('equipment-saves-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'equipment_saves',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('New save:', payload);
        onInsert?.(payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'equipment_saves',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('Save removed:', payload);
        onDelete?.(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Subscribe to real-time photo uploads
export function subscribeToEquipmentPhotos(
  equipmentId: string,
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void
) {
  const channel = supabase
    .channel(`equipment-photos-${equipmentId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'equipment_photos',
        filter: `equipment_id=eq.${equipmentId}`
      },
      (payload) => {
        console.log('New photo:', payload);
        onInsert?.(payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'equipment_photos',
        filter: `equipment_id=eq.${equipmentId}`
      },
      (payload) => {
        console.log('Photo updated:', payload);
        onUpdate?.(payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'equipment_photos',
        filter: `equipment_id=eq.${equipmentId}`
      },
      (payload) => {
        console.log('Photo deleted:', payload);
        onDelete?.(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Get popular equipment (most saved)
export async function getPopularEquipment(limit: number = 10) {
  const { data, error } = await supabase
    .from('equipment')
    .select(`
      *,
      equipment_saves (count),
      equipment_photos (
        photo_url,
        is_primary,
        likes_count
      )
    `)
    .order('popularity_score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  
  return data?.map(equipment => {
    const sortedPhotos = equipment.equipment_photos?.sort((a, b) => 
      (b.likes_count || 0) - (a.likes_count || 0)
    );
    const primaryPhoto = sortedPhotos?.[0]?.photo_url || equipment.image_url;
    const savesCount = equipment.equipment_saves?.[0]?.count || 0;
    
    return {
      ...equipment,
      primaryPhoto,
      savesCount
    };
  }) || [];
}

// Get equipment with user context (saved status, in bag, etc.)
export async function getEquipmentWithUserContext(equipmentId: string, userId: string | null) {
  const equipment = await supabase
    .from('equipment')
    .select(`
      *,
      equipment_photos (
        photo_url,
        is_primary,
        likes_count
      )
    `)
    .eq('id', equipmentId)
    .single();

  if (equipment.error) throw equipment.error;

  let userContext = {
    isSaved: false,
    isInWishlist: false,
    isInBag: false,
    userPhotos: [] as any[]
  };

  if (userId) {
    // Check if saved
    const { data: saveData } = await supabase
      .from('equipment_saves')
      .select('id')
      .eq('user_id', userId)
      .eq('equipment_id', equipmentId)
      .single();
    
    userContext.isSaved = !!saveData;

    // Check if in wishlist
    const { data: wishlistData } = await supabase
      .from('equipment_wishlist')
      .select('id, priority, notes')
      .eq('user_id', userId)
      .eq('equipment_id', equipmentId)
      .single();
    
    userContext.isInWishlist = !!wishlistData;

    // Check if in any bag
    const { data: bagData } = await supabase
      .from('bag_equipment')
      .select('bag_id')
      .eq('equipment_id', equipmentId)
      .in('bag_id', 
        supabase
          .from('user_bags')
          .select('id')
          .eq('user_id', userId)
      );
    
    userContext.isInBag = !!bagData?.length;

    // Get user's photos
    const { data: userPhotos } = await supabase
      .from('equipment_photos')
      .select('*')
      .eq('equipment_id', equipmentId)
      .eq('user_id', userId);
    
    userContext.userPhotos = userPhotos || [];
  }

  const sortedPhotos = equipment.data.equipment_photos?.sort((a, b) => 
    (b.likes_count || 0) - (a.likes_count || 0)
  );
  const primaryPhoto = sortedPhotos?.[0]?.photo_url || equipment.data.image_url;

  return {
    ...equipment.data,
    primaryPhoto,
    userContext
  };
}

// Batch check saved status for multiple equipment
export async function checkEquipmentSavedStatus(userId: string, equipmentIds: string[]) {
  if (!equipmentIds.length) return {};
  
  const { data, error } = await supabase
    .from('equipment_saves')
    .select('equipment_id')
    .eq('user_id', userId)
    .in('equipment_id', equipmentIds);

  if (error) throw error;
  
  const savedMap: Record<string, boolean> = {};
  equipmentIds.forEach(id => {
    savedMap[id] = false;
  });
  
  data?.forEach(save => {
    savedMap[save.equipment_id] = true;
  });
  
  return savedMap;
}