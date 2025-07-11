import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, TrendingUp, Clock, Heart, DollarSign, Users, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BagCard } from "@/components/bags/BagCard";
import { getBags } from "@/services/bags";
import { useAuth } from "@/contexts/AuthContext";
import { useLikedBags } from "@/hooks/useLikedBags";
import { toggleFollow } from "@/services/users";
import { toast } from "sonner";

type SortOption = "trending" | "newest" | "most-liked" | "following" | "price-high" | "price-low";
type HandicapRange = "all" | "0-5" | "6-15" | "16+";
type PriceRange = "all" | "under-2k" | "2k-5k" | "5k+";

const BagsBrowser = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bags, setBags] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [handicapRange, setHandicapRange] = useState<HandicapRange>("all");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const { likedBags, toggleLike } = useLikedBags();
  const [followedBags, setFollowedBags] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadBags();
  }, [sortBy, user]);

  // Debug: Log user authentication status
  useEffect(() => {
    console.log('BagsBrowser user auth status:', { 
      user: user?.id, 
      email: user?.email, 
      isAuthenticated: !!user 
    });
  }, [user]);

  const loadBags = async () => {
    try {
      setLoading(true);
      const data = await getBags({
        sortBy: sortBy,
        userId: user?.id
      });
      setBags(data || []);
    } catch (error) {
      console.error('Error loading bags:', error);
      toast.error('Failed to load bags');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort bags
  const filteredBags = useMemo(() => {
    let filtered = bags;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
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
  }, [searchQuery, sortBy, handicapRange, priceRange, likedBags, followedBags, bags]);

  const handleToggleLike = async (bagId: string) => {
    if (!user) {
      toast.error('Please sign in to like bags');
      return;
    }
    
    const success = await toggleLike(bagId);
    if (!success) {
      toast.error('Failed to update like');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

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
          {(searchQuery || sortBy !== "newest" || handicapRange !== "all" || priceRange !== "all") && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSortBy("newest");
                setHandicapRange("all");
                setPriceRange("all");
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Results count */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            Showing {filteredBags.length} bag{filteredBags.length !== 1 ? 's' : ''}
            {searchQuery && (
              <span> for "{searchQuery}"</span>
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

        {/* Empty state */}
        {filteredBags.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏌️</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No bags found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search terms or filters
            </p>
            <Button 
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSortBy("newest");
                setHandicapRange("all");
                setPriceRange("all");
              }}
            >
              Clear all filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BagsBrowser;