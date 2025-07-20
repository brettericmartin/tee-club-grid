import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ThreadCard from './ThreadCard';
import { useAuth } from '@/contexts/AuthContext';
import CreateThread from './CreateThread';
import { Plus, SortAsc } from 'lucide-react';

interface ThreadListProps {
  categorySlug?: string;
  sortBy?: 'latest' | 'hot';
}

interface Thread {
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
      avatar_url: string;
    };
  };
}

export default function ThreadList({ categorySlug, sortBy: propSortBy }: ThreadListProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalSortBy, setInternalSortBy] = useState<'latest' | 'oldest' | 'most-replies' | 'most-viewed'>('latest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [category, setCategory] = useState<any>(null);

  const threadsPerPage = 20;

  // Determine which sortBy to use
  const effectiveSortBy = propSortBy === 'hot' ? 'most-replies' : 
                         propSortBy === 'latest' ? 'latest' : 
                         internalSortBy;

  useEffect(() => {
    if (categorySlug) {
      fetchCategory();
    }
    fetchThreads();
  }, [categorySlug, effectiveSortBy, page, propSortBy]);

  const fetchCategory = async () => {
    try {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('slug', categorySlug)
        .single();

      if (error) throw error;
      setCategory(data);
    } catch (error) {
      console.error('Error fetching category:', error);
    }
  };

  const fetchThreads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('forum_threads')
        .select(`
          *,
          category:forum_categories!inner(id, name, slug, icon),
          user:profiles!inner(id, username, display_name, avatar_url)
        `, { count: 'exact' });

      // Filter by category if provided
      if (categorySlug) {
        query = query.eq('category.slug', categorySlug);
      }

      // Apply sorting
      switch (effectiveSortBy) {
        case 'latest':
          query = query.order('updated_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'most-viewed':
          query = query.order('views', { ascending: false });
          break;
        case 'most-replies':
          // For hot topics, we'll sort by post count after fetching
          query = query.order('updated_at', { ascending: false });
          break;
      }

      // Always pin threads at the top
      query = query.order('is_pinned', { ascending: false });

      // Pagination
      const from = (page - 1) * threadsPerPage;
      const to = from + threadsPerPage - 1;
      query = query.range(from, to);

      const { data: threadsData, error, count } = await query;

      if (error) throw error;

      // Calculate total pages
      if (count) {
        setTotalPages(Math.ceil(count / threadsPerPage));
      }

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
              user:profiles(username, display_name, avatar_url)
            `)
            .eq('thread_id', thread.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...thread,
            post_count: postCount || 0,
            latest_post: latestPost
          };
        })
      );

      // Sort by most replies if needed
      if (effectiveSortBy === 'most-replies') {
        threadsWithStats.sort((a, b) => b.post_count - a.post_count);
      }

      setThreads(threadsWithStats);
    } catch (error) {
      console.error('Error fetching threads:', error);
      setError('Failed to load threads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleThreadClick = (thread: Thread) => {
    navigate(`/forum/${thread.category.slug}/${thread.id}`);
  };

  if (error) {
    return (
      <div className="bg-[#1a1a1a] rounded-lg border border-white/10 p-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Button
          onClick={() => fetchThreads()}
          variant="outline"
        >
          Try again
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          {category ? (
            <div className="flex items-center gap-3">
              <span className="text-3xl">{category.icon}</span>
              <div>
                <h1 className="text-2xl font-bold">{category.name}</h1>
                <p className="text-gray-400">{category.description}</p>
              </div>
            </div>
          ) : (
            <h1 className="text-2xl font-bold">All Threads</h1>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!propSortBy && (
            <Select value={internalSortBy} onValueChange={(value: any) => setInternalSortBy(value)}>
              <SelectTrigger className="w-40 bg-[#1a1a1a] border-white/10">
                <SortAsc className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="latest">Latest Activity</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="most-replies">Most Replies</SelectItem>
                <SelectItem value="most-viewed">Most Viewed</SelectItem>
              </SelectContent>
            </Select>
          )}

          {user && (
            <Button
              className="bg-[#10B981] hover:bg-[#0ea674]"
              onClick={() => setShowCreateThread(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Thread
            </Button>
          )}
        </div>
      </div>

      {/* Thread List */}
      <div className="space-y-3">
        {threads.length === 0 ? (
          <div className="text-center py-12 bg-[#1a1a1a] rounded-lg border border-white/10">
            <p className="text-gray-400 mb-4">No threads in this category yet</p>
            {user && (
              <Button
                className="bg-[#10B981] hover:bg-[#0ea674]"
                onClick={() => setShowCreateThread(true)}
              >
                Start the first discussion
              </Button>
            )}
          </div>
        ) : (
          threads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              onClick={() => handleThreadClick(thread)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            {totalPages > 5 && <span className="px-2">...</span>}
            {totalPages > 5 && (
              <Button
                variant={page === totalPages ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPage(totalPages)}
              >
                {totalPages}
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create Thread Modal */}
      <CreateThread
        open={showCreateThread}
        onOpenChange={setShowCreateThread}
        defaultCategory={categorySlug}
      />
    </div>
  );
}