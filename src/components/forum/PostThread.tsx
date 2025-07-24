import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import PostCard from './PostCard';
import PostEditor from './PostEditor';
import { createForumPost, type ForumPostWithUser } from '@/services/forum';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface PostThreadProps {
  posts: ForumPostWithUser[];
  threadId: string;
  isLocked?: boolean;
  onPostUpdate?: () => void;
  maxDepth?: number;
}

export default function PostThread({ 
  posts, 
  threadId, 
  isLocked = false,
  onPostUpdate,
  maxDepth = 4 
}: PostThreadProps) {
  const { user } = useAuth();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReply = async (parentPostId: string) => {
    if (!user || !replyContent.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await createForumPost({
        threadId,
        userId: user.id,
        content: replyContent.trim(),
        parentPostId
      });

      if (error) {
        toast.error('Failed to post reply');
        return;
      }

      toast.success('Reply posted successfully');
      setReplyContent('');
      setReplyingTo(null);
      
      // Refresh the posts
      if (onPostUpdate) {
        onPostUpdate();
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      toast.error('Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPost = (post: ForumPostWithUser) => {
    const depth = post.depth || 0;
    const canReply = !isLocked && user && depth < maxDepth;
    const isReplying = replyingTo === post.id;

    return (
      <div key={post.id} className="relative">
        {/* Thread line for nested posts */}
        {depth > 0 && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-[2px] bg-white/10"
            style={{ marginLeft: `${(depth - 1) * 24 + 12}px` }}
          />
        )}
        
        {/* Post card with indentation */}
        <div 
          className={cn(
            "relative transition-all",
            depth > 0 && "border-l-2 border-transparent hover:border-primary/30"
          )}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <PostCard
            post={post}
            onEdit={onPostUpdate}
            onDelete={onPostUpdate}
            showActions={true}
          />
          
          {/* Reply button */}
          {canReply && (
            <div className="flex items-center gap-2 mt-2 ml-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/60 hover:text-white hover:bg-white/10"
                onClick={() => setReplyingTo(isReplying ? null : post.id)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                {isReplying ? 'Cancel' : 'Reply'}
              </Button>
              {post.replies && post.replies.length > 0 && (
                <span className="text-sm text-white/40">
                  {post.replies.length} {post.replies.length === 1 ? 'reply' : 'replies'}
                </span>
              )}
            </div>
          )}
          
          {/* Reply editor */}
          {isReplying && (
            <div className="mt-3 ml-4">
              <div className="text-sm text-white/60 mb-2">
                Replying to @{post.user.username}
              </div>
              <PostEditor
                value={replyContent}
                onChange={setReplyContent}
                placeholder="Write your reply..."
                disabled={isSubmitting}
                minHeight="100px"
              />
              <div className="flex justify-end gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent('');
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-[#10B981] hover:bg-[#0ea674]"
                  onClick={() => handleReply(post.id)}
                  disabled={isSubmitting || !replyContent.trim()}
                >
                  {isSubmitting ? 'Posting...' : 'Post Reply'}
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Render nested replies */}
        {post.replies && post.replies.length > 0 && (
          <div className="mt-2">
            {post.replies.map(reply => renderPost(reply))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {posts.map(post => renderPost(post))}
    </div>
  );
}