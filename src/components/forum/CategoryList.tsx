import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Clock } from 'lucide-react';

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
  thread_count?: number;
  post_count?: number;
  latest_thread?: {
    id: string;
    title: string;
    created_at: string;
    user: {
      username: string;
    };
  };
}

export default function CategoryList() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      // Fetch categories
      const { data: categoriesData, error } = await supabase
        .from('forum_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Fetch stats for each category
      const categoriesWithStats = await Promise.all(
        (categoriesData || []).map(async (category) => {
          // Get thread count
          const { count: threadCount } = await supabase
            .from('forum_threads')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id);

          // Get post count
          const { count: postCount } = await supabase
            .from('forum_posts')
            .select('*', { count: 'exact', head: true })
            .in('thread_id', 
              supabase
                .from('forum_threads')
                .select('id')
                .eq('category_id', category.id)
            );

          // Get latest thread
          const { data: latestThread } = await supabase
            .from('forum_threads')
            .select(`
              id,
              title,
              created_at,
              user:profiles(username, display_name)
            `)
            .eq('category_id', category.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...category,
            thread_count: threadCount || 0,
            post_count: postCount || 0,
            latest_thread: latestThread
          };
        })
      );

      setCategories(categoriesWithStats);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to load categories. Please try again.');
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

  if (error) {
    return (
      <Card className="bg-white/5 border-white/10 p-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button 
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchCategories();
          }}
          className="text-primary hover:underline"
        >
          Try again
        </button>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white/5 border-white/10 p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <div className="flex gap-6">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {categories.map((category) => (
        <Card 
          key={category.id}
          className="bg-white/5 border-white/10 p-6 hover:bg-white/10 cursor-pointer transition-colors"
          onClick={() => navigate(`/forum/category/${category.slug}`)}
        >
          <div className="flex items-start gap-4">
            {/* Category Icon */}
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center text-2xl">
              {category.icon}
            </div>

            {/* Category Info */}
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-1">{category.name}</h3>
              <p className="text-gray-400 mb-4">{category.description}</p>

              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">{category.thread_count} threads</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">{category.post_count} posts</span>
                </div>
              </div>
            </div>

            {/* Latest Activity */}
            {category.latest_thread && (
              <div className="hidden md:block text-right text-sm">
                <p className="text-gray-400 mb-1">Latest activity</p>
                <p className="font-medium line-clamp-1 mb-1">{category.latest_thread.title}</p>
                <div className="flex items-center gap-2 text-gray-400 justify-end">
                  <span>by {category.latest_thread.user.display_name || category.latest_thread.user.username}</span>
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeAgo(category.latest_thread.created_at)}</span>
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}