import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, TrendingUp, Clock, Heart, DollarSign, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import BagCompositeCard from "@/components/BagCompositeCard";
import { bagsBrowserData, BagData } from "@/data/sampleBagsData";

type SortOption = "trending" | "newest" | "most-liked" | "following" | "price-high" | "price-low";
type HandicapRange = "all" | "0-5" | "6-15" | "16+";
type PriceRange = "all" | "under-2k" | "2k-5k" | "5k+";

const BagsBrowser = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("trending");
  const [handicapRange, setHandicapRange] = useState<HandicapRange>("all");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [likedBags, setLikedBags] = useState<Set<string>>(new Set());
  const [followedBags, setFollowedBags] = useState<Set<string>>(new Set());

  // Filter and sort bags
  const filteredBags = useMemo(() => {
    let filtered = bagsBrowserData.map(bag => ({
      ...bag,
      isLiked: likedBags.has(bag.id),
      isFollowing: followedBags.has(bag.id)
    }));

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bag => 
        bag.owner.toLowerCase().includes(query) ||
        bag.title.toLowerCase().includes(query) ||
        bag.brands.some(brand => brand.toLowerCase().includes(query)) ||
        bag.description?.toLowerCase().includes(query)
      );
    }

    // Handicap filter
    if (handicapRange !== "all") {
      filtered = filtered.filter(bag => {
        switch (handicapRange) {
          case "0-5": return bag.handicap <= 5;
          case "6-15": return bag.handicap >= 6 && bag.handicap <= 15;
          case "16+": return bag.handicap >= 16;
          default: return true;
        }
      });
    }

    // Price filter
    if (priceRange !== "all") {
      filtered = filtered.filter(bag => {
        switch (priceRange) {
          case "under-2k": return bag.totalValue < 2000;
          case "2k-5k": return bag.totalValue >= 2000 && bag.totalValue <= 5000;
          case "5k+": return bag.totalValue > 5000;
          default: return true;
        }
      });
    }

    // Sort bags
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "trending":
          // Prioritize trending bags, then by likes
          if (a.isTrending && !b.isTrending) return -1;
          if (!a.isTrending && b.isTrending) return 1;
          return b.likeCount - a.likeCount;
        
        case "newest":
          // For demo, sort by ID (assuming higher ID = newer)
          return parseInt(b.id) - parseInt(a.id);
        
        case "most-liked":
          return b.likeCount - a.likeCount;
        
        case "following":
          // Show followed bags first, then by likes
          if (a.isFollowing && !b.isFollowing) return -1;
          if (!a.isFollowing && b.isFollowing) return 1;
          return b.likeCount - a.likeCount;
        
        case "price-high":
          return b.totalValue - a.totalValue;
        
        case "price-low":
          return a.totalValue - b.totalValue;
        
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchQuery, sortBy, handicapRange, priceRange, likedBags, followedBags]);

  const handleToggleLike = (bagId: string) => {
    setLikedBags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bagId)) {
        newSet.delete(bagId);
      } else {
        newSet.add(bagId);
      }
      return newSet;
    });
  };

  const handleToggleFollow = (bagId: string) => {
    setFollowedBags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bagId)) {
        newSet.delete(bagId);
      } else {
        newSet.add(bagId);
      }
      return newSet;
    });
  };

  const handleViewBag = (bagId: string) => {
    // Find the bag to get the owner name
    const bag = bagsBrowserData.find(b => b.id === bagId);
    if (bag) {
      // Convert owner name to URL-friendly format
      const username = bag.owner.toLowerCase().replace(/\s+/g, '-');
      navigate(`/bag/${username}`);
    }
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl mt-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">
            Bags Browser
          </h1>
          <p className="text-muted-foreground text-lg">
            Discover amazing golf setups from players around the world
          </p>
        </div>

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
              <SelectItem value="trending">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Trending
                </div>
              </SelectItem>
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
              <SelectItem value="following">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Following
                </div>
              </SelectItem>
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
          {(searchQuery || sortBy !== "trending" || handicapRange !== "all" || priceRange !== "all") && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSortBy("trending");
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
            <BagCompositeCard
              key={bag.id}
              bag={bag}
              onToggleLike={handleToggleLike}
              onToggleFollow={handleToggleFollow}
              onViewBag={handleViewBag}
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
                setSortBy("trending");
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