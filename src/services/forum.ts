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
    user_reaction?: string;
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
    avatar_url?: string;
  };
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
export async function getThreadPosts(threadId: string) {
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
  
  // Transform the data to match our interface
  const transformedPosts: ForumPostWithUser[] = posts.map(post => ({
    ...post,
    user: post.user || { id: post.user_id, username: 'Unknown User' },
    reactions: {
      tee: 0,
      helpful: 0,
      fire: 0,
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
        avatar_url
      )
    `)
    .eq('id', threadId)
    .single();
  
  if (error) {
    console.error('Error fetching thread details:', error);
    return { thread: null, error };
  }
  
  // Increment view count
  await supabase
    .from('forum_threads')
    .update({ view_count: (thread.view_count || 0) + 1 })
    .eq('id', threadId);
  
  return { thread: thread as ForumThreadWithDetails, error: null };
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