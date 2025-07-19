import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, X } from 'lucide-react';
import { createComment, type Comment } from '@/services/comments';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CommentInputProps {
  postId: string;
  parentCommentId?: string;
  onCommentAdded: (comment: Comment) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function CommentInput({
  postId,
  parentCommentId,
  onCommentAdded,
  onCancel,
  placeholder = 'Write a comment...',
  autoFocus = false
}: CommentInputProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) {
    return (
      <div className="p-4 bg-white/5 rounded-lg text-center">
        <p className="text-white/60 text-sm">Sign in to comment</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const comment = await createComment(user.id, {
        post_id: postId,
        content: content.trim(),
        parent_comment_id: parentCommentId
      });

      onCommentAdded(comment);
      setContent('');
      
      if (!parentCommentId) {
        toast.success('Comment posted');
      }
    } catch (error) {
      toast.error('Failed to post comment');
      console.error('Error posting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn(
      "space-y-2",
      parentCommentId && "ml-8 sm:ml-12"
    )}>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={isSubmitting}
        className={cn(
          "min-h-[80px] resize-none",
          "bg-white/5 border-white/10",
          "text-white placeholder:text-white/40",
          "focus:ring-1 focus:ring-primary/50"
        )}
      />
      
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">
          Press Ctrl+Enter to submit
        </p>
        
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
              className="text-white/60 hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          )}
          
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="w-4 h-4 mr-1" />
            {parentCommentId ? 'Reply' : 'Comment'}
          </Button>
        </div>
      </div>
    </div>
  );
}