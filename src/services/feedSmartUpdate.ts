import { supabase } from '@/lib/supabase';
import { createBagCreationPost, createBagUpdatePost, createEquipmentAddedPost } from './feedService';

// Helper to find recent equipment-specific posts
async function findRecentEquipmentPost(
  userId: string, 
  equipmentId: string, 
  hourLimit: number = 1
): Promise<any | null> {
  const recentTime = new Date();
  recentTime.setHours(recentTime.getHours() - hourLimit);

  const { data, error } = await supabase
    .from('feed_posts')
    .select('*')
    .eq('user_id', userId)
    .eq('equipment_id', equipmentId)
    .gte('created_at', recentTime.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}

// Check if a recent bag creation post exists within 24 hours
async function findRecentBagCreationPost(userId: string, bagId: string): Promise<any | null> {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const { data, error } = await supabase
    .from('feed_posts')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'bag_update')
    .gte('created_at', twentyFourHoursAgo.toISOString())
    .order('created_at', { ascending: false });

  if (error || !data) return null;

  // Find a post for this specific bag
  return data.find(post => 
    post.content?.bag_id === bagId && 
    (post.content?.is_creation === true || post.content?.bag_name?.includes('Created'))
  );
}

// Smart create/update for bag creation
export async function smartCreateBagPost(userId: string, bagId: string, bagName: string) {
  console.log('Smart create bag post:', { userId, bagId, bagName });
  
  // For now, just create a new post - we can implement the update logic later
  // when we have a way to track which posts belong to which bags
  await createBagCreationPost(userId, bagId, bagName);
}

// Smart create/update for equipment addition
export async function smartCreateEquipmentPost(
  userId: string,
  bagId: string,
  bagName: string,
  equipmentName: string,
  equipmentId: string
) {
  console.log('Smart create equipment post:', { userId, bagId, bagName, equipmentName, equipmentId });
  
  // First check if there's a recent post for this specific equipment (within 24 hours)
  // This prevents duplicate posts when adding equipment and then immediately adding a photo
  const recentEquipmentPost = await findRecentEquipmentPost(userId, equipmentId, 24);
  
  if (recentEquipmentPost) {
    console.log('Found recent post for this equipment, skipping duplicate creation');
    return; // Don't create duplicate
  }
  
  // Check if there's a recent bag creation post we should update instead
  const recentBagPost = await findRecentBagCreationPost(userId, bagId);
  
  if (recentBagPost && (!recentBagPost.equipment_id || recentBagPost.equipment_id !== equipmentId)) {
    console.log('Found recent bag creation post, updating it instead of creating new one');
    
    // Update the existing post to mention the equipment
    const updatedContent = {
      ...recentBagPost.content,
      recent_additions: [
        ...(recentBagPost.content.recent_additions || []),
        {
          equipment_name: equipmentName,
          equipment_id: equipmentId,
          added_at: new Date().toISOString()
        }
      ],
      caption: `Just created ${bagName} and added ${equipmentName}! Building out my setup 🏌️`
    };

    const { error } = await supabase
      .from('feed_posts')
      .update({ 
        content: updatedContent,
        equipment_id: equipmentId, // Track the equipment in the post
        updated_at: new Date().toISOString()
      })
      .eq('id', recentBagPost.id);

    if (error) {
      console.error('Error updating feed post:', error);
      // Fall back to creating a new post
      await createEquipmentAddedPost(userId, bagId, bagName, equipmentName, equipmentId);
    } else {
      console.log('Successfully updated existing feed post with equipment');
    }
  } else {
    // No recent post found or it's for different equipment, create a new one
    await createEquipmentAddedPost(userId, bagId, bagName, equipmentName, equipmentId);
  }
}

// Smart create/update for bag updates
export async function smartCreateBagUpdatePost(
  userId: string,
  bagId: string,
  bagName: string,
  changes: string[]
) {
  console.log('Smart create bag update post:', { userId, bagId, bagName, changes });
  
  // Check if there's a recent post for this bag
  const recentPost = await findRecentBagCreationPost(userId, bagId);
  
  if (recentPost) {
    console.log('Found recent bag post, updating it with changes');
    
    // Update the existing post to reflect the changes
    const updatedContent = {
      ...recentPost.content,
      recent_changes: [
        ...(recentPost.content.recent_changes || []),
        ...changes.map(change => ({
          change,
          changed_at: new Date().toISOString()
        }))
      ],
      caption: recentPost.content.caption + ' (Updated)'
    };

    const { error } = await supabase
      .from('feed_posts')
      .update({ 
        content: updatedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', recentPost.id);

    if (error) {
      console.error('Error updating feed post:', error);
      // Fall back to creating a new post
      await createBagUpdatePost(userId, bagId, bagName, changes);
    } else {
      console.log('Successfully updated existing feed post with changes');
    }
  } else {
    // No recent post found, create a new one
    await createBagUpdatePost(userId, bagId, bagName, changes);
  }
}