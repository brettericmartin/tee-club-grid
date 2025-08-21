import { supabase } from '@/lib/supabase';

/**
 * Forum Admin Service
 * Provides administrative functions for forum management
 */

/**
 * Check if a user is an admin
 * Uses the new admins table for consistency with other admin features
 */
export async function isUserAdmin(userId?: string): Promise<boolean> {
  if (!userId) return false;
  
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      // PGRST116 means "not found" - user is not admin
      if (error.code === 'PGRST116') {
        return false;
      }
      console.error('Error checking admin status:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Lock or unlock a forum thread
 */
export async function setThreadLocked(threadId: string, locked: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('forum_threads')
      .update({ 
        is_locked: locked,
        updated_at: new Date().toISOString()
      })
      .eq('id', threadId);
    
    if (error) {
      console.error('Error updating thread lock status:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating thread lock status:', error);
    return { success: false, error: 'Failed to update thread' };
  }
}

/**
 * Pin or unpin a forum thread
 */
export async function setThreadPinned(threadId: string, pinned: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('forum_threads')
      .update({ 
        is_pinned: pinned,
        updated_at: new Date().toISOString()
      })
      .eq('id', threadId);
    
    if (error) {
      console.error('Error updating thread pin status:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating thread pin status:', error);
    return { success: false, error: 'Failed to update thread' };
  }
}

/**
 * Delete a forum post (admin only)
 */
export async function deleteForumPost(postId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First check if this post has replies
    const { data: replies } = await supabase
      .from('forum_posts')
      .select('id')
      .eq('parent_post_id', postId)
      .limit(1);
    
    if (replies && replies.length > 0) {
      // If it has replies, just mark it as deleted/edited
      const { error } = await supabase
        .from('forum_posts')
        .update({ 
          content: '[This post has been removed by an administrator]',
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId);
      
      if (error) {
        console.error('Error soft-deleting post:', error);
        return { success: false, error: error.message };
      }
    } else {
      // If no replies, actually delete it
      const { error } = await supabase
        .from('forum_posts')
        .delete()
        .eq('id', postId);
      
      if (error) {
        console.error('Error deleting post:', error);
        return { success: false, error: error.message };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting post:', error);
    return { success: false, error: 'Failed to delete post' };
  }
}

/**
 * Delete a forum thread (admin only)
 */
export async function deleteForumThread(threadId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete all posts in the thread first
    const { error: postsError } = await supabase
      .from('forum_posts')
      .delete()
      .eq('thread_id', threadId);
    
    if (postsError) {
      console.error('Error deleting thread posts:', postsError);
      return { success: false, error: 'Failed to delete thread posts' };
    }
    
    // Then delete the thread itself
    const { error: threadError } = await supabase
      .from('forum_threads')
      .delete()
      .eq('id', threadId);
    
    if (threadError) {
      console.error('Error deleting thread:', threadError);
      return { success: false, error: threadError.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting thread:', error);
    return { success: false, error: 'Failed to delete thread' };
  }
}

/**
 * Get list of all admin users
 * Uses the new admins table with joined profile information
 */
export async function getAdminUsers(): Promise<{ id: string; username: string; display_name?: string }[]> {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select(`
        user_id,
        profiles!inner(username, display_name)
      `)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching admin users:', error);
      return [];
    }
    
    // Transform the joined data to match the expected format
    const adminUsers = (data || []).map(admin => ({
      id: admin.user_id,
      username: (admin as any).profiles?.username || '',
      display_name: (admin as any).profiles?.display_name
    }));
    
    return adminUsers;
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return [];
  }
}