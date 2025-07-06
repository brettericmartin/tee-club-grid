import { useState } from 'react';
import { FeedItemCard } from '@/components/FeedItemCard';
import { feedData } from '@/data/feedData';
import { Button } from '@/components/ui/button';

const Feed = () => {
  const [displayCount, setDisplayCount] = useState(9);
  const [showFollowedOnly, setShowFollowedOnly] = useState(false);

  const filteredData = showFollowedOnly 
    ? feedData.filter(item => item.isFromFollowed)
    : feedData;

  const displayedItems = filteredData.slice(0, displayCount);
  const hasMore = displayCount < filteredData.length;

  const handleLoadMore = () => {
    setDisplayCount(prev => Math.min(prev + 6, filteredData.length));
  };

  const handleLike = (postId: string) => {
    // Handle like functionality
    console.log('Liked post:', postId);
  };

  const handleFollow = (userId: string) => {
    // Handle follow functionality
    console.log('Followed user:', userId);
  };

  return (
    <div className="min-h-screen pt-6 pb-20">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">
            Your Feed
          </h1>
          <p className="text-muted-foreground text-lg">
            Discover the latest from golfers you follow
          </p>
        </div>

        {/* Filter Controls */}
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant={showFollowedOnly ? "secondary" : "default"}
            onClick={() => setShowFollowedOnly(!showFollowedOnly)}
            size="sm"
          >
            {showFollowedOnly ? 'Show All Posts' : 'Following Only'}
          </Button>
          
          {showFollowedOnly && (
            <div className="text-sm text-muted-foreground">
              Showing posts from {filteredData.length} followed golfers
            </div>
          )}
        </div>

        {/* Feed Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {displayedItems.map((item) => (
            <FeedItemCard
              key={item.postId}
              item={item}
              onLike={handleLike}
              onFollow={handleFollow}
            />
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="flex justify-center">
            <Button
              onClick={handleLoadMore}
              variant="outline"
              size="lg"
              className="min-w-32"
            >
              Load More
            </Button>
          </div>
        )}

        {/* Empty State */}
        {filteredData.length === 0 && (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-medium text-foreground mb-2">
                No posts from followed golfers
              </h3>
              <p className="text-muted-foreground mb-6">
                Follow some golfers in the Bags section to see their latest posts here.
              </p>
              <Button onClick={() => setShowFollowedOnly(false)}>
                Show All Posts
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;