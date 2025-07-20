import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import PostCard from './PostCard';
import PostEditor from './PostEditor';
import { Eye, Lock, Pin, MessageSquare, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ThreadViewProps {
  threadId: string;
  categorySlug?: string;
}

interface Post {
  id: string;
  content: string;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string;
    badges?: any[];
  };
  reactions: {
    tee: number;
    helpful: number;
    fire: number;
    user_reaction?: string;
  };
}

export default function ThreadView({ threadId, categorySlug }: ThreadViewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [thread, setThread] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const postsPerPage = 20;
  const observerRef = useRef<IntersectionObserver>();
  const lastPostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (threadId) {
      fetchThread();
      incrementViewCount();
    }
  }, [threadId]);

  useEffect(() => {
    fetchPosts();
  }, [threadId, page]);

  // Lazy loading with intersection observer
  useEffect(() => {
    if (loading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (lastPostRef.current) {
      observerRef.current.observe(lastPostRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore]);

  const fetchThread = async () => {
    if (!threadId) return;
    
    try {
      setError(null);
      const { data, error } = await supabase
        .from('forum_threads')
        .select(`
          *,
          category:forum_categories(id, name, slug, icon),
          user:profiles(id, username, avatar_url)
        `)
        .eq('id', threadId)
        .single();

      if (error) throw error;
      if (!data) {
        setError('Thread not found');
        return;
      }
      setThread(data);
    } catch (error) {
      console.error('Error fetching thread:', error);
      setError('Failed to load thread. Please try again.');
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const from = (page - 1) * postsPerPage;
      const to = from + postsPerPage - 1;

      const { data, error, count } = await supabase
        .from('forum_posts')
        .select(`
          *,
          user:profiles(id, username, avatar_url)
        `, { count: 'exact' })
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
        .range(from, to);

      if (error) throw error;

      // Fetch reactions for each post
      const postsWithReactions = await Promise.all(
        (data || []).map(async (post) => {
          const { data: reactions } = await supabase
            .from('forum_reactions')
            .select('reaction_type, user_id')
            .eq('post_id', post.id);

          const reactionCounts = {
            tee: 0,
            helpful: 0,
            fire: 0,
            user_reaction: undefined as string | undefined
          };

          reactions?.forEach((r) => {
            reactionCounts[r.reaction_type as keyof typeof reactionCounts]++;
            if (user && r.user_id === user.id) {
              reactionCounts.user_reaction = r.reaction_type;
            }
          });

          return { ...post, reactions: reactionCounts };
        })
      );

      if (page === 1) {
        setPosts(postsWithReactions);
      } else {
        setPosts((prev) => [...prev, ...postsWithReactions]);
      }

      setHasMore((count || 0) > to + 1);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async () => {
    try {
      // Direct update approach
      const { data: currentThread } = await supabase
        .from('forum_threads')
        .select('views')
        .eq('id', threadId)
        .single();
      
      if (currentThread) {
        await supabase
          .from('forum_threads')
          .update({ views: (currentThread.views || 0) + 1 })
          .eq('id', threadId);
      }
    } catch (error) {
      console.error('Error incrementing view count:', error);
      // Non-critical error, don't break the page
    }
  };

  const handleReply = async () => {
    if (!user || !replyContent.trim()) return;

    setIsReplying(true);
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .insert({
          thread_id: threadId,
          user_id: user.id,
          content: replyContent
        })
        .select(`
          *,
          user:profiles(id, username, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Update thread's updated_at
      await supabase
        .from('forum_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', threadId);

      // Add the new post to the list
      setPosts((prev) => [...prev, { ...data, reactions: { tee: 0, helpful: 0, fire: 0 } }]);
      setReplyContent('');
    } catch (error) {
      console.error('Error posting reply:', error);
    } finally {
      setIsReplying(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="bg-[#1a1a1a] border-white/10 p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
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
                fetchThread();
                fetchPosts();
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
            {thread.category.icon} {thread.category.name}
          </span>
          <span>Started by {thread.user.username}</span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {thread.views} views
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            {posts.length} replies
          </span>
          <span>
            {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
          </span>
        </div>

        {(thread.is_pinned || thread.is_locked) && (
          <div className="flex gap-2 mt-4">
            {thread.is_pinned && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                Pinned Thread
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

      {/* Posts */}
      <div className="space-y-4 mb-6">
        {posts.map((post, index) => (
          <div
            key={post.id}
            ref={index === posts.length - 1 ? lastPostRef : null}
          >
            <PostCard post={post} threadLocked={thread.is_locked} />
          </div>
        ))}
      </div>

      {/* Reply Editor */}
      {user && !thread.is_locked && (
        <div className="bg-[#1a1a1a] rounded-lg border border-white/10 p-6">
          <h3 className="text-lg font-semibold mb-4">Post a Reply</h3>
          <PostEditor
            value={replyContent}
            onChange={setReplyContent}
            placeholder="Share your thoughts..."
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

      {thread.is_locked && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
          <Lock className="h-5 w-5 text-yellow-500 mx-auto mb-2" />
          <p className="text-yellow-400">This thread is locked and no longer accepting replies.</p>
        </div>
      )}
    </div>
  );
}