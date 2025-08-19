import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type ForumPost = Database['public']['Tables']['forum_posts']['Row'];
type ForumThread = Database['public']['Tables']['forum_threads']['Row'];

export interface ForumPostWithUser extends ForumPost {
  user: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
  reactions?: {
    tee: number;
    helpful: number;
    fire: number;
    fixed?: number;
    user_reactions?: string[];
  };
  replies?: ForumPostWithUser[];
  depth?: number;
}

export interface ForumThreadWithDetails extends ForumThread {
  category: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
  actual_reply_count?: number;
}

// Build a tree structure from flat list of posts
export function buildPostTree(posts: ForumPostWithUser[]): ForumPostWithUser[] {
  const postMap = new Map<string, ForumPostWithUser>();
  const rootPosts: ForumPostWithUser[] = [];
  
  // First pass: create a map of all posts
  posts.forEach(post => {
    postMap.set(post.id, { ...post, replies: [], depth: 0 });
  });
  
  // Second pass: build the tree structure
  posts.forEach(post => {
    const mappedPost = postMap.get(post.id)!;
    
    if (post.parent_post_id && postMap.has(post.parent_post_id)) {
      // This is a reply to another post
      const parentPost = postMap.get(post.parent_post_id)!;
      mappedPost.depth = (parentPost.depth || 0) + 1;
      parentPost.replies!.push(mappedPost);
    } else {
      // This is a root-level post
      rootPosts.push(mappedPost);
    }
  });
  
  // Sort root posts by creation date (oldest first)
  rootPosts.sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  // Sort replies within each post recursively
  const sortReplies = (post: ForumPostWithUser) => {
    if (post.replies && post.replies.length > 0) {
      post.replies.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      post.replies.forEach(sortReplies);
    }
  };
  
  rootPosts.forEach(sortReplies);
  
  return rootPosts;
}

