import { useState } from 'react';
import CommentCard from './CommentCard';
import CommentInput from './CommentInput';
import { type Comment } from '@/services/comments';
import { updateComment } from '@/services/comments';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface CommentThreadProps {
  comment: Comment;
  onReply: (commentId: string | null) => void;
  replyingTo: string | null;
  onCommentAdded: (comment: Comment) => void;
  depth: number;
}

export default function CommentThread({
  comment,
  onReply,
  replyingTo,
  onCommentAdded,
  depth
}: CommentThreadProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const handleEdit = (commentId: string, content: string) => {
    setIsEditing(true);
    setEditContent(content);
  };

  const handleSaveEdit = async () => {
    if (!user || !editContent.trim()) return;

    try {
      await updateComment(comment.id, user.id, editContent.trim());
      setIsEditing(false);
      toast.success('Comment updated');
    } catch (error) {
      toast.error('Failed to update comment');
      console.error('Error updating comment:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(comment.content);
  };

  return (
    <div>
      {isEditing ? (
        <div className={depth > 0 ? "ml-8 sm:ml-12" : ""}>
          <div className="space-y-2 p-3 bg-white/5 rounded-lg">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[80px] resize-none bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1 text-sm text-white/60 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editContent.trim()}
                className="px-3 py-1 text-sm bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        <CommentCard
          comment={comment}
          onReply={() => onReply(comment.id)}
          onEdit={handleEdit}
          depth={depth}
        />
      )}

      {replyingTo === comment.id && (
        <div className="mt-3">
          <CommentInput
            postId={comment.post_id}
            parentCommentId={comment.id}
            onCommentAdded={(newComment) => {
              onCommentAdded(newComment);
              onReply(null);
            }}
            onCancel={() => onReply(null)}
            placeholder={`Reply to ${comment.profiles?.display_name || comment.profiles?.username || 'Unknown'}...`}
            autoFocus
          />
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map(reply => (
            <CommentThread
              key={reply.id}
              comment={reply}
              onReply={onReply}
              replyingTo={replyingTo}
              onCommentAdded={onCommentAdded}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}