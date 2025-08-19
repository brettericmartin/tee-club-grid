import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageSquare, Users, TrendingUp, MessageCircle, Clock, Flame } from 'lucide-react';
import ThreadList from '@/components/forum/ThreadList';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ForumStats {
  totalThreads: number;
  totalPosts: number;
  activeUsers: number;
  latestThreads: any[];
}

export default function Forum() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<ForumStats>({
    totalThreads: 0,
    totalPosts: 0,
    activeUsers: 0,
    latestThreads: []
  });
  const [sortBy, setSortBy] = useState<'latest' | 'hot'>('latest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchForumStats();
  }, []);

  const fetchForumStats = async () => {
    try {
      setError(null);
      // Fetch total threads
      const { count: threadCount } = await supabase
        .from('forum_threads')
        .select('*', { count: 'exact' });

      // Fetch total posts
      const { count: postCount } = await supabase
        .from('forum_posts')
        .select('*', { count: 'exact' });

      // Fetch latest threads
      const { data: latestThreads } = await supabase
        .from('forum_threads')
        .select(`
          *,
          category:forum_categories(name, icon),
          user:profiles(username, avatar_url),
          posts:forum_posts(count)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch active users (users who posted in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: activeUsers } = await supabase
        .from('forum_posts')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .then(result => {
          const uniqueUsers = new Set(result.data?.map(post => post.user_id) || []);
          return { data: uniqueUsers.size };
        });

      setStats({
        totalThreads: threadCount || 0,
        totalPosts: postCount || 0,
        activeUsers: activeUsers || 0,
        latestThreads: latestThreads || []
      });
    } catch (error) {
      console.error('Error fetching forum stats:', error);
      setError('Failed to load forum data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Community Forum</h1>
              <p className="text-gray-400">Connect with fellow golfers, share tips, and discuss equipment</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Sort Toggle */}
              <Button
                variant={sortBy === 'latest' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('latest')}
                className={cn(
                  "gap-2",
                  sortBy === 'latest' ? "bg-white/10" : "bg-transparent"
                )}
              >
                <Clock className="w-4 h-4" />
                Latest
              </Button>
              <Button
                variant={sortBy === 'hot' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('hot')}
                className={cn(
                  "gap-2",
                  sortBy === 'hot' ? "bg-white/10" : "bg-transparent"
                )}
              >
                <Flame className="w-4 h-4" />
                Hot
              </Button>
              
              {user && (
                <Button 
                  onClick={() => navigate('/forum/new')}
                  className="bg-green-600 hover:bg-green-700 ml-2"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  New Thread
                </Button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white/5 border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Threads</p>
                  <p className="text-2xl font-bold">{stats.totalThreads}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-green-500" />
              </div>
            </Card>
            <Card className="bg-white/5 border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Posts</p>
                  <p className="text-2xl font-bold">{stats.totalPosts}</p>
                </div>
                <MessageCircle className="w-8 h-8 text-blue-500" />
              </div>
            </Card>
            <Card className="bg-white/5 border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Users</p>
                  <p className="text-2xl font-bold">{stats.activeUsers}</p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </Card>
            <Card className="bg-white/5 border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Hot Topics</p>
                  <p className="text-2xl font-bold">{stats.latestThreads.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}
        
        {/* Thread List */}
        <ThreadList sortBy={sortBy} />

        {/* Latest Activity Sidebar */}
        {stats.latestThreads.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4">Latest Activity</h2>
            <div className="space-y-3">
              {stats.latestThreads.map((thread) => (
                <Card 
                  key={thread.id} 
                  className="bg-white/5 border-white/10 p-4 hover:bg-white/10 cursor-pointer transition-colors"
                  onClick={() => navigate(`/forum/thread/${thread.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{thread.category?.icon}</span>
                        <span className="text-sm text-gray-400">{thread.category?.name}</span>
                      </div>
                      <h3 className="font-medium mb-1 line-clamp-1">{thread.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>by {thread.user?.username}</span>
                        <span>{thread.posts?.length || 0} replies</span>
                      </div>
                    </div>
                    {thread.is_pinned && (
                      <Badge variant="secondary" className="ml-2">
                        Pinned
                      </Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}