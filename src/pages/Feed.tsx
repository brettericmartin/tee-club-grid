import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Users, Filter, Sparkles, Loader2, Plus, Camera, Lock, Clock, Flame, ChevronDown, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useFeed } from '@/contexts/FeedContext';
import { useNavigate } from 'react-router-dom';
import { type FeedSortOption } from '@/utils/feedSorting';
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
import { CreatePostModal } from '@/components/feed/CreatePostModal';
import { supabase } from '@/lib/supabase';
import Masonry from 'react-masonry-css';
// Animation imports temporarily disabled to fix dynamic import errors
// import { AnimatedPageWrapper, AnimatedGrid, ScrollReveal } from '@/components/animation/AnimatedPageWrapper';
// import { AnimatedLoader } from '@/components/loading/AnimatedLoader';

const FeedContent = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { allPosts, loading, error, loadMainFeed, updatePostLike, updateUserFollow, sortBy, setSortBy } = useFeed();
  const [filter, setFilter] = useState<'all' | 'following' | 'in-my-bags'>('all');
  const [displayCount, setDisplayCount] = useState(12);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [betaAccess, setBetaAccess] = useState<boolean | null>(null);
  const [publicBetaEnabled, setPublicBetaEnabled] = useState(false);

  useEffect(() => {
    loadMainFeed(filter, sortBy);
  }, [filter, sortBy, loadMainFeed]);

  const handleSortChange = (newSort: FeedSortOption) => {
    setSortBy(newSort);
    loadMainFeed(filter, newSort);
  };

  // Check beta access for posting
  useEffect(() => {
    const checkBetaAccess = async () => {
      // Check feature flags
      const { data: flags } = await supabase
        .from('feature_flags')
        .select('public_beta_enabled')
        .eq('id', 1)
        .single();
      
      if (flags?.public_beta_enabled) {
        setPublicBetaEnabled(true);
        setBetaAccess(true);
      } else if (profile) {
        setBetaAccess(profile.beta_access || false);
      } else {
        setBetaAccess(false);
      }
    };

    checkBetaAccess();
  }, [profile]);

  const handleLike = async (postId: string) => {
    if (!user) {
      console.log('User must be logged in to like posts');
      // Could show a sign-in modal here
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
        
        // Get updated count (don't use head: true to avoid hanging)
        const { data: countData, count } = await supabase
          .from('feed_likes')
          .select('id', { count: 'exact' })
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
        
        // Get updated count (don't use head: true to avoid hanging)
        const { data: countData, count } = await supabase
          .from('feed_likes')
          .select('id', { count: 'exact' })
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
    if (!user) {
      console.log('User must be logged in to follow');
      // Could show a sign-in modal here
      return;
    }
    if (user.id === userId) return;
    
    try {
      // Check current follow status
      const { data: existingFollow, error: fetchError } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();
      
      if (fetchError) {
        console.error('Error checking follow status:', fetchError);
        return;
      }
      
      let isNowFollowing = false;
      
      if (existingFollow) {
        // Unfollow
        const { error: deleteError } = await supabase
          .from('user_follows')
          .delete()
          .eq('id', existingFollow.id);
          
        if (deleteError) {
          console.error('Error unfollowing:', deleteError);
          return;
        }
        isNowFollowing = false;
      } else {
        // Follow
        const { error: insertError } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: userId
          });
          
        if (insertError) {
          console.error('Error following:', insertError);
          return;
        }
        isNowFollowing = true;
      }
      
      // Update the follow status in feed context
      updateUserFollow(userId, isNowFollowing);
      
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

        {/* Mobile Filter Bar */}
        <div className="sm:hidden sticky top-16 z-40 -mx-4 px-4 py-2 bg-black/95 backdrop-blur border-b border-white/10 mb-4">
          {/* Sort Options Row */}
          <div className="flex gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSortChange('new')}
              className={`flex-1 min-h-[44px] rounded-md transition-all ${
                sortBy === 'new' 
                  ? 'bg-primary text-black font-medium' 
                  : 'text-white/70 hover:text-white bg-[#1a1a1a]'
              }`}
            >
              <Clock className="w-4 h-4 mr-1.5" />
              New
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSortChange('hot')}
              className={`flex-1 min-h-[44px] rounded-md transition-all ${
                sortBy === 'hot' 
                  ? 'bg-primary text-black font-medium' 
                  : 'text-white/70 hover:text-white bg-[#1a1a1a]'
              }`}
            >
              <Flame className="w-4 h-4 mr-1.5" />
              Hot
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSortChange('top')}
              className={`flex-1 min-h-[44px] rounded-md transition-all ${
                sortBy === 'top' 
                  ? 'bg-primary text-black font-medium' 
                  : 'text-white/70 hover:text-white bg-[#1a1a1a]'
              }`}
            >
              <Trophy className="w-4 h-4 mr-1.5" />
              Top
            </Button>
          </div>
          
          {/* Filter Options Row */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between min-h-[44px] bg-[#1a1a1a] text-white/70 hover:text-white"
                  >
                    <span className="flex items-center">
                      {filter === 'all' && <><Sparkles className="w-4 h-4 mr-1.5" /> All</>}
                      {filter === 'following' && <><Users className="w-4 h-4 mr-1.5" /> Following</>}
                      {filter === 'in-my-bags' && <><Package className="w-4 h-4 mr-1.5" /> In My Bags</>}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-[#1a1a1a] border-white/10">
                  <DropdownMenuItem
                    onClick={() => setFilter('all')}
                    className="text-white/90 hover:text-white cursor-pointer focus:bg-white/10"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    All Posts
                  </DropdownMenuItem>
                  {user && (
                    <>
                      <DropdownMenuItem
                        onClick={() => setFilter('following')}
                        className="text-white/90 hover:text-white cursor-pointer focus:bg-white/10"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Following
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setFilter('in-my-bags')}
                        className="text-white/90 hover:text-white cursor-pointer focus:bg-white/10"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        In My Bags
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="min-h-[44px] min-w-[44px] text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Filter className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#1a1a1a] border-white/10">
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
        </div>

        {/* Desktop Filter Section with Create Post Button */}
        <div className="hidden sm:flex flex-wrap items-center gap-4 mb-6">
          {/* Sort Options */}
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'new' ? 'default' : 'outline'}
              onClick={() => handleSortChange('new')}
              className={sortBy === 'new' ? 'bg-primary hover:bg-primary/90' : 'bg-[#2a2a2a] text-white border-white/10 hover:bg-[#3a3a3a]'}
            >
              <Clock className="w-4 h-4 mr-2" />
              New
            </Button>
            <Button
              variant={sortBy === 'hot' ? 'default' : 'outline'}
              onClick={() => handleSortChange('hot')}
              className={sortBy === 'hot' ? 'bg-primary hover:bg-primary/90' : 'bg-[#2a2a2a] text-white border-white/10 hover:bg-[#3a3a3a]'}
            >
              <Flame className="w-4 h-4 mr-2" />
              Hot
            </Button>
            <Button
              variant={sortBy === 'top' ? 'default' : 'outline'}
              onClick={() => handleSortChange('top')}
              className={sortBy === 'top' ? 'bg-primary hover:bg-primary/90' : 'bg-[#2a2a2a] text-white border-white/10 hover:bg-[#3a3a3a]'}
            >
              <Trophy className="w-4 h-4 mr-2" />
              Top
            </Button>
          </div>

          {/* Filter Options */}
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-primary hover:bg-primary/90' : 'bg-[#2a2a2a] text-white border-white/10 hover:bg-[#3a3a3a]'}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              All
            </Button>
            {user && (
              <>
                <Button
                  variant={filter === 'following' ? 'default' : 'outline'}
                  onClick={() => setFilter('following')}
                  className={filter === 'following' ? 'bg-primary hover:bg-primary/90' : 'bg-[#2a2a2a] text-white border-white/10 hover:bg-[#3a3a3a]'}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Following
                </Button>
                <Button
                  variant={filter === 'in-my-bags' ? 'default' : 'outline'}
                  onClick={() => setFilter('in-my-bags')}
                  className={filter === 'in-my-bags' ? 'bg-primary hover:bg-primary/90' : 'bg-[#2a2a2a] text-white border-white/10 hover:bg-[#3a3a3a]'}
                >
                  <Package className="w-4 h-4 mr-2" />
                  In My Bags
                </Button>
              </>
            )}
          </div>

          {/* Create Post Button - Centered */}
          {user && (
            <div className="flex-1 flex justify-center">
              {betaAccess ? (
                <Button
                  onClick={() => setShowCreatePost(true)}
                  size="default"
                  className="bg-primary hover:bg-primary/90 text-black font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Post
                </Button>
              ) : (
                <Button
                  onClick={() => navigate('/waitlist')}
                  size="default"
                  variant="outline"
                  className="border-primary/50 text-primary hover:bg-primary/10"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Join Beta to Post
                </Button>
              )}
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-[#2a2a2a] text-white border-white/10 hover:bg-[#3a3a3a]">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#1a1a1a] border-white/10">
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
        
        {/* Mobile Floating Action Button */}
        {/* Mobile FAB - positioned above navigation */}
        {user && (
          <div className="sm:hidden">
            {betaAccess ? (
              <button
                onClick={() => setShowCreatePost(true)}
                className="fixed bottom-24 right-4 z-[60] w-14 h-14 bg-primary hover:bg-primary/90 text-black rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all flex items-center justify-center group"
                aria-label="Create new post"
              >
                <Plus className="w-6 h-6" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/waitlist')}
                className="fixed bottom-24 right-4 z-[60] w-14 h-14 bg-gray-800 hover:bg-gray-700 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all flex items-center justify-center"
                aria-label="Join beta to post"
              >
                <Lock className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Feed Posts - Masonry Layout */}
        {displayedPosts.length > 0 ? (
          <Masonry
            breakpointCols={{
              default: 3,  // 3 columns on xl screens
              1280: 3,     // xl breakpoint
              768: 2,      // md breakpoint - 2 columns
              640: 1       // mobile - 1 column
            }}
            className="flex -ml-6 w-auto"
            columnClassName="pl-6 bg-clip-padding"
          >
            {displayedPosts.map((post) => (
              <div key={post.postId} className="mb-6">
                <FeedItemCard 
                  post={post} 
                  currentUserId={user?.id}
                  onLike={handleLike}
                  onFollow={handleFollow}
                />
              </div>
            ))}
          </Masonry>
        ) : (
          !loading && <div className="text-center py-8 text-white/60">No posts to display</div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="mt-12 text-center">
            <Button
              onClick={() => setDisplayCount(prev => prev + 12)}
              variant="outline"
              size="lg"
              className="bg-[#2a2a2a] text-white border-white/10 hover:bg-[#3a3a3a]"
            >
              Load More
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && allPosts.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-12 max-w-md mx-auto">
              <Trophy className="w-16 h-16 text-white/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Posts Yet</h3>
              <p className="text-white/70">
                {filter === 'following' 
                  ? "Follow some golfers to see their updates!"
                  : filter === 'in-my-bags'
                  ? "Add equipment to your bag to see related posts!"
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
                className="min-w-[56px] min-h-[56px] rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-[shadow,transform] duration-200 hover:scale-110"
              >
                <Plus className="w-6 h-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="bg-[#1a1a1a] border-white/10 mb-2">
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

      {/* Create Post Modal */}
      {/* Only show create post modal if user has beta access */}
      {betaAccess && (
        <CreatePostModal
          isOpen={showCreatePost}
          onClose={() => setShowCreatePost(false)}
          onSuccess={() => {
            setShowCreatePost(false);
            loadMainFeed(filter); // Refresh feed after posting
          }}
        />
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