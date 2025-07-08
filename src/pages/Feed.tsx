import { useState, useEffect } from 'react';
import { FeedItemCard } from '@/components/FeedItemCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { generateFeedFromBags } from '@/services/feed';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const Feed = () => {
  const [displayCount, setDisplayCount] = useState(9);
  const [showFollowedOnly, setShowFollowedOnly] = useState(false);
  const [feedData, setFeedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      setLoading(true);
      // Load bags from Supabase
      const { data: bags, error } = await supabase
        .from('user_bags')
        .select(`
          *,
          profile:profiles(*),
          bag_equipment(
            *,
            equipment(*)
          )
        `)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Generate feed items from bags
      const feedItems = generateFeedFromBags(bags || []);
      setFeedData(feedItems);
    } catch (error) {
      console.error('Error loading feed:', error);
      toast.error('Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-48 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Filter Toggle */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Your Feed</h1>
          <button
            onClick={() => setShowFollowedOnly(!showFollowedOnly)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFollowedOnly
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            {showFollowedOnly ? 'Following' : 'All Posts'}
          </button>
        </div>

        {/* Feed Items */}
        <div className="space-y-6">
          {displayedItems.map((item) => (
            <FeedItemCard
              key={item.id}
              item={item}
              onLike={handleLike}
              onFollow={handleFollow}
            />
          ))}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="mt-8 text-center">
            <Button
              onClick={handleLoadMore}
              variant="outline"
              size="lg"
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;