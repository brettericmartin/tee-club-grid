import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Star, Search, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BadgeService, type UserBadgeWithDetails } from '@/services/badgeService';
import { toast } from 'sonner';

interface ManageBadgesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  badges: UserBadgeWithDetails[];
  onBadgesUpdate: () => void;
}

const rarityColors = {
  common: 'border-gray-600',
  uncommon: 'border-green-600',
  rare: 'border-blue-600',
  epic: 'border-purple-600',
  legendary: 'border-yellow-600'
};

const categoryNames = {
  social: 'Social',
  community: 'Community',
  milestone: 'Milestone',
  explorer: 'Explorer',
  collector: 'Collector',
  brand: 'Brand',
  gear_collector: 'Gear Collector',
  social_golfer: 'Social Golfer',
  equipment_explorer: 'Equipment Explorer',
  community_contributor: 'Community Contributor',
  milestone_achievement: 'Milestone Achievement',
  special_event: 'Special Event'
};

export function ManageBadgesDialog({
  open,
  onOpenChange,
  userId,
  badges,
  onBadgesUpdate
}: ManageBadgesDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [featuredCount, setFeaturedCount] = useState(0);
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);
  
  const maxFeatured = 10;
  
  useEffect(() => {
    setFeaturedCount(badges.filter(b => b.is_featured).length);
  }, [badges]);
  
  const earnedBadges = badges.filter(b => b.progress === 100);
  
  // Get unique categories
  const categories = ['all', ...new Set(earnedBadges.map(b => b.badge.category))];
  
  // Filter badges
  const filteredBadges = earnedBadges.filter(badge => {
    const matchesSearch = searchQuery === '' || 
      badge.badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      badge.badge.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = selectedCategory === 'all' || badge.badge.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  const toggleFeatured = async (badge: UserBadgeWithDetails) => {
    if (!badge.is_featured && featuredCount >= maxFeatured) {
      toast.error(`You can only feature up to ${maxFeatured} badges`);
      return;
    }
    
    try {
      await BadgeService.toggleBadgeFeatured(badge.id, !badge.is_featured);
      toast.success(badge.is_featured ? 'Badge unfeatured' : 'Badge featured');
      onBadgesUpdate();
    } catch (error) {
      toast.error('Failed to update badge');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">Manage Badges</DialogTitle>
          <DialogDescription className="text-white/70">
            Feature your favorite badges to display on your profile. You can feature up to {maxFeatured} badges.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search and Stats */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
              <Input
                placeholder="Search badges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>{featuredCount} / {maxFeatured} featured</span>
            </div>
          </div>
          
          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="bg-gray-800 border border-gray-700 flex-wrap h-auto p-1">
              {categories.map(cat => (
                <TabsTrigger 
                  key={cat} 
                  value={cat}
                  className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-gray-700"
                >
                  {categoryNames[cat as keyof typeof categoryNames] || cat.charAt(0).toUpperCase() + cat.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          
          {/* Badge Grid */}
          <ScrollArea className="h-[50vh] md:h-[60vh] pr-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {filteredBadges.map((userBadge) => {
                const rarity = userBadge.badge.rarity || 'common';
                const isImageUrl = userBadge.badge.icon?.startsWith('/') || userBadge.badge.icon?.startsWith('http');
                
                return (
                  <div
                    key={userBadge.id}
                    className="relative group"
                    onMouseEnter={() => setHoveredBadge(userBadge.id)}
                    onMouseLeave={() => setHoveredBadge(null)}
                  >
                    <button
                      onClick={() => toggleFeatured(userBadge)}
                      className={cn(
                        "relative w-full aspect-square rounded-xl border-2 transition-all duration-300 overflow-hidden",
                        "hover:brightness-110",
                        rarityColors[rarity as keyof typeof rarityColors],
                        userBadge.is_featured && "ring-2 ring-yellow-400 ring-offset-2 ring-offset-[#1a1a1a]"
                      )}
                    >
                      {isImageUrl ? (
                        <img 
                          src={userBadge.badge.icon}
                          alt={userBadge.badge.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-3xl">
                          {userBadge.badge.icon || '🏅'}
                        </div>
                      )}
                      
                      {/* Featured indicator */}
                      {userBadge.is_featured && (
                        <div className="absolute top-1 right-1 z-10">
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 drop-shadow-lg" />
                        </div>
                      )}
                      
                      {/* Hover overlay */}
                      <div className={cn(
                        "absolute inset-0 bg-black opacity-0 group-hover:opacity-90 transition-opacity duration-200",
                        "flex items-center justify-center p-2"
                      )}>
                        <Star className={cn(
                          "w-8 h-8 transition-colors",
                          userBadge.is_featured ? "fill-yellow-400 text-yellow-400" : "text-white/50"
                        )} />
                      </div>
                    </button>
                    
                    {/* Badge name */}
                    <p className="mt-1 text-xs text-white/70 text-center line-clamp-2">
                      {userBadge.badge.name}
                    </p>
                    
                    {/* Tooltip */}
                    {hoveredBadge === userBadge.id && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 pointer-events-none">
                        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl whitespace-nowrap max-w-xs">
                          <p className="font-semibold text-sm">{userBadge.badge.name}</p>
                          <p className="text-xs text-gray-400 mt-1">{userBadge.badge.description}</p>
                          {userBadge.earned_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              Earned: {new Date(userBadge.earned_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-2">
                          <div className="border-8 border-transparent border-t-gray-900" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {filteredBadges.length === 0 && (
              <div className="text-center py-12">
                <p className="text-white/50">No badges found</p>
              </div>
            )}
          </ScrollArea>
          
          {/* Help text */}
          <div className="flex items-start gap-2 p-3 bg-gray-800 rounded-lg border border-gray-700">
            <Info className="w-4 h-4 text-white/50 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-white/50">
              Click on badges to feature them on your profile. Featured badges appear first and are highlighted with a star.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}