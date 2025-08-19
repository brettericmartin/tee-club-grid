import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, TrendingUp, Clock, Heart, DollarSign, Users, Loader2, ShoppingBag } from "lucide-react";
import { TeedBallIcon } from "@/components/shared/TeedBallLike";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BagCard } from "@/components/bags/BagCard";
import { getBags } from "@/services/bags";
import { useAuth } from "@/contexts/AuthContext";
import { useLikedBags } from "@/hooks/useLikedBags";
import { toggleFollow, getUserFollowing } from "@/services/users";
import { toast } from "sonner";
import { DataLoader } from "@/components/shared/DataLoader";

type SortOption = "trending" | "newest" | "most-liked" | "following" | "price-high" | "price-low";
type HandicapRange = "all" | "0-5" | "6-15" | "16+";
type PriceRange = "all" | "under-2k" | "2k-5k" | "5k+";
type FilterOption = "all" | "teed" | "following";

const BagsBrowser = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, initialized } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [bags, setBags] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [handicapRange, setHandicapRange] = useState<HandicapRange>("all");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const { likedBags, toggleLike } = useLikedBags();
  const [followedBags, setFollowedBags] = useState<Set<string>>(new Set());
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Component unmount cleanup
    return () => {
      isMountedRef.current = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    // Load bags immediately - page is public
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    // Set new timeout
    loadingTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        loadBags();
        if (user) {
          loadFollowedUsers();
        }
      }
    }, 300); // 300ms debounce
    
    // Cleanup function
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [sortBy, user?.id]); // Fixed dependency to user?.id instead of user object


  const loadBags = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBags({
        sortBy: sortBy,
        userId: user?.id
      });
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setBags(data || []);
      }
    } catch (error) {
      console.error('Error loading bags:', error);
      if (isMountedRef.current) {
        setError(error as Error);
        setBags([]); // Ensure bags is always an array
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const loadFollowedUsers = async () => {
    if (!user) return;
    
    try {
      const following = await getUserFollowing(user.id);
      if (following && isMountedRef.current) {
        const followingIds = new Set(following.map(f => f.id));
        setFollowedBags(followingIds);
      }
    } catch (error) {
      console.error('Error loading followed users:', error);
    }
  };

  // Filter and sort bags
  const filteredBags = useMemo(() => {
    let filtered = bags;

    // Search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(bag => 
        bag.name.toLowerCase().includes(query) ||
        bag.profiles?.username?.toLowerCase().includes(query) ||
        bag.profiles?.display_name?.toLowerCase().includes(query) ||
        bag.bag_equipment?.some((be: any) => 
          be.equipment?.brand?.toLowerCase().includes(query) ||
          be.equipment?.model?.toLowerCase().includes(query)
        )
      );
    }

    // Handicap filter
    if (handicapRange !== "all") {
      filtered = filtered.filter(bag => {
        const handicap = bag.profiles?.handicap || 0;
        switch (handicapRange) {
          case "0-5": return handicap <= 5;
          case "6-15": return handicap >= 6 && handicap <= 15;
          case "16+": return handicap >= 16;
          default: return true;
        }
      });
    }

    // Price filter
    if (priceRange !== "all") {
      filtered = filtered.filter(bag => {
        const totalValue = bag.totalValue || 0;
        switch (priceRange) {
          case "under-2k": return totalValue < 2000;
          case "2k-5k": return totalValue >= 2000 && totalValue <= 5000;
          case "5k+": return totalValue > 5000;
          default: return true;
        }
      });
    }

    // Additional sorting for price options
    if (sortBy === 'price-high') {
      filtered.sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0));
    } else if (sortBy === 'price-low') {
      filtered.sort((a, b) => (a.totalValue || 0) - (b.totalValue || 0));
    }

    return filtered;
  }, [debouncedSearchQuery, handicapRange, priceRange, bags, sortBy]); // Use debouncedSearchQuery instead of searchQuery

  const handleToggleLike = async (bagId: string) => {
    if (!user) {
      toast.error('Please sign in to like bags');
      return;
    }
    
    // Optimistically update the bag's like count
    setBags(prevBags => prevBags.map(bag => {
      if (bag.id === bagId) {
        const isCurrentlyLiked = likedBags.has(bagId);
        return {
          ...bag,
          likes_count: isCurrentlyLiked ? bag.likes_count - 1 : bag.likes_count + 1
        };
      }
      return bag;
    }));
    
    const success = await toggleLike(bagId);
    if (!success) {
      toast.error('Failed to update like');
      // Revert the optimistic update
      setBags(prevBags => prevBags.map(bag => {
        if (bag.id === bagId) {
          const wasLiked = likedBags.has(bagId);
          return {
            ...bag,
            likes_count: wasLiked ? bag.likes_count + 1 : bag.likes_count - 1
          };
        }
        return bag;
      }));
    }
  };

  const handleToggleFollow = async (userId: string, username: string) => {
    console.log('BagsBrowser handleToggleFollow called:', { userId, username, currentUser: user?.id });
    
    if (!user) {
      toast.error('Please sign in to follow users');
      return;
    }
    
    try {
      console.log('Calling toggleFollow with:', { followerId: user.id, followingId: userId });
      const success = await toggleFollow(user.id, userId);
      console.log('toggleFollow result:', success);
      
      if (success) {
        // Update the followed bags state
        setFollowedBags(prev => {
          const newSet = new Set(prev);
          if (newSet.has(userId)) {
            newSet.delete(userId);
          } else {
            newSet.add(userId);
          }
          return newSet;
        });
      } else {
        toast.error('Failed to update follow status');
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    }
  };

  const handleViewBag = (bagId: string) => {
    console.log('Navigating to bag:', bagId);
    navigate(`/bag/${bagId}`);
  };

  const getSortIcon = (sort: SortOption) => {
    switch (sort) {
      case "trending": return <TrendingUp className="w-4 h-4" />;
      case "newest": return <Clock className="w-4 h-4" />;
      case "most-liked": return <Heart className="w-4 h-4" />;
      case "following": return <Users className="w-4 h-4" />;
      case "price-high":
      case "price-low": return <DollarSign className="w-4 h-4" />;
      default: return null;
    }
  };

  // Don't block on auth - bags browser is public

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Search players, bags, or equipment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base bg-card border-border"
          />
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-4 mb-8 p-4 bg-card rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filters:</span>
          </div>

          {/* Main Filter */}
          {user && (
            <Select value={filterBy} onValueChange={(value: FilterOption) => setFilterBy(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bags</SelectItem>
                <SelectItem value="teed">
                  <div className="flex items-center gap-2">
                    <TeedBallIcon className="w-4 h-4" />
                    Teed Bags
                  </div>
                </SelectItem>
                <SelectItem value="following">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Following
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Sort By */}
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-48">
              <div className="flex items-center gap-2">
                {getSortIcon(sortBy)}
                <SelectValue placeholder="Sort by" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Newest
                </div>
              </SelectItem>
              <SelectItem value="most-liked">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Most Liked
                </div>
              </SelectItem>
              {user && (
                <SelectItem value="following">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Following
                  </div>
                </SelectItem>
              )}
              <SelectItem value="price-high">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Price: High to Low
                </div>
              </SelectItem>
              <SelectItem value="price-low">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Price: Low to High
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Handicap Range */}
          <Select value={handicapRange} onValueChange={(value: HandicapRange) => setHandicapRange(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Handicap" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Handicaps</SelectItem>
              <SelectItem value="0-5">0-5 (Pro/Low)</SelectItem>
              <SelectItem value="6-15">6-15 (Mid)</SelectItem>
              <SelectItem value="16+">16+ (High)</SelectItem>
            </SelectContent>
          </Select>

          {/* Price Range */}
          <Select value={priceRange} onValueChange={(value: PriceRange) => setPriceRange(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Price Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prices</SelectItem>
              <SelectItem value="under-2k">Under $2,000</SelectItem>
              <SelectItem value="2k-5k">$2,000 - $5,000</SelectItem>
              <SelectItem value="5k+">$5,000+</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {(searchQuery || sortBy !== "newest" || handicapRange !== "all" || priceRange !== "all" || filterBy !== "all") && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSortBy("newest");
                setHandicapRange("all");
                setPriceRange("all");
                setFilterBy("all");
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Data Content with Loading/Error States */}
        <DataLoader
          loading={loading}
          error={error}
          empty={filteredBags.length === 0 && !loading}
          emptyMessage={searchQuery ? `No bags found for "${searchQuery}"` : "No bags found"}
          emptyIcon={<ShoppingBag className="w-16 h-16 text-white/30 mx-auto mb-4" />}
          loadingMessage="Loading bags..."
          onRetry={loadBags}
        >
          <>
            {/* Results count */}
            <div className="mb-6">
              <p className="text-muted-foreground">
                Showing {filteredBags.length} bag{filteredBags.length !== 1 ? 's' : ''}
                {searchQuery && (
                  <span> for "{searchQuery}"</span>
                )}
                {filterBy === "teed" && (
                  <span className="text-primary"> • Teed bags only</span>
                )}
                {filterBy === "following" && (
                  <span className="text-primary"> • From people you follow</span>
                )}
              </p>
            </div>

            {/* Bags Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBags.map((bag) => (
                <BagCard
                  key={bag.id}
                  bag={bag}
                  onView={handleViewBag}
                  onLike={() => handleToggleLike(bag.id)}
                  onFollow={handleToggleFollow}
                  isLiked={likedBags.has(bag.id)}
                  isFollowing={followedBags.has(bag.profiles?.id || '')}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          </>
        </DataLoader>
      </div>
    </div>
  );
};

export default BagsBrowser;