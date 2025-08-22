import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Video, 
  Play, 
  Upload, 
  TrendingUp, 
  Users, 
  Trophy, 
  Filter,
  Search,
  Clock,
  Eye,
  Share2,
  ChevronRight,
  Sparkles,
  BookOpen,
  Plus
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Navigation from '@/components/Navigation';
import SimpleVideoEmbed from '@/components/video/SimpleVideoEmbed';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getFeedVideos } from '@/services/bagVideos';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface VideoStats {
  totalVideos: number;
  totalViews: number;
  userVideos: number;
  equipmentVideos: number;
}

interface VideoItem {
  id: string;
  url: string;
  title?: string;
  provider: string;
  video_id: string;
  thumbnail_url?: string;
  created_at: string;
  view_count?: number;
  user?: {
    username?: string;
    display_name?: string;
  };
  equipment?: {
    brand?: string;
    model?: string;
  };
  bag?: {
    name?: string;
  };
}

const VideoHub = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'bags' | 'equipment' | 'reviews'>('all');

  // Fetch video statistics
  const { data: stats } = useQuery<VideoStats>({
    queryKey: ['video-stats'],
    queryFn: async () => {
      const [bagVideosRes, equipmentVideosRes] = await Promise.all([
        supabase.from('user_bag_videos').select('id, view_count', { count: 'exact' }),
        supabase.from('equipment_videos').select('id, view_count', { count: 'exact' })
      ]);

      const totalBagVideos = bagVideosRes.count || 0;
      const totalEquipmentVideos = equipmentVideosRes.count || 0;
      const totalBagViews = bagVideosRes.data?.reduce((sum, v) => sum + (v.view_count || 0), 0) || 0;
      const totalEquipmentViews = equipmentVideosRes.data?.reduce((sum, v) => sum + (v.view_count || 0), 0) || 0;

      return {
        totalVideos: totalBagVideos + totalEquipmentVideos,
        totalViews: totalBagViews + totalEquipmentViews,
        userVideos: totalBagVideos,
        equipmentVideos: totalEquipmentVideos
      };
    }
  });

  // Fetch recent videos
  const { data: recentVideos, isLoading: loadingRecent } = useQuery({
    queryKey: ['recent-videos'],
    queryFn: async () => {
      const { data: bagVideos } = await supabase
        .from('user_bag_videos')
        .select(`
          id, url, title, provider, video_id, thumbnail_url, created_at, view_count,
          user:profiles!user_id(username, display_name),
          bag:user_bags!bag_id(name)
        `)
        .eq('share_to_feed', true)
        .order('created_at', { ascending: false })
        .limit(6);

      return bagVideos || [];
    }
  });

  // Fetch trending videos
  const { data: trendingVideos, isLoading: loadingTrending } = useQuery({
    queryKey: ['trending-videos'],
    queryFn: async () => {
      const { data: bagVideos } = await supabase
        .from('user_bag_videos')
        .select(`
          id, url, title, provider, video_id, thumbnail_url, created_at, view_count,
          user:profiles!user_id(username, display_name),
          bag:user_bags!bag_id(name)
        `)
        .order('view_count', { ascending: false })
        .limit(6);

      return bagVideos || [];
    }
  });

  // Fetch user's videos if logged in
  const { data: userVideos, isLoading: loadingUserVideos } = useQuery({
    queryKey: ['user-videos', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data } = await supabase
        .from('user_bag_videos')
        .select(`
          id, url, title, provider, video_id, thumbnail_url, created_at, view_count, share_to_feed,
          bag:user_bags!bag_id(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(9);

      return data || [];
    },
    enabled: !!user
  });

  const formatViewCount = (count?: number): string => {
    if (!count) return '0 views';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K views`;
    return `${count} view${count === 1 ? '' : 's'}`;
  };

  const VideoCard = ({ video }: { video: any }) => (
    <div className="group relative">
      <div className="aspect-video rounded-lg overflow-hidden bg-gray-900 mb-3">
        <SimpleVideoEmbed
          provider={video.provider}
          url={video.url}
          videoId={video.video_id}
          title={video.title}
          className="w-full h-full"
        />
      </div>
      <div className="space-y-1">
        <h3 className="font-medium line-clamp-2 text-sm">
          {video.title || 'Untitled Video'}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {video.user && (
            <span>{video.user.display_name || video.user.username}</span>
          )}
          {video.bag && (
            <>
              <span>•</span>
              <span>{video.bag.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatViewCount(video.view_count)}
          </span>
          <span>•</span>
          <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black">
      <Navigation />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-blue-600/20 opacity-50" />
        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-2xl">
                <Video className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              Video Hub
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Share your golf journey. Discover equipment reviews. Learn from the community.
            </p>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-emerald-400">
                    {stats?.totalVideos || 0}
                  </div>
                  <div className="text-sm text-gray-400">Total Videos</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-400">
                    {stats?.totalViews || 0}
                  </div>
                  <div className="text-sm text-gray-400">Total Views</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-400">
                    {stats?.userVideos || 0}
                  </div>
                  <div className="text-sm text-gray-400">Bag Videos</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-orange-400">
                    {stats?.equipmentVideos || 0}
                  </div>
                  <div className="text-sm text-gray-400">Equipment Reviews</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <Tabs defaultValue="discover" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 bg-gray-900/50">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="my-videos" disabled={!user}>My Videos</TabsTrigger>
          </TabsList>

          {/* Discover Tab */}
          <TabsContent value="discover" className="space-y-8">
            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-gray-900/50 border-gray-800 hover:border-emerald-500/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/my-bag')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Upload className="h-5 w-5 text-emerald-400" />
                    Share Your Videos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400 mb-4">
                    Add videos to your bag and share them with the community.
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    Go to My Bag
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 hover:border-blue-500/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/equipment')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="h-5 w-5 text-blue-400" />
                    Equipment Reviews
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400 mb-4">
                    Watch and contribute equipment review videos.
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    Browse Equipment
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 hover:border-purple-500/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/feed')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-purple-400" />
                    Community Feed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400 mb-4">
                    See what videos the community is sharing.
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    View Feed
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Videos */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <Clock className="h-6 w-6 text-gray-400" />
                  Recent Videos
                </h2>
              </div>
              
              {loadingRecent ? (
                <div className="grid md:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-video bg-gray-800 rounded-lg mb-3" />
                      <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-800 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : recentVideos && recentVideos.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-6">
                  {recentVideos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              ) : (
                <Alert className="bg-gray-900/50 border-gray-800">
                  <Video className="h-4 w-4" />
                  <AlertDescription>
                    No videos have been shared yet. Be the first to share!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          {/* Trending Tab */}
          <TabsContent value="trending" className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-orange-400" />
                  Trending Videos
                </h2>
              </div>
              
              {loadingTrending ? (
                <div className="grid md:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-video bg-gray-800 rounded-lg mb-3" />
                      <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-800 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : trendingVideos && trendingVideos.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-6">
                  {trendingVideos.map((video, index) => (
                    <div key={video.id} className="relative">
                      {index < 3 && (
                        <Badge className="absolute top-2 left-2 z-10 bg-orange-500">
                          #{index + 1} Trending
                        </Badge>
                      )}
                      <VideoCard video={video} />
                    </div>
                  ))}
                </div>
              ) : (
                <Alert className="bg-gray-900/50 border-gray-800">
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    No trending videos yet. Share videos to see them trend!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          {/* My Videos Tab */}
          <TabsContent value="my-videos" className="space-y-8">
            {user ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-purple-400" />
                    Your Videos
                  </h2>
                  <Button onClick={() => navigate('/my-bag')} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Video
                  </Button>
                </div>
                
                {loadingUserVideos ? (
                  <div className="grid md:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="aspect-video bg-gray-800 rounded-lg mb-3" />
                        <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-gray-800 rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : userVideos && userVideos.length > 0 ? (
                  <div className="grid md:grid-cols-3 gap-6">
                    {userVideos.map((video) => (
                      <div key={video.id} className="relative">
                        {video.share_to_feed && (
                          <Badge className="absolute top-2 left-2 z-10 bg-blue-500">
                            <Share2 className="h-3 w-3 mr-1" />
                            Shared
                          </Badge>
                        )}
                        <VideoCard video={video} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert className="bg-gray-900/50 border-gray-800">
                    <Video className="h-4 w-4" />
                    <AlertDescription>
                      You haven't shared any videos yet. Go to your bag to add videos!
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <Alert className="bg-gray-900/50 border-gray-800">
                <AlertDescription>
                  Sign in to view and manage your videos.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>

        {/* How It Works Section */}
        <div className="mt-16 py-12 border-t border-gray-800">
          <h2 className="text-2xl font-semibold text-center mb-8">How Video Sharing Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="font-medium mb-2">1. Add Videos</h3>
              <p className="text-sm text-gray-400">
                Go to your bag and add YouTube, TikTok, or Vimeo videos
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Share2 className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-medium mb-2">2. Share to Feed</h3>
              <p className="text-sm text-gray-400">
                Choose to share your videos with the community
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="font-medium mb-2">3. Get Recognition</h3>
              <p className="text-sm text-gray-400">
                Earn views and engagement from the golf community
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoHub;