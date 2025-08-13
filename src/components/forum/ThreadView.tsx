import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import PostThread from './PostThread';
import PostEditor from './PostEditor';
import { Eye, Lock, Pin, MessageSquare, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { 
  getThreadDetails, 
  getThreadPosts, 
  createForumPost, 
  type ForumPostWithUser, 
  type ForumThreadWithDetails 
} from '@/services/forum';
import { toast } from 'sonner';

interface ThreadViewProps {
  threadId: string;
  categorySlug?: string;
}

export default function ThreadView({ threadId, categorySlug }: ThreadViewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [thread, setThread] = useState<ForumThreadWithDetails | null>(null);
  const [posts, setPosts] = useState<ForumPostWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const fetchThreadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch thread details
      const { thread: threadData, error: threadError } = await getThreadDetails(threadId);
      if (threadError) throw threadError;
      if (!threadData) {
        setError('Thread not found');
        return;
      }
      setThread(threadData);
      
      // Fetch posts with tree structure
      const { posts: postsData, error: postsError } = await getThreadPosts(threadId);
      if (postsError) throw postsError;
      setPosts(postsData || []);
    } catch (error) {
      console.error('Error fetching thread data:', error);
      setError('Failed to load thread. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!user || !replyContent.trim()) return;

    // Save current scroll position
    const scrollPosition = window.scrollY;

    setIsReplying(true);
    try {
      const { error } = await createForumPost({
        threadId,
        userId: user.id,
        content: replyContent.trim(),
        parentPostId: null // Top-level reply
      });

      if (error) {
        toast.error('Failed to post reply');
        return;
      }

      toast.success('Reply posted successfully');
      setReplyContent('');
      
      // Refresh posts to show the new reply
      await fetchThreadData();
      
      // Restore scroll position after posts have loaded
      setTimeout(() => {
        window.scrollTo({ top: scrollPosition, behavior: 'instant' });
      }, 100);
    } catch (error) {
      console.error('Error posting reply:', error);
      toast.error('Failed to post reply');
    } finally {
      setIsReplying(false);
    }
  };

  useEffect(() => {
    fetchThreadData();
  }, [threadId]);

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card className="bg-[#1a1a1a] border-white/10 p-8 text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
            <Button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchThreadData();
              }}
            >
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (loading || !thread) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Mobile Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 lg:hidden"
        onClick={() => navigate(`/forum/${thread.category.slug}`)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to {thread.category.name}
      </Button>

      {/* Thread Header */}
      <div className="bg-[#1a1a1a] rounded-lg border border-white/10 p-6 mb-6">
        <div className="flex items-start gap-2 mb-4">
          {thread.is_pinned && (
            <Pin className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          )}
          {thread.is_locked && (
            <Lock className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          )}
          <h1 className="text-2xl font-bold flex-1">{thread.title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            Posted by {thread.user.display_name || thread.user.username}
          </span>
          <span>•</span>
          <span>
            {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {thread.view_count || 0} views
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            {thread.reply_count || 0} replies
          </span>
        </div>

        {/* Thread status badges */}
        {(thread.is_pinned || thread.is_locked) && (
          <div className="flex gap-2 mt-4">
            {thread.is_pinned && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                Pinned
              </Badge>
            )}
            {thread.is_locked && (
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                Thread Locked
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Posts with nested replies */}
      <div className="mb-6">
        <PostThread
          posts={posts}
          threadId={threadId}
          isLocked={thread.is_locked}
          categorySlug={thread.category.slug}
          onPostUpdate={fetchThreadData}
        />
      </div>

      {/* Reply Editor for top-level replies */}
      {user && !thread.is_locked && (
        <div className="bg-[#1a1a1a] rounded-lg border border-white/10 p-6">
          <h3 className="text-lg font-semibold mb-4">Post a Reply</h3>
          <PostEditor
            value={replyContent}
            onChange={setReplyContent}
            placeholder="Share your thoughts..."
            isSubmitting={isReplying}
          />
          <div className="flex justify-end mt-4">
            <Button
              className="bg-[#10B981] hover:bg-[#0ea674]"
              onClick={handleReply}
              disabled={isReplying || !replyContent.trim()}
            >
              {isReplying ? 'Posting...' : 'Post Reply'}
            </Button>
          </div>
        </div>
      )}

      {/* Thread locked message */}
      {thread.is_locked && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
          <Lock className="h-5 w-5 text-yellow-500 mx-auto mb-2" />
          <p className="text-yellow-400">This thread is locked and no longer accepting replies.</p>
        </div>
      )}
    </div>
  );
}