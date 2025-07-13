import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { badgeService, Badge, UserBadge } from '@/services/badges';
import { BadgeProgress } from '@/components/badges/BadgeProgress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Target, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BadgesPage() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadBadges();
  }, [user]);

  const loadBadges = async () => {
    if (!user) return;

    try {
      const [allBadges, userProgress] = await Promise.all([
        badgeService.getAllBadges(),
        badgeService.getUserBadges(user.id)
      ]);

      setBadges(allBadges);
      
      // Merge badge data with user progress
      const mergedBadges = allBadges.map(badge => {
        const userBadge = userProgress.find(ub => ub.badge_id === badge.id);
        return userBadge || {
          id: `temp-${badge.id}`,
          user_id: user.id,
          badge_id: badge.id,
          earned_at: null,
          progress: 0,
          progress_data: {},
          is_featured: false,
          badge
        };
      });

      setUserBadges(mergedBadges);
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const earnedBadges = userBadges.filter(ub => ub.progress === 100);
  const inProgressBadges = userBadges.filter(ub => ub.progress > 0 && ub.progress < 100);
  const notStartedBadges = userBadges.filter(ub => ub.progress === 0);

  const categories = [
    { id: 'all', name: 'All Badges', icon: Trophy },
    { id: 'equipment_explorer', name: 'Equipment Explorer', icon: Target },
    { id: 'social_golfer', name: 'Social Golfer', icon: Users },
    { id: 'gear_collector', name: 'Gear Collector', icon: Sparkles },
    { id: 'community_contributor', name: 'Community', icon: Users },
    { id: 'milestone_achievement', name: 'Milestones', icon: Trophy },
  ];

  const filteredBadges = selectedCategory === 'all' 
    ? userBadges 
    : userBadges.filter(ub => ub.badge?.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Your Badges</h1>
        <p className="text-white/70">Track your achievements and unlock new badges</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <div className="text-3xl font-bold text-primary">{earnedBadges.length}</div>
          <div className="text-sm text-white/70">Badges Earned</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <div className="text-3xl font-bold text-yellow-500">{inProgressBadges.length}</div>
          <div className="text-sm text-white/70">In Progress</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <div className="text-3xl font-bold text-white">{badges.length}</div>
          <div className="text-sm text-white/70">Total Available</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <div className="text-3xl font-bold text-white">
            {badges.length > 0 ? Math.round((earnedBadges.length / badges.length) * 100) : 0}%
          </div>
          <div className="text-sm text-white/70">Completion</div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all',
                selectedCategory === category.id
                  ? 'bg-primary text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{category.name}</span>
            </button>
          );
        })}
      </div>

      {/* Badges Tabs */}
      <Tabs defaultValue="earned" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/5">
          <TabsTrigger value="earned">
            Earned ({earnedBadges.length})
          </TabsTrigger>
          <TabsTrigger value="progress">
            In Progress ({inProgressBadges.length})
          </TabsTrigger>
          <TabsTrigger value="locked">
            Locked ({notStartedBadges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earned" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBadges
              .filter(ub => ub.progress === 100)
              .map((userBadge) => (
                <BadgeProgress
                  key={userBadge.id}
                  userBadge={userBadge}
                  showProgress={false}
                />
              ))}
          </div>
          {filteredBadges.filter(ub => ub.progress === 100).length === 0 && (
            <div className="text-center py-12 text-white/50">
              No earned badges in this category yet. Keep playing!
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBadges
              .filter(ub => ub.progress > 0 && ub.progress < 100)
              .map((userBadge) => (
                <BadgeProgress
                  key={userBadge.id}
                  userBadge={userBadge}
                  showProgress={true}
                />
              ))}
          </div>
          {filteredBadges.filter(ub => ub.progress > 0 && ub.progress < 100).length === 0 && (
            <div className="text-center py-12 text-white/50">
              No badges in progress. Start working towards new achievements!
            </div>
          )}
        </TabsContent>

        <TabsContent value="locked" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBadges
              .filter(ub => ub.progress === 0)
              .map((userBadge) => (
                <div key={userBadge.id} className="opacity-50">
                  <BadgeProgress
                    userBadge={userBadge}
                    showProgress={true}
                  />
                </div>
              ))}
          </div>
          {filteredBadges.filter(ub => ub.progress === 0).length === 0 && (
            <div className="text-center py-12 text-white/50">
              You've started working on all available badges!
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}