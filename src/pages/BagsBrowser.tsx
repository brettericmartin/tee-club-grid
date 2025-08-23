import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, TrendingUp, Clock, Heart, DollarSign, Users, Loader2, ShoppingBag, ChevronDown } from "lucide-react";
import { TeedBallIcon } from "@/components/shared/TeedBallLike";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

        {/* Mobile Filter Bar */}
        <div className="sm:hidden mb-6">
          <div className="flex items-center gap-2">
            {/* Sort By Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 justify-between bg-card border-border min-h-[44px]"
                >
                  <span className="flex items-center gap-2">
                    {getSortIcon(sortBy)}
                    <span>Sort: {
                      sortBy === "newest" ? "Newest" :
                      sortBy === "most-liked" ? "Most Liked" :
                      sortBy === "following" ? "Following" :
                      sortBy === "price-high" ? "Price ↓" :
                      sortBy === "price-low" ? "Price ↑" : "Newest"
                    }</span>
                  </span>
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-[#1a1a1a] border-white/10">
                <DropdownMenuLabel className="text-white">Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem 
                  onClick={() => setSortBy("newest")}
                  className="text-white/90 hover:text-white focus:bg-white/10"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Newest
                  {sortBy === "newest" && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortBy("most-liked")}
                  className="text-white/90 hover:text-white focus:bg-white/10"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Most Liked
                  {sortBy === "most-liked" && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
                {user && (
                  <DropdownMenuItem 
                    onClick={() => setSortBy("following")}
                    className="text-white/90 hover:text-white focus:bg-white/10"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Following
                    {sortBy === "following" && <span className="ml-auto text-primary">✓</span>}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem 
                  onClick={() => setSortBy("price-high")}
                  className="text-white/90 hover:text-white focus:bg-white/10"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Price: High to Low
                  {sortBy === "price-high" && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortBy("price-low")}
                  className="text-white/90 hover:text-white focus:bg-white/10"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Price: Low to High
                  {sortBy === "price-low" && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className={`flex items-center gap-1.5 whitespace-nowrap min-h-[44px] px-4 ${
                    (filterBy !== "all" || handicapRange !== "all" || priceRange !== "all") 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-card border-border"
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                  {(filterBy !== "all" || handicapRange !== "all" || priceRange !== "all") && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                      {[filterBy !== "all", handicapRange !== "all", priceRange !== "all"].filter(Boolean).length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user && (
                  <>
                    <DropdownMenuLabel>Filter By</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setFilterBy("all")}>
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      All Bags {filterBy === "all" && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterBy("teed")}>
                      <TeedBallIcon className="w-4 h-4 mr-2" />
                      Teed Bags {filterBy === "teed" && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterBy("following")}>
                      <Users className="w-4 h-4 mr-2" />
                      Following {filterBy === "following" && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                <DropdownMenuLabel>Handicap Range</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setHandicapRange("all")}>
                  All Handicaps {handicapRange === "all" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHandicapRange("0-5")}>
                  0-5 (Pro/Low) {handicapRange === "0-5" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHandicapRange("6-15")}>
                  6-15 (Mid) {handicapRange === "6-15" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHandicapRange("16+")}>
                  16+ (High) {handicapRange === "16+" && "✓"}
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Price Range</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setPriceRange("all")}>
                  All Prices {priceRange === "all" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPriceRange("under-2k")}>
                  Under $2,000 {priceRange === "under-2k" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPriceRange("2k-5k")}>
                  $2,000 - $5,000 {priceRange === "2k-5k" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPriceRange("5k+")}>
                  Over $5,000 {priceRange === "5k+" && "✓"}
                </DropdownMenuItem>
                
                {(filterBy !== "all" || handicapRange !== "all" || priceRange !== "all") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => {
                        setFilterBy("all");
                        setHandicapRange("all");
                        setPriceRange("all");
                      }}
                      className="text-destructive"
                    >
                      Clear All Filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Desktop Filter Bar */}
        <div className="hidden sm:flex flex-wrap gap-4 mb-8 p-4 bg-card rounded-lg border border-border">
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