// Fetch thread posts with user information and build tree structure
export async function getThreadPosts(threadId: string, userId?: string) {
  const { data: posts, error } = await supabase
    .from('forum_posts')
    .select(`
      *,
      user:profiles!forum_posts_user_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching thread posts:', error);
    return { posts: [], error };
  }

  // Get all post IDs for fetching reactions
  const postIds = posts.map(p => p.id);
  
  // Fetch reaction counts for all posts
  const { data: reactionCounts, error: reactionsError } = await supabase
    .from('forum_reactions')
    .select('post_id, reaction_type')
    .in('post_id', postIds);

  if (reactionsError) {
    console.error('Error fetching reaction counts:', reactionsError);
  }

  // Fetch current user's reactions if user is provided
  let userReactions: any[] = [];
  if (userId) {
    const { data, error: userReactionsError } = await supabase
      .from('forum_reactions')
      .select('post_id, reaction_type')
      .in('post_id', postIds)
      .eq('user_id', userId);

    if (userReactionsError) {
      console.error('Error fetching user reactions:', userReactionsError);
    } else {
      userReactions = data || [];
    }
  }

  // Build reaction counts and user reactions maps
  const reactionCountsMap: Record<string, { tee: number; helpful: number; fire: number; fixed: number }> = {};
  const userReactionsMap: Record<string, string[]> = {};

  // Initialize counts for all posts
  postIds.forEach(postId => {
    reactionCountsMap[postId] = { tee: 0, helpful: 0, fire: 0, fixed: 0 };
    userReactionsMap[postId] = [];
  });

  // Count reactions
  if (reactionCounts) {
    reactionCounts.forEach(reaction => {
      const counts = reactionCountsMap[reaction.post_id];
      if (counts && reaction.reaction_type in counts) {
        (counts as any)[reaction.reaction_type]++;
      }
    });
  }

  // Map user reactions
  userReactions.forEach(reaction => {
    if (!userReactionsMap[reaction.post_id]) {
      userReactionsMap[reaction.post_id] = [];
    }
    userReactionsMap[reaction.post_id].push(reaction.reaction_type);
  });
  
  // Transform the data to match our interface
  const transformedPosts: ForumPostWithUser[] = posts.map(post => ({
    ...post,
    user: post.user || { id: post.user_id, username: 'Unknown User' },
    reactions: {
      tee: reactionCountsMap[post.id]?.tee || 0,
      helpful: reactionCountsMap[post.id]?.helpful || 0,
      fire: reactionCountsMap[post.id]?.fire || 0,
      fixed: reactionCountsMap[post.id]?.fixed || 0,
      user_reactions: userReactionsMap[post.id] || []
    }
  }));
  
  // Build the tree structure
  const treePosts = buildPostTree(transformedPosts);
  
  return { posts: treePosts, error: null };
}

// Create a new forum post (can be a reply)
export async function createForumPost({
  threadId,
  userId,
  content,
  parentPostId
}: {
  threadId: string;
  userId: string;
  content: string;
  parentPostId?: string | null;
}) {
  const { data, error } = await supabase
    .from('forum_posts')
    .insert({
      thread_id: threadId,
      user_id: userId,
      content,
      parent_post_id: parentPostId,
      is_edited: false
    })
    .select(`
      *,
      user:profiles!forum_posts_user_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .single();
  
  if (error) {
    console.error('Error creating forum post:', error);
    return { post: null, error };
  }
  
  // Update thread reply count and last post info
  // First get current reply count
  const { data: threadData } = await supabase
    .from('forum_threads')
    .select('reply_count')
    .eq('id', threadId)
    .single();
  
  const currentCount = threadData?.reply_count || 0;
  
  const { error: updateError } = await supabase
    .from('forum_threads')
    .update({
      reply_count: currentCount + 1,
      last_post_at: new Date().toISOString(),
      last_post_by: userId,
      updated_at: new Date().toISOString()
    })
    .eq('id', threadId);
  
  if (updateError) {
    console.error('Error updating thread:', updateError);
  }
  
  const transformedPost: ForumPostWithUser = {
    ...data,
    user: data.user || { id: userId, username: 'Unknown User' },
    reactions: {
      tee: 0,
      helpful: 0,
      fire: 0,
      fixed: 0,
      user_reactions: []
    },
    replies: [],
    depth: 0
  };
  
  return { post: transformedPost, error: null };
}

// Count all nested replies for a post
export function countNestedReplies(post: ForumPostWithUser): number {
  let count = 0;
  
  if (post.replies && post.replies.length > 0) {
    count += post.replies.length;
    post.replies.forEach(reply => {
      count += countNestedReplies(reply);
    });
  }
  
  return count;
}

// Flatten a tree of posts for easier processing
export function flattenPostTree(posts: ForumPostWithUser[]): ForumPostWithUser[] {
  const flattened: ForumPostWithUser[] = [];
  
  const flatten = (postList: ForumPostWithUser[]) => {
    postList.forEach(post => {
      flattened.push(post);
      if (post.replies && post.replies.length > 0) {
        flatten(post.replies);
      }
    });
  };
  
  flatten(posts);
  return flattened;
}

// Get a single thread with details
export async function getThreadDetails(threadId: string) {
  const { data: thread, error } = await supabase
    .from('forum_threads')
    .select(`
      *,
      category:forum_categories!forum_threads_category_id_fkey (
        id,
        name,
        slug
      ),
      user:profiles!forum_threads_user_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('id', threadId)
    .single();
  
  if (error) {
    console.error('Error fetching thread details:', error);
    return { thread: null, error };
  }
  
  // Get actual reply count from posts table
  const { count: replyCount } = await supabase
    .from('forum_posts')
    .select('id', { count: 'exact' })
    .eq('thread_id', threadId);
  
  // Increment view count
  await supabase
    .from('forum_threads')
    .update({ 
      view_count: (thread.view_count || 0) + 1,
      reply_count: replyCount || 0  // Update stored count too
    })
    .eq('id', threadId);
  
  // Add actual reply count to thread data
  const threadWithStats = {
    ...thread,
    actual_reply_count: replyCount || 0,
    reply_count: replyCount || 0  // Override with actual count
  } as ForumThreadWithDetails;
  
  return { thread: threadWithStats, error: null };
}

// Update an existing post
export async function updateForumPost(postId: string, content: string) {
  const { data, error } = await supabase
    .from('forum_posts')
    .update({
      content,
      is_edited: true,
      edited_at: new Date().toISOString()
    })
    .eq('id', postId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating forum post:', error);
    return { post: null, error };
  }
  
  return { post: data, error: null };
}

// Delete a forum post (and all its nested replies due to CASCADE)
export async function deleteForumPost(postId: string) {
  const { error } = await supabase
    .from('forum_posts')
    .delete()
    .eq('id', postId);
  
  if (error) {
    console.error('Error deleting forum post:', error);
    return { success: false, error };
  }
  
  return { success: true, error: null };
}

// Get forum threads that mention a specific piece of equipment
export async function getForumThreadsByEquipment(equipmentId: string, limit = 10) {
  // First get all thread IDs that have posts with this equipment tagged
  const { data: taggedPosts, error: tagsError } = await supabase
    .from('forum_equipment_tags')
    .select('post_id')
    .eq('equipment_id', equipmentId);
  
  if (tagsError) {
    console.error('Error fetching equipment tags:', tagsError);
    return { threads: [], error: tagsError };
  }
  
  if (!taggedPosts || taggedPosts.length === 0) {
    return { threads: [], error: null };
  }
  
  // Get thread IDs from the posts
  const { data: posts, error: postsError } = await supabase
    .from('forum_posts')
    .select('thread_id')
    .in('id', taggedPosts.map(t => t.post_id));
  
  if (postsError) {
    console.error('Error fetching posts:', postsError);
    return { threads: [], error: postsError };
  }
  
  const threadIds = [...new Set(posts.map(p => p.thread_id))];
  
  // Now get the threads with all details
  const { data: threads, error: threadsError } = await supabase
    .from('forum_threads')
    .select(`
      *,
      category:forum_categories!forum_threads_category_id_fkey (
        id,
        name,
        slug,
        icon
      ),
      user:profiles!forum_threads_user_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .in('id', threadIds)
    .order('tee_count', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit);
  
  if (threadsError) {
    console.error('Error fetching threads:', threadsError);
    return { threads: [], error: threadsError };
  }
  
  return { threads: threads as ForumThreadWithDetails[], error: null };
}

// Tag equipment in a forum post
export async function tagEquipmentInPost(postId: string, equipmentIds: string[]) {
  if (!equipmentIds || equipmentIds.length === 0) {
    return { success: true, error: null };
  }
  
  const tags = equipmentIds.map(equipmentId => ({
    post_id: postId,
    equipment_id: equipmentId
  }));
  
  const { error } = await supabase
    .from('forum_equipment_tags')
    .insert(tags);
  
  if (error) {
    console.error('Error tagging equipment:', error);
    return { success: false, error };
  }
  
  return { success: true, error: null };
}

// Get equipment tags for a post
export async function getEquipmentTagsForPost(postId: string) {
  const { data: tags, error } = await supabase
    .from('forum_equipment_tags')
    .select(`
      equipment_id,
      equipment:equipment!forum_equipment_tags_equipment_id_fkey (
        id,
        brand,
        model,
        category,
        image_url
      )
    `)
    .eq('post_id', postId);
  
  if (error) {
    console.error('Error fetching equipment tags:', error);
    return { tags: [], error };
  }
  
  return { tags: tags || [], error: null };
}