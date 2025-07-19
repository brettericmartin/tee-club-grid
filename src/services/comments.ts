import { supabase } from '@/lib/supabase';

export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  tees_count: number;
  downvotes_count: number;
  parent_comment_id: string | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  user_has_teed?: boolean;
  user_has_downvoted?: boolean;
  replies?: Comment[];
}

export interface CreateCommentInput {
  post_id: string;
  content: string;
  parent_comment_id?: string;
}

// Get comments for a post
export async function getPostComments(postId: string, userId?: string) {
  try {
    // Get all comments for the post
    const { data: comments, error } = await supabase
      .from('feed_comments')
      .select('*, user_id')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!comments) return [];

    // Fetch profiles for all comment authors
    const userIds = [...new Set(comments.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // If user is logged in, check their tees and downvotes
    let userTees: string[] = [];
    let userDownvotes: string[] = [];

    if (userId) {
      const [teesResult, downvotesResult] = await Promise.all([
        supabase
          .from('comment_tees')
          .select('comment_id')
          .eq('user_id', userId)
          .in('comment_id', comments.map(c => c.id)),
        supabase
          .from('comment_downvotes')
          .select('comment_id')
          .eq('user_id', userId)
          .in('comment_id', comments.map(c => c.id))
      ]);

      userTees = teesResult.data?.map(t => t.comment_id) || [];
      userDownvotes = downvotesResult.data?.map(d => d.comment_id) || [];
    }

    // Build comment tree and add user interaction data
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // First pass: create all comments
    comments.forEach(comment => {
      const enrichedComment: Comment = {
        ...comment,
        profiles: profileMap.get(comment.user_id),
        user_has_teed: userTees.includes(comment.id),
        user_has_downvoted: userDownvotes.includes(comment.id),
        replies: []
      };
      commentMap.set(comment.id, enrichedComment);
    });

    // Second pass: build tree structure
    comments.forEach(comment => {
      const enrichedComment = commentMap.get(comment.id)!;
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies!.push(enrichedComment);
        }
      } else {
        rootComments.push(enrichedComment);
      }
    });

    return rootComments;
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
}

// Create a new comment
export async function createComment(userId: string, input: CreateCommentInput) {
  try {
    const { data, error } = await supabase
      .from('feed_comments')
      .insert({
        user_id: userId,
        post_id: input.post_id,
        content: input.content,
        parent_comment_id: input.parent_comment_id
      })
      .select()
      .single();

    if (error) throw error;

    // Fetch profile for the new comment
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', userId)
      .single();

    return {
      ...data,
      profiles: profile,
      user_has_teed: false,
      user_has_downvoted: false,
      replies: []
    };
  } catch (error) {
    console.error('Error creating comment:', error);
    throw error;
  }
}

// Update a comment
export async function updateComment(commentId: string, userId: string, content: string) {
  try {
    const { data, error } = await supabase
      .from('feed_comments')
      .update({ content })
      .eq('id', commentId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating comment:', error);
    throw error;
  }
}

// Delete a comment (soft delete by setting content)
export async function deleteComment(commentId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('feed_comments')
      .update({ 
        content: '[Comment deleted by user]',
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

// Toggle tee on a comment
export async function toggleCommentTee(commentId: string, userId: string) {
  try {
    // Check if already teed
    const { data: existing } = await supabase
      .from('comment_tees')
      .select('id')
      .eq('user_id', userId)
      .eq('comment_id', commentId)
      .single();

    if (existing) {
      // Remove tee
      const { error } = await supabase
        .from('comment_tees')
        .delete()
        .eq('id', existing.id);

      if (error) throw error;
      return { teed: false };
    } else {
      // Add tee
      const { error } = await supabase
        .from('comment_tees')
        .insert({
          user_id: userId,
          comment_id: commentId
        });

      if (error) throw error;
      return { teed: true };
    }
  } catch (error) {
    console.error('Error toggling comment tee:', error);
    throw error;
  }
}

// Toggle downvote on a comment
export async function toggleCommentDownvote(commentId: string, userId: string) {
  try {
    // Check if already downvoted
    const { data: existing } = await supabase
      .from('comment_downvotes')
      .select('id')
      .eq('user_id', userId)
      .eq('comment_id', commentId)
      .single();

    if (existing) {
      // Remove downvote
      const { error } = await supabase
        .from('comment_downvotes')
        .delete()
        .eq('id', existing.id);

      if (error) throw error;
      return { downvoted: false };
    } else {
      // Remove any existing tee first (can't tee and downvote)
      await supabase
        .from('comment_tees')
        .delete()
        .eq('user_id', userId)
        .eq('comment_id', commentId);

      // Add downvote
      const { error } = await supabase
        .from('comment_downvotes')
        .insert({
          user_id: userId,
          comment_id: commentId
        });

      if (error) throw error;
      return { downvoted: true };
    }
  } catch (error) {
    console.error('Error toggling comment downvote:', error);
    throw error;
  }
}

// Subscribe to comment updates for a post
export function subscribeToComments(
  postId: string,
  onCommentAdded: (comment: Comment) => void,
  onCommentUpdated: (comment: Comment) => void
) {
  const channel = supabase
    .channel(`comments:${postId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'feed_comments',
        filter: `post_id=eq.${postId}`
      },
      async (payload) => {
        // Fetch full comment data
        const { data } = await supabase
          .from('feed_comments')
          .select('*')
          .eq('id', payload.new.id)
          .single();

        if (data) {
          // Fetch profile separately
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', data.user_id)
            .single();

          onCommentAdded({
            ...data,
            profiles: profile,
            user_has_teed: false,
            user_has_downvoted: false,
            replies: []
          } as Comment);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'feed_comments',
        filter: `post_id=eq.${postId}`
      },
      (payload) => {
        onCommentUpdated(payload.new as Comment);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Get comment count for multiple posts (for feed)
export async function getPostCommentCounts(postIds: string[]) {
  try {
    const { data, error } = await supabase
      .from('feed_posts')
      .select('id, comment_count')
      .in('id', postIds);

    if (error) throw error;

    return data?.reduce((acc, post) => {
      acc[post.id] = post.comment_count;
      return acc;
    }, {} as Record<string, number>) || {};
  } catch (error) {
    console.error('Error fetching comment counts:', error);
    throw error;
  }
}

// Report a comment (for moderation)
export async function reportComment(
  commentId: string,
  userId: string,
  reason: 'spam' | 'inappropriate' | 'harassment' | 'other',
  details?: string
) {
  try {
    // Create a moderation request (would need a moderation table)
    // For now, just add multiple downvotes to trigger auto-hide
    const { error } = await supabase
      .from('comment_downvotes')
      .insert({
        user_id: userId,
        comment_id: commentId
      });

    if (error && error.code !== '23505') throw error; // Ignore duplicate key error

    // TODO: Implement proper moderation queue
    console.log('Comment reported:', { commentId, reason, details });

    return true;
  } catch (error) {
    console.error('Error reporting comment:', error);
    throw error;
  }
}