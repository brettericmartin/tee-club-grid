import { supabase } from '@/lib/supabase';

export interface SavedPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  source_type: 'equipment_photo' | 'bag_equipment' | 'feed_post' | 'user_upload';
  source_id: string | null;
  equipment_id: string | null;
  saved_from_user_id: string | null;
  original_caption: string | null;
  user_notes: string | null;
  tags: string[] | null;
  is_favorited: boolean;
  created_at: string;
  // From the view
  saved_from_username?: string;
  saved_from_display_name?: string;
  saved_from_avatar?: string;
  equipment_brand?: string;
  equipment_model?: string;
  equipment_category?: string;
  source_caption?: string;
}

export interface SavePhotoInput {
  photo_url: string;
  source_type: SavedPhoto['source_type'];
  source_id?: string;
  equipment_id?: string;
  saved_from_user_id?: string;
  notes?: string;
  tags?: string[];
}

// Get user's saved photos
export async function getUserSavedPhotos(
  userId: string,
  options?: {
    equipment_id?: string;
    is_favorited?: boolean;
    limit?: number;
    offset?: number;
  }
) {
  try {
    let query = supabase
      .from('saved_photos_gallery')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.equipment_id) {
      query = query.eq('equipment_id', options.equipment_id);
    }

    if (options?.is_favorited !== undefined) {
      query = query.eq('is_favorited', options.is_favorited);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data as SavedPhoto[];
  } catch (error) {
    console.error('Error fetching saved photos:', error);
    throw error;
  }
}

// Save a photo
export async function savePhoto(userId: string, input: SavePhotoInput) {
  try {
    const { data, error } = await supabase.rpc('save_equipment_photo', {
      p_user_id: userId,
      p_photo_url: input.photo_url,
      p_source_type: input.source_type,
      p_source_id: input.source_id || null,
      p_equipment_id: input.equipment_id || null,
      p_saved_from_user_id: input.saved_from_user_id || null,
      p_notes: input.notes || null,
      p_tags: input.tags || null
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error saving photo:', error);
    throw error;
  }
}

// Unsave a photo
export async function unsavePhoto(userId: string, photoUrl: string) {
  try {
    const { error } = await supabase
      .from('saved_photos')
      .delete()
      .eq('user_id', userId)
      .eq('photo_url', photoUrl);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error unsaving photo:', error);
    throw error;
  }
}

// Toggle favorite status
export async function togglePhotoFavorite(userId: string, photoId: string) {
  try {
    // Get current status
    const { data: current } = await supabase
      .from('saved_photos')
      .select('is_favorited')
      .eq('id', photoId)
      .eq('user_id', userId)
      .single();

    if (!current) throw new Error('Photo not found');

    // Toggle status
    const { data, error } = await supabase
      .from('saved_photos')
      .update({ is_favorited: !current.is_favorited })
      .eq('id', photoId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error toggling photo favorite:', error);
    throw error;
  }
}

// Update photo notes/tags
export async function updateSavedPhoto(
  userId: string,
  photoId: string,
  updates: {
    user_notes?: string;
    tags?: string[];
  }
) {
  try {
    const { data, error } = await supabase
      .from('saved_photos')
      .update(updates)
      .eq('id', photoId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating saved photo:', error);
    throw error;
  }
}

// Check if photo is saved
export async function isPhotoSaved(userId: string, photoUrl: string) {
  try {
    const { data, error } = await supabase
      .from('saved_photos')
      .select('id')
      .eq('user_id', userId)
      .eq('photo_url', photoUrl)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

    return !!data;
  } catch (error) {
    console.error('Error checking photo save status:', error);
    throw error;
  }
}

// Get saved photos for equipment (to show when selecting photos)
export async function getSavedPhotosForEquipment(userId: string, equipmentId: string) {
  try {
    const { data, error } = await supabase
      .from('saved_photos_gallery')
      .select('*')
      .eq('user_id', userId)
      .eq('equipment_id', equipmentId)
      .order('is_favorited', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data as SavedPhoto[];
  } catch (error) {
    console.error('Error fetching saved photos for equipment:', error);
    throw error;
  }
}

// Get popular saved photos (for discovery)
export async function getPopularSavedPhotos(
  options?: {
    equipment_id?: string;
    category?: string;
    limit?: number;
  }
) {
  try {
    let query = supabase
      .from('equipment_photos')
      .select(`
        *,
        equipment!inner (
          id,
          brand,
          model,
          category
        ),
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .gt('save_count', 0)
      .order('save_count', { ascending: false });

    if (options?.equipment_id) {
      query = query.eq('equipment_id', options.equipment_id);
    }

    if (options?.category) {
      query = query.eq('equipment.category', options.category);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching popular saved photos:', error);
    throw error;
  }
}

// Get photo usage stats (for contributors)
export async function getPhotoUsageStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from('equipment_photos')
      .select('save_count, usage_count')
      .eq('user_id', userId);

    if (error) throw error;

    const stats = {
      total_saves: 0,
      total_usage: 0,
      photos_with_saves: 0
    };

    data?.forEach(photo => {
      stats.total_saves += photo.save_count || 0;
      stats.total_usage += photo.usage_count || 0;
      if (photo.save_count > 0) stats.photos_with_saves++;
    });

    return stats;
  } catch (error) {
    console.error('Error fetching photo usage stats:', error);
    throw error;
  }
}

// Batch check if photos are saved (for performance)
export async function arePhotosSaved(userId: string, photoUrls: string[]) {
  try {
    const { data, error } = await supabase
      .from('saved_photos')
      .select('photo_url')
      .eq('user_id', userId)
      .in('photo_url', photoUrls);

    if (error) throw error;

    const savedUrls = new Set(data?.map(d => d.photo_url) || []);
    
    return photoUrls.reduce((acc, url) => {
      acc[url] = savedUrls.has(url);
      return acc;
    }, {} as Record<string, boolean>);
  } catch (error) {
    console.error('Error checking photos save status:', error);
    throw error;
  }
}