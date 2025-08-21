import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsDown, Reply, MoreVertical, Edit2, Trash2, Flag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { TeedBallLike } from '@/components/shared/TeedBallLike';
import { getDisplayName, getDisplayInitials } from '@/utils/displayName';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  toggleCommentTee, 
  toggleCommentDownvote,
  deleteComment,
  reportComment,
  type Comment 
} from '@/services/comments';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CommentCardProps {
  comment: Comment;
  onReply?: (commentId: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  depth: number;
}

export default function CommentCard({ comment, onReply, onEdit, depth }: CommentCardProps) {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [teesCount, setTeesCount] = useState(comment.tees_count);
  const [downvotesCount, setDownvotesCount] = useState(comment.downvotes_count);
  const [hasTeed, setHasTeed] = useState(comment.user_has_teed || false);
  const [hasDownvoted, setHasDownvoted] = useState(comment.user_has_downvoted || false);

  const isOwner = user?.id === comment.user_id;
  const isHidden = comment.is_hidden || downvotesCount >= 10;
  const isDeleted = comment.content === '[Comment deleted by user]';

  const handleTee = async () => {
    if (!user) {
      toast.error('Please sign in to tee comments');
      return;
    }

    try {
      const result = await toggleCommentTee(comment.id, user.id);
      setHasTeed(result.teed);
      setTeesCount(prev => result.teed ? prev + 1 : Math.max(0, prev - 1));
      
      // Remove downvote if teeing
      if (result.teed && hasDownvoted) {
        setHasDownvoted(false);
        setDownvotesCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      toast.error('Failed to update tee');
    }
  };

  const handleDownvote = async () => {
    if (!user) {
      toast.error('Please sign in to downvote comments');
      return;
    }

    try {
      const result = await toggleCommentDownvote(comment.id, user.id);
      setHasDownvoted(result.downvoted);
      setDownvotesCount(prev => result.downvoted ? prev + 1 : Math.max(0, prev - 1));
      
      // Remove tee if downvoting
      if (result.downvoted && hasTeed) {
        setHasTeed(false);
        setTeesCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      toast.error('Failed to update downvote');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    setIsDeleting(true);
    try {
      await deleteComment(comment.id, user!.id);
      toast.success('Comment deleted');
    } catch (error) {
      toast.error('Failed to delete comment');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReport = async () => {
    if (!user) {
      toast.error('Please sign in to report comments');
      return;
    }

    try {
      await reportComment(comment.id, user.id, 'inappropriate');
      toast.success('Comment reported. Thank you for helping keep our community safe.');
    } catch (error) {
      toast.error('Failed to report comment');
    }
  };

  return (
    <div 
      className={cn(
        "group",
        depth > 0 && "ml-8 sm:ml-12"
      )}
    >
      <div className={cn(
        "flex gap-3 p-3 rounded-lg transition-colors",
        "bg-white/5 hover:bg-white/10",
        isHidden && "opacity-50"
      )}>
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/20 text-white text-xs">
            {getDisplayInitials(comment.profiles)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-white text-sm">
                  {getDisplayName(comment.profiles)}
                </span>
                <span className="text-white/40 text-xs">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
                {comment.updated_at !== comment.created_at && (
                  <span className="text-white/40 text-xs">(edited)</span>
                )}
              </div>
              
              {isHidden && !isDeleted && (
                <p className="text-xs text-orange-400 mt-1">
                  Comment hidden due to community feedback
                </p>
              )}
            </div>

            {!isDeleted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-6 w-6 p-0 text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {isOwner && (
                    <>
                      <DropdownMenuItem onClick={() => onEdit?.(comment.id, comment.content)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-red-500"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                  {!isOwner && (
                    <DropdownMenuItem onClick={handleReport}>
                      <Flag className="w-4 h-4 mr-2" />
                      Report
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <p className={cn(
            "text-white/80 text-sm mt-1 whitespace-pre-wrap break-words",
            isDeleted && "italic text-white/40"
          )}>
            {comment.content}
          </p>

          {!isDeleted && (
            <div className="flex items-center gap-4 mt-2">
              <TeedBallLike
                isLiked={hasTeed}
                likeCount={teesCount}
                onLike={handleTee}
                size="sm"
                showCount={true}
                className="scale-75"
              />

              <button
                onClick={handleDownvote}
                className={cn(
                  "flex items-center gap-1 text-xs transition-colors",
                  hasDownvoted 
                    ? "text-red-500 hover:text-red-400" 
                    : "text-white/60 hover:text-white"
                )}
              >
                <ThumbsDown className="w-3 h-3" />
                {downvotesCount > 0 && downvotesCount}
              </button>

              {user && depth < 3 && (
                <button
                  onClick={() => onReply?.(comment.id)}
                  className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors"
                >
                  <Reply className="w-3 h-3" />
                  Reply
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}