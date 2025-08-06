import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Users, Filter, Sparkles, Loader2, Plus, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useFeed } from '@/contexts/FeedContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FeedItemCard } from '@/components/FeedItemCard';
import { FeedErrorBoundary } from '@/components/FeedErrorBoundary';
import { supabase } from '@/lib/supabase';
// Animation imports temporarily disabled to fix dynamic import errors
// import { AnimatedPageWrapper, AnimatedGrid, ScrollReveal } from '@/components/animation/AnimatedPageWrapper';
// import { AnimatedLoader } from '@/components/loading/AnimatedLoader';

const FeedContent = () => {
  const { user } = useAuth();
  const { allPosts, loading, error, loadMainFeed, updatePostLike } = useFeed();
  const [filter, setFilter] = useState<'all' | 'following'>('all');
  const [displayCount, setDisplayCount] = useState(12);

  useEffect(() => {
    loadMainFeed(filter);
  }, [filter, loadMainFeed]);

  const handleLike = async (postId: string) => {
    if (!user) {
      console.error('No user found for like action');
      return;
    }
    
    console.log('Attempting to toggle like for post:', postId, 'by user:', user.id);
    
    try {
      // Toggle like in database using the correct table
      const { data: existingLike, error: fetchError } = await supabase
        .from('feed_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error when no record exists
      
      if (fetchError) {
        console.error('Error checking existing like:', fetchError);
        throw fetchError;
      }
      
      if (existingLike) {
        // Unlike
        console.log('Unliking post:', postId);
        const { error: deleteError } = await supabase
          .from('feed_likes')
          .delete()
          .eq('id', existingLike.id);
          
        if (deleteError) {
          console.error('Error deleting like:', deleteError);
          throw deleteError;
        }
        console.log('Successfully unliked post');
        
        // Get updated count
        const { count } = await supabase
          .from('feed_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId);
        
        // Update the post in the feed context
        updatePostLike(postId, false, count || 0);
      } else {
        // Like
        console.log('Liking post:', postId);
        const { error: insertError } = await supabase
          .from('feed_likes')
          .insert({
            user_id: user.id,
            post_id: postId
          });
          
        if (insertError) {
          console.error('Error inserting like:', insertError);
          throw insertError;
        }
        console.log('Successfully liked post');
        
        // Get updated count
        const { count } = await supabase
          .from('feed_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId);
        
        // Update the post in the feed context
        updatePostLike(postId, true, count || 1);
      }
      
      // Don't reload the entire feed - updatePostLike handles the state update
    } catch (error) {
      console.error('Error toggling like:', error);
      // You might want to show a toast here
      // toast.error('Failed to update like');
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user || user.id === userId) return;
    
    try {
      // Toggle follow in database
      const { data: existingFollow } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single();
      
      if (existingFollow) {
        // Unfollow
        await supabase
          .from('user_follows')
          .delete()
          .eq('id', existingFollow.id);
      } else {
        // Follow
        await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: userId
          });
      }
      
      // Don't reload the entire feed - let the UI handle optimistic updates
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const displayedPosts = allPosts.slice(0, displayCount);
  const hasMore = displayCount < allPosts.length;

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
              className={filter === 'all' ? 'bg-primary hover:bg-primary/90' : 'bg-white/10 backdrop-blur-[10px] text-white border-white/20 hover:bg-white/20'}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              All
            </Button>
            {user && (
              <Button
                variant={filter === 'following' ? 'default' : 'outline'}
                onClick={() => setFilter('following')}
                className={filter === 'following' ? 'bg-primary hover:bg-primary/90' : 'bg-white/10 backdrop-blur-[10px] text-white border-white/20 hover:bg-white/20'}
              >
                <Users className="w-4 h-4 mr-2" />
                Following
              </Button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-white/10 backdrop-blur-[10px] text-white border-white/20 hover:bg-white/20 ml-auto">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-gray-900/95 backdrop-blur-[10px] border-white/20">
              <DropdownMenuLabel className="text-white">Filter by</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem className="text-white/70 hover:text-white focus:bg-white/10">
                <Trophy className="w-4 h-4 mr-2" />
                Equipment Photos
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white/70 hover:text-white focus:bg-white/10">
                Bag Updates
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white/70 hover:text-white focus:bg-white/10">
                New Equipment
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white/70 hover:text-white focus:bg-white/10">
                New Bags
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Feed Posts */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {displayedPosts.length > 0 ? (
            displayedPosts.map((post) => (
              <FeedItemCard 
                key={post.postId} 
                post={post} 
                currentUserId={user?.id}
                onLike={handleLike}
                onFollow={handleFollow}
              />
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
              className="bg-white/10 backdrop-blur-[10px] text-white border-white/20 hover:bg-white/20"
            >
              Load More
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && allPosts.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-gray-900/60 backdrop-blur-[10px] border border-white/20 rounded-xl p-12 max-w-md mx-auto">
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
            <DropdownMenuContent align="end" side="top" className="bg-gray-900/95 backdrop-blur-[10px] border-white/20 mb-2">
              <DropdownMenuItem 
                onClick={() => window.location.href = '/equipment'}
                className="text-white/90 hover:text-white cursor-pointer focus:bg-white/10"
              >
                <Camera className="w-4 h-4 mr-2" />
                Browse Equipment
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => window.location.href = '/my-bag'}
                className="text-white/90 hover:text-white cursor-pointer focus:bg-white/10"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Update My Bag
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

    </div>
  );
};

const Feed = () => {
  return (
    <FeedErrorBoundary>
      <FeedContent />
    </FeedErrorBoundary>
  );
};

export default Feed;