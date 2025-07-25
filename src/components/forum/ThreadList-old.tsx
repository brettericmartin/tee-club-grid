import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Eye, Clock, TrendingUp, Pin } from 'lucide-react';

interface ForumThread {
  id: string;
  title: string;
  slug: string;
  views: number;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string;
  };
  user: {
    id: string;
    username: string;
    avatar_url: string;
  };
  post_count: number;
  latest_post?: {
    created_at: string;
    user: {
      username: string;
    };
  };
  reaction_counts?: {
    tee: number;
    helpful: number;
    fire: number;
  };
}

interface ForumThreadListProps {
  categorySlug?: string;
  sortBy?: 'latest' | 'hot' | 'top';
  limit?: number;
}

export default function ForumThreadList({ categorySlug, sortBy = 'latest', limit = 20 }: ForumThreadListProps) {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThreads();
  }, [categorySlug, sortBy]);

  const fetchThreads = async () => {
    try {
      let query = supabase
        .from('forum_threads')
        .select(`
          *,
          category:forum_categories!inner(id, name, slug, icon),
          user:profiles!inner(id, username, avatar_url)
        `);

      // Filter by category if provided
      if (categorySlug) {
        query = query.eq('category.slug', categorySlug);
      }

      // Apply sorting
      if (sortBy === 'latest') {
        query = query.order('updated_at', { ascending: false });
      } else if (sortBy === 'hot') {
        // Hot topics: recent activity + high engagement
        query = query
          .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('views', { ascending: false });
      } else if (sortBy === 'top') {
        query = query.order('views', { ascending: false });
      }

      // Always pin threads at the top
      query = query.order('is_pinned', { ascending: false });

      const { data: threadsData, error } = await query.limit(limit);

      if (error) throw error;

      // Fetch additional stats for each thread
      const threadsWithStats = await Promise.all(
        (threadsData || []).map(async (thread) => {
          // Get post count
          const { count: postCount } = await supabase
            .from('forum_posts')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', thread.id);

          // Get latest post
          const { data: latestPost } = await supabase
            .from('forum_posts')
            .select(`
              created_at,
              user:profiles(username)
            `)
            .eq('thread_id', thread.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get reaction counts
          const { data: reactions } = await supabase
            .from('forum_reactions')
            .select('reaction_type')
            .in('post_id', 
              supabase
                .from('forum_posts')
                .select('id')
                .eq('thread_id', thread.id)
            );

          const reactionCounts = {
            tee: 0,
            helpful: 0,
            fire: 0
          };

          reactions?.forEach(r => {
            reactionCounts[r.reaction_type as keyof typeof reactionCounts]++;
          });

          return {
            ...thread,
            post_count: postCount || 0,
            latest_post: latestPost,
            reaction_counts: reactionCounts
          };
        })
      );

      setThreads(threadsWithStats);
    } catch (error) {
      console.error('Error fetching threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="bg-white/5 border-white/10 p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10 p-8 text-center">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-400 mb-4">No threads found</p>
        <p className="text-sm text-gray-500">Be the first to start a discussion!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {threads.map((thread) => (
        <Card 
          key={thread.id}
          className="bg-white/5 border-white/10 p-4 hover:bg-white/10 cursor-pointer transition-colors"
          onClick={() => navigate(`/forum/thread/${thread.id}`)}
        >
          <div className="flex items-start gap-3">
            {/* User Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-semibold">
              {thread.user.avatar_url ? (
                <img src={thread.user.avatar_url} alt={thread.user.username} className="w-full h-full rounded-full object-cover" />
              ) : (
                thread.user.username[0].toUpperCase()
              )}
            </div>

            {/* Thread Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                {thread.is_pinned && (
                  <Pin className="w-4 h-4 text-green-500 mt-0.5" />
                )}
                <h3 className="font-medium text-white line-clamp-2 flex-1">
                  {thread.title}
                </h3>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                <span className="flex items-center gap-1">
                  {thread.category.icon} {thread.category.name}
                </span>
                <span>by {thread.user.username}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(thread.created_at)}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-gray-300">
                  <MessageSquare className="w-4 h-4" />
                  {thread.post_count} replies
                </span>
                <span className="flex items-center gap-1 text-gray-300">
                  <Eye className="w-4 h-4" />
                  {thread.views} views
                </span>
                {thread.reaction_counts && thread.reaction_counts.fire > 0 && (
                  <span className="flex items-center gap-1 text-orange-400">
                    <TrendingUp className="w-4 h-4" />
                    {thread.reaction_counts.fire} hot
                  </span>
                )}
              </div>
            </div>

            {/* Latest Activity */}
            {thread.latest_post && (
              <div className="hidden md:block text-right text-sm text-gray-400">
                <p>Last reply</p>
                <p className="font-medium text-gray-300">{thread.latest_post.user.username}</p>
                <p>{formatTimeAgo(thread.latest_post.created_at)}</p>
              </div>
            )}
          </div>

          {/* Tags/Badges */}
          <div className="flex gap-2 mt-3">
            {thread.is_locked && (
              <Badge variant="secondary" className="text-xs">
                Locked
              </Badge>
            )}
            {thread.reaction_counts && thread.reaction_counts.helpful > 10 && (
              <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-400">
                Helpful
              </Badge>
            )}
            {thread.post_count > 50 && (
              <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-400">
                Popular
              </Badge>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}