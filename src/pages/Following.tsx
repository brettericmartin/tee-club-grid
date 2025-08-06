import { useState, useEffect } from "react";
import { Star, Calendar, DollarSign, UserMinus, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getUserFollowing, toggleFollow } from "@/services/users";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatCompactCurrency } from "@/lib/formatters";

interface FollowedUser {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  handicap?: number;
  user_bags?: Array<{
    id: string;
    name: string;
    total_value?: number;
    bag_equipment?: Array<{
      equipment?: {
        brand: string;
        model: string;
      };
    }>;
    created_at: string;
  }>;
}

const Following = () => {
  const [followedUsers, setFollowedUsers] = useState<FollowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unfollowingIds, setUnfollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFollowedUsers();
  }, []);

  const loadFollowedUsers = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to view your followed users");
        return;
      }

      const following = await getUserFollowing(user.id);
      if (following) {
        // Get bags for each followed user
        const usersWithBags = await Promise.all(
          following.map(async (user) => {
            const { data: bags } = await supabase
              .from('user_bags')
              .select(`
                id,
                name,
                total_value,
                bag_equipment (
                  equipment (
                    brand,
                    model
                  )
                ),
                created_at
              `)
              .eq('user_id', user.id)
              .eq('is_public', true)
              .order('created_at', { ascending: false })
              .limit(1);

            return {
              ...user,
              user_bags: bags || []
            };
          })
        );

        setFollowedUsers(usersWithBags);
      }
    } catch (error) {
      console.error('Error loading followed users:', error);
      toast.error("Failed to load followed users");
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (userId: string, username: string) => {
    try {
      setUnfollowingIds(prev => new Set(prev).add(userId));
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to unfollow users");
        return;
      }

      await toggleFollow(user.id, userId);
      
      // Remove from local state
      setFollowedUsers(prev => prev.filter(u => u.id !== userId));
      
      toast.success(`Unfollowed ${username}`);
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast.error("Failed to unfollow user");
    } finally {
      setUnfollowingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const getDisplayName = (user: FollowedUser) => {
    return user.full_name || user.username;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getFeaturedEquipment = (user: FollowedUser) => {
    const primaryBag = user.user_bags?.[0];
    if (!primaryBag?.bag_equipment) return [];
    
    return primaryBag.bag_equipment
      .slice(0, 3)
      .map(item => `${item.equipment?.brand} ${item.equipment?.model}`)
      .filter(Boolean);
  };

  const getBagValue = (user: FollowedUser) => {
    const primaryBag = user.user_bags?.[0];
    return primaryBag?.total_value || 0;
  };

  const getLastUpdated = (user: FollowedUser) => {
    const primaryBag = user.user_bags?.[0];
    if (!primaryBag?.created_at) return 'No bags yet';
    
    const date = new Date(primaryBag.created_at);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (followedUsers.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Not Following Anyone Yet</h2>
            <p className="text-muted-foreground mb-6">
              Start following other golfers to see their bags and updates here.
            </p>
            <Link to="/bags-browser">
              <Button>
                Discover Bags
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Following</h1>
          <p className="text-muted-foreground">
            {followedUsers.length} {followedUsers.length === 1 ? 'person' : 'people'} you follow
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {followedUsers.map(user => {
            const displayName = getDisplayName(user);
            const initials = getInitials(displayName);
            const featuredEquipment = getFeaturedEquipment(user);
            const bagValue = getBagValue(user);
            const lastUpdated = getLastUpdated(user);
            const isUnfollowing = unfollowingIds.has(user.id);

            return (
              <Card key={user.id} className="hover:shadow-card transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Link to={`/bag/${user.username}`} className="flex items-center flex-1">
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={displayName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="ml-3">
                        <h3 className="font-semibold text-foreground">{displayName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {user.handicap ? `${user.handicap} HCP` : 'No handicap set'}
                        </p>
                      </div>
                    </Link>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnfollow(user.id, displayName)}
                      disabled={isUnfollowing}
                      className="ml-2"
                    >
                      {isUnfollowing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserMinus className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {bagValue > 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" />
                        <span className="font-medium text-foreground">{formatCompactCurrency(bagValue)}</span>
                        <span className="text-sm text-muted-foreground">Total Value</span>
                      </div>
                    )}
                    
                    {featuredEquipment.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Featured Equipment:</p>
                        {featuredEquipment.map((item, i) => (
                          <div key={i} className="text-sm text-foreground flex items-center gap-1">
                            <Star className="w-3 h-3 text-accent" />
                            {item}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t border-border">
                      <Calendar className="w-3 h-3" />
                      {lastUpdated}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Following;