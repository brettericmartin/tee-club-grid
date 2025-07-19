import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, MessageCircle } from 'lucide-react';
import { 
  getPostComments, 
  subscribeToComments, 
  type Comment 
} from '@/services/comments';
import CommentInput from './CommentInput';
import CommentThread from './CommentThread';
import { toast } from 'sonner';

interface CommentSectionProps {
  postId: string;
  onCommentCountChange?: (count: number) => void;
}

export default function CommentSection({ postId, onCommentCountChange }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(true); // Always show comments in modal
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    if (showComments) {
      loadComments();
    }
  }, [showComments, postId]);

  useEffect(() => {
    if (!showComments) return;

    // Subscribe to real-time updates
    const unsubscribe = subscribeToComments(
      postId,
      (newComment) => {
        setComments(prev => {
          // Add to root if no parent, otherwise add to parent's replies
          if (!newComment.parent_comment_id) {
            return [...prev, newComment];
          }
          
          // Deep clone and add to parent
          return addReplyToComment(prev, newComment);
        });
        
        // Update count
        const totalCount = countAllComments(comments) + 1;
        onCommentCountChange?.(totalCount);
      },
      (updatedComment) => {
        setComments(prev => updateCommentInTree(prev, updatedComment));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [showComments, postId, comments]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await getPostComments(postId, user?.id);
      setComments(data);
      
      // Update count
      const totalCount = countAllComments(data);
      onCommentCountChange?.(totalCount);
    } catch (error) {
      toast.error('Failed to load comments');
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentAdded = (comment: Comment) => {
    if (!comment.parent_comment_id) {
      setComments(prev => [...prev, comment]);
    } else {
      setComments(prev => addReplyToComment(prev, comment));
    }
    setReplyingTo(null);
    
    // Update count
    const totalCount = countAllComments(comments) + 1;
    onCommentCountChange?.(totalCount);
  };

  const addReplyToComment = (comments: Comment[], newReply: Comment): Comment[] => {
    return comments.map(comment => {
      if (comment.id === newReply.parent_comment_id) {
        return {
          ...comment,
          replies: [...(comment.replies || []), newReply]
        };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: addReplyToComment(comment.replies, newReply)
        };
      }
      return comment;
    });
  };

  const updateCommentInTree = (comments: Comment[], updated: Comment): Comment[] => {
    return comments.map(comment => {
      if (comment.id === updated.id) {
        return { ...comment, ...updated };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentInTree(comment.replies, updated)
        };
      }
      return comment;
    });
  };

  const countAllComments = (comments: Comment[]): number => {
    return comments.reduce((count, comment) => {
      return count + 1 + (comment.replies ? countAllComments(comment.replies) : 0);
    }, 0);
  };

  // Load comments immediately when component mounts
  useEffect(() => {
    loadComments();
  }, [postId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium">Comments</h3>
      </div>

      {user && !replyingTo && (
        <CommentInput
          postId={postId}
          onCommentAdded={handleCommentAdded}
          placeholder="Add a comment..."
        />
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-white/60" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-white/60">
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => (
            <CommentThread
              key={comment.id}
              comment={comment}
              onReply={setReplyingTo}
              replyingTo={replyingTo}
              onCommentAdded={handleCommentAdded}
              depth={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}