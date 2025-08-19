import { supabase } from '@/lib/supabase';
import { compressImage } from '@/utils/imageOptimization';

export interface PhotoUpload {
  id: string;
  file: File;
  previewUrl: string;
  equipmentId: string | null;
  equipmentName: string | null;
  caption: string;
  order: number;
}

interface UploadResult {
  url: string;
  equipmentId: string;
  equipmentName: string;
  caption: string;
  order: number;
}

/**
 * Upload multiple photos in batches with parallel processing
 * Follows existing pattern from equipment.ts service
 */
export async function uploadPhotosInBatches(
  photos: PhotoUpload[],
  userId: string,
  concurrency: number = 3
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  
  // Process in chunks for controlled parallelism
  for (let i = 0; i < photos.length; i += concurrency) {
    const batch = photos.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (photo) => {
      // Compress image per CLAUDE.md requirements (< 100KB)
      const compressed = await compressImage(photo.file, {
        maxSize: 100 * 1024,
        format: 'webp',
        fallback: 'jpeg'
      });
      
      // Generate unique path following existing pattern
      const timestamp = Date.now();
      const fileExt = compressed.type === 'image/webp' ? 'webp' : 'jpg';
      const fileName = `${photo.equipmentId}_${timestamp}_${photo.id}.${fileExt}`;
      const filePath = `equipment-photos/${userId}/${fileName}`;
      
      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('equipment-images')
        .upload(filePath, compressed, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error(`Failed to upload photo ${photo.id}:`, uploadError);
        throw uploadError;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('equipment-images')
        .getPublicUrl(filePath);
      
      return {
        url: publicUrl,
        equipmentId: photo.equipmentId!,
        equipmentName: photo.equipmentName!,
        caption: photo.caption,
        order: photo.order
      };
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Handle results and collect successful uploads
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('Photo upload failed:', result.reason);
        // Could implement retry logic here
        throw new Error(`Failed to upload photo: ${result.reason}`);
      }
    }
  }
  
  return results.sort((a, b) => a.order - b.order);
}

/**
 * Create a multi-equipment photo feed post
 * Integrates with existing feed_posts table structure
 */
export async function createMultiEquipmentPost(
  userId: string,
  photos: PhotoUpload[],
  overallCaption: string,
  bagId?: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    // Validate input
    if (photos.length < 2) {
      throw new Error('Multi-equipment posts require at least 2 photos');
    }
    
    if (photos.length > 10) {
      throw new Error('Maximum 10 photos allowed per post');
    }
    
    // Ensure all photos have equipment selected
    const missingEquipment = photos.some(p => !p.equipmentId);
    if (missingEquipment) {
      throw new Error('All photos must have equipment selected');
    }
    
    // Get user's current bag if not provided
    if (!bagId) {
      const { data: userBag } = await supabase
        .from('user_bags')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (userBag) {
        bagId = userBag.id;
      }
    }
    
    // Upload all photos
    const uploadedPhotos = await uploadPhotosInBatches(photos, userId);
    
    // Extract media URLs for the media_urls column
    const mediaUrls = uploadedPhotos.map(p => p.url);
    
    // Count unique equipment pieces
    const uniqueEquipmentIds = new Set(uploadedPhotos.map(p => p.equipmentId));
    
    // Create the feed post following existing content structure
    const { data: feedPost, error: feedError } = await supabase
      .from('feed_posts')
      .insert({
        user_id: userId,
        type: 'multi_equipment_photos',
        bag_id: bagId, // Include bag_id so feed knows which bag to show
        content: {
          photos: uploadedPhotos.map(photo => ({
            url: photo.url,
            equipment_id: photo.equipmentId,
            equipment_name: photo.equipmentName,
            caption: photo.caption,
            order: photo.order
          })),
          overall_caption: overallCaption,
          equipment_count: uniqueEquipmentIds.size,
          photo_count: uploadedPhotos.length,
          // Include first equipment_id for backwards compatibility
          equipment_id: uploadedPhotos[0].equipmentId,
          equipment_name: uploadedPhotos[0].equipmentName,
          bag_id: bagId // Also include in content for backward compatibility
        },
        media_urls: mediaUrls,
        // Set the main equipment_id for indexing (uses first photo's equipment)
        equipment_id: uploadedPhotos[0].equipmentId
      })
      .select()
      .single();
    
    if (feedError) {
      console.error('Failed to create feed post:', feedError);
      throw feedError;
    }
    
    // The trigger will automatically create equipment_photos entries
    // But we can also do it manually for redundancy
    const photoInserts = uploadedPhotos.map(photo => ({
      equipment_id: photo.equipmentId,
      user_id: userId,
      photo_url: photo.url,
      caption: photo.caption,
      is_primary: false,
      created_at: new Date().toISOString()
    }));
    
    // Insert into equipment_photos table (ignoring conflicts)
    const { error: photoError } = await supabase
      .from('equipment_photos')
      .insert(photoInserts);
    
    if (photoError) {
      console.warn('Failed to create equipment_photos entries:', photoError);
      // Don't fail the whole operation if this fails
    }
    
    return { 
      success: true, 
      postId: feedPost.id 
    };
    
  } catch (error) {
    console.error('Multi-equipment post creation failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Delete a multi-equipment post and clean up associated photos
 * Only the post owner can delete
 */
export async function deleteMultiEquipmentPost(
  postId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the post to verify ownership and get photo URLs
    const { data: post, error: fetchError } = await supabase
      .from('feed_posts')
      .select('user_id, media_urls, content')
      .eq('id', postId)
      .eq('type', 'multi_equipment_photos')
      .single();
    
    if (fetchError || !post) {
      throw new Error('Post not found');
    }
    
    if (post.user_id !== userId) {
      throw new Error('Unauthorized to delete this post');
    }
    
    // Delete the feed post (cascade will handle likes, comments)
    const { error: deleteError } = await supabase
      .from('feed_posts')
      .delete()
      .eq('id', postId);
    
    if (deleteError) {
      throw deleteError;
    }
    
    // Clean up storage files
    if (post.media_urls && post.media_urls.length > 0) {
      // Extract file paths from URLs
      const filePaths = post.media_urls.map(url => {
        const urlParts = url.split('/');
        return urlParts.slice(-3).join('/'); // Gets equipment-photos/userId/filename
      });
      
      // Delete from storage (best effort, don't fail if this fails)
      const { error: storageError } = await supabase.storage
        .from('equipment-images')
        .remove(filePaths);
      
      if (storageError) {
        console.warn('Failed to delete storage files:', storageError);
      }
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Failed to delete multi-equipment post:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}