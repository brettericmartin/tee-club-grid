import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Users, Filter, Sparkles, Loader2, Plus, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FeedCardEnhanced } from '@/components/feed/FeedCardEnhanced';
import { UnifiedPhotoUploadDialog } from '@/components/shared/UnifiedPhotoUploadDialog';
import { getEnhancedFeedPosts } from '@/services/feedServiceEnhanced';

const Feed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'following'>('all');
  const [displayCount, setDisplayCount] = useState(12);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    loadFeed();
  }, [filter, user]);

  const loadFeed = async () => {
    try {
      setLoading(true);
      const feedPosts = await getEnhancedFeedPosts(user?.id, filter);
      setPosts(feedPosts);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayedPosts = posts.slice(0, displayCount);
  const hasMore = displayCount < posts.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-black py-8 pt-24">
        <div className="max-w-3xl mx-auto px-4">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-8">
      <div className="max-w-7xl mx-auto px-4 pb-24">

        {/* Filter Section */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-primary hover:bg-primary/90' : 'glass-button'}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              All
            </Button>
            {user && (
              <Button
                variant={filter === 'following' ? 'default' : 'outline'}
                onClick={() => setFilter('following')}
                className={filter === 'following' ? 'bg-primary hover:bg-primary/90' : 'glass-button'}
              >
                <Users className="w-4 h-4 mr-2" />
                Following
              </Button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="glass-button ml-auto">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass-card">
              <DropdownMenuLabel className="text-white">Filter by</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem className="text-white/70 hover:text-white">
                <Trophy className="w-4 h-4 mr-2" />
                Equipment Photos
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white/70 hover:text-white">
                Bag Updates
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white/70 hover:text-white">
                New Equipment
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white/70 hover:text-white">
                New Bags
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Feed Posts */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {displayedPosts.length > 0 ? (
            displayedPosts.map((post) => (
              <FeedCardEnhanced key={post.id} post={post} onUpdate={loadFeed} />
            ))
          ) : (
            !loading && <div className="col-span-full text-center py-8 text-white/60">No posts to display</div>
          )}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="mt-12 text-center">
            <Button
              onClick={() => setDisplayCount(prev => prev + 12)}
              variant="outline"
              size="lg"
              className="glass-button"
            >
              Load More
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && posts.length === 0 && (
          <div className="text-center py-20">
            <div className="glass-card p-12 max-w-md mx-auto">
              <Trophy className="w-16 h-16 text-white/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Posts Yet</h3>
              <p className="text-white/70">
                {filter === 'following' 
                  ? "Follow some golfers to see their updates!"
                  : "Be the first to share your golf journey!"}
              </p>
              {user && (
                <Button 
                  className="mt-4 bg-primary hover:bg-primary/90"
                  onClick={() => window.location.href = '/my-bag'}
                >
                  Create Your Bag
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {user && (
        <div className="fixed bottom-6 right-6 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="lg"
                className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-[shadow,transform] duration-200 hover:scale-110"
              >
                <Plus className="w-6 h-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="glass-card mb-2">
              <DropdownMenuItem 
                onClick={() => setShowUploadModal(true)}
                className="text-white/90 hover:text-white cursor-pointer"
              >
                <Camera className="w-4 h-4 mr-2" />
                Share Equipment Photo
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => window.location.href = '/my-bag'}
                className="text-white/90 hover:text-white cursor-pointer"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Update My Bag
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Photo Upload Dialog */}
      <UnifiedPhotoUploadDialog
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={() => {
          loadFeed();
        }}
        context={{
          type: 'general'
        }}
        initialCaption=""
      />
    </div>
  );
};

export default Feed;