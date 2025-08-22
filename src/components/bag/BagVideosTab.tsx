import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Video, Play, Loader2, Share2, CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SimpleVideoEmbed from '@/components/video/SimpleVideoEmbed';
import { listBagVideos, addBagVideo } from '@/services/bagVideos';
import { parseVideoUrl } from '@/utils/videoUtils';
import { fetchVideoMetadata } from '@/services/videoMetadata';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DuplicateVideoDialog } from './DuplicateVideoDialog';

interface BagVideosTabProps {
  bagId: string;
  bagName?: string;
  isOwner?: boolean;
  className?: string;
}

export function BagVideosTab({ 
  bagId,
  bagName,
  isOwner = false,
  className
}: BagVideosTabProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [autoTitle, setAutoTitle] = useState('');
  const [shareToFeed, setShareToFeed] = useState(false);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [duplicatePost, setDuplicatePost] = useState<any>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingVideoData, setPendingVideoData] = useState<any>(null);

  // Fetch bag videos
  const { data: videosResponse, isLoading } = useQuery({
    queryKey: ['bag_videos', bagId],
    queryFn: () => listBagVideos(bagId)
  });

  const videos = videosResponse?.data || [];

  // Add video mutation
  const addMutation = useMutation({
    mutationFn: (input: any) => addBagVideo(input),
    onSuccess: (response: any) => {
      // Check if duplicate was found
      if (response.duplicate) {
        setDuplicatePost(response.duplicate);
        setPendingVideoData({
          bag_id: bagId,
          url: url.trim(),
          title: title.trim() || autoTitle,
          channel: undefined,
          share_to_feed: false // Will be added without feed sharing
        });
        setShowDuplicateDialog(true);
      } else if (response.data) {
        // Successfully added
        setUrl('');
        setTitle('');
        setAutoTitle('');
        setShareToFeed(false);
        setShowAddForm(false);
        queryClient.invalidateQueries({ queryKey: ['bag_videos', bagId] });
        
        if (shareToFeed) {
          queryClient.invalidateQueries({ queryKey: ['feed'] });
          toast.success('Video added and shared to your feed!');
        } else {
          toast.success('Video added to your bag!');
        }
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add video');
    }
  });

  // Auto-fetch video metadata when URL changes
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!url || url.length < 10) {
        setAutoTitle('');
        return;
      }

      // Validate URL format first
      const parsed = parseVideoUrl(url);
      if (parsed.provider === 'other') {
        setAutoTitle('');
        return;
      }

      setFetchingMetadata(true);
      try {
        const metadata = await fetchVideoMetadata(url);
        if (metadata?.title && !title) {
          // Only set auto title if user hasn't manually entered one
          setAutoTitle(metadata.title);
        }
      } catch (error) {
        console.error('Error fetching video metadata:', error);
      } finally {
        setFetchingMetadata(false);
      }
    };

    // Debounce the fetch
    const timeoutId = setTimeout(fetchMetadata, 500);
    return () => clearTimeout(timeoutId);
  }, [url]);

  const handleAddVideo = async () => {
    if (!url.trim()) {
      toast.error('Please enter a video URL');
      return;
    }

    // Validate URL
    const parsed = parseVideoUrl(url);
    if (parsed.provider === 'other') {
      toast.error('Please enter a valid YouTube, TikTok, or Vimeo URL');
      return;
    }

    // Use manual title if provided, otherwise use auto-fetched title
    const finalTitle = title.trim() || autoTitle || undefined;

    // Fetch fresh metadata if we don't have a title
    let videoTitle = finalTitle;
    if (!videoTitle && !fetchingMetadata) {
      setFetchingMetadata(true);
      try {
        const metadata = await fetchVideoMetadata(url);
        videoTitle = metadata?.title;
      } catch (error) {
        console.error('Error fetching metadata:', error);
      } finally {
        setFetchingMetadata(false);
      }
    }

    addMutation.mutate({
      bag_id: bagId,
      url: url.trim(),
      title: videoTitle,
      channel: undefined,
      share_to_feed: shareToFeed
    });
  };

  const handleAddToBagOnly = () => {
    // Add the video without sharing to feed
    if (pendingVideoData) {
      addMutation.mutate(pendingVideoData);
    }
    setShowDuplicateDialog(false);
    setDuplicatePost(null);
    setPendingVideoData(null);
  };

  const formatViewCount = (count: number): string => {
    if (!count) return '0 views';
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    }
    return `${count} view${count === 1 ? '' : 's'}`;
  };

  const formatDate = (date: string): string => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
    if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`;
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Video className="h-5 w-5" />
            Recommended Videos
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isOwner ? 'What I watch. What I recommend.' : videos.length > 0 ? 'Recommended by the bag owner.' : 'No videos shared yet'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isOwner && !showAddForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Video
            </Button>
          )}
        </div>
      </div>

      {/* Video Hub Link Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Play className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-medium text-white">Explore the Video Hub</h4>
              <p className="text-sm text-muted-foreground">
                Discover trending videos, equipment reviews, and community showcases
              </p>
            </div>
          </div>
          <Link to="/video-hub">
            <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Video Hub
            </Button>
          </Link>
        </div>
      </div>

      {/* Add Video Form */}
      {showAddForm && isOwner && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="space-y-2">
            <label className="text-sm font-medium">Video URL</label>
            <div className="relative">
              <Input
                placeholder="Paste YouTube, TikTok, or Vimeo URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleAddVideo()}
                className={fetchingMetadata ? 'pr-10' : ''}
              />
              {fetchingMetadata && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {!fetchingMetadata && autoTitle && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Share course vlogs, swing videos, or equipment reviews featuring {bagName || 'your bag'}
            </p>
          </div>
          
          {(autoTitle || title) && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Title {autoTitle && !title && '(auto-detected)'}</label>
              <Input
                placeholder={autoTitle || "Add a descriptive title"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleAddVideo()}
              />
              {autoTitle && !title && (
                <p className="text-xs text-muted-foreground">
                  Using: "{autoTitle}"
                </p>
              )}
            </div>
          )}

          {/* Share to feed option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="share-to-feed"
              checked={shareToFeed}
              onCheckedChange={(checked) => setShareToFeed(checked as boolean)}
            />
            <label
              htmlFor="share-to-feed"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Share this to my feed.
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAddVideo}
              disabled={!url.trim() || addMutation.isPending || fetchingMetadata}
              className="flex-1"
            >
              {addMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Video'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddForm(false);
                setUrl('');
                setTitle('');
                setAutoTitle('');
                setShareToFeed(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Videos Grid */}
      {videos.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video: any) => (
            <div key={video.id} className="space-y-3">
              {/* Video Embed */}
              <div className="relative">
                <SimpleVideoEmbed
                  provider={video.provider}
                  url={video.url}
                  videoId={video.video_id}
                  title={video.title}
                  className="rounded-lg overflow-hidden"
                />
                
                {/* Feed Badge */}
                {video.shared_to_feed && (
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 left-2 bg-blue-500/90 text-white"
                  >
                    <Share2 className="h-3 w-3 mr-1" />
                    Shared
                  </Badge>
                )}
                
                {/* Verified Badge */}
                {video.verified && (
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 right-2 bg-green-500/90 text-white"
                  >
                    Verified
                  </Badge>
                )}
              </div>
              
              {/* Video Info */}
              <div className="space-y-1">
                {video.title && (
                  <h4 className="font-medium text-sm line-clamp-2">
                    {video.title}
                  </h4>
                )}
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {video.channel && (
                    <span>{video.channel}</span>
                  )}
                  <span>{formatViewCount(video.view_count)}</span>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Added {formatDate(video.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground mb-4">
            No videos shared yet
          </p>
          {isOwner ? (
            <Button
              variant="outline"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Share Your First Video
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Check back later for videos of this bag
            </p>
          )}
        </div>
      )}

      {/* Info Alert for non-owners */}
      {!isOwner && user && videos.length > 0 && (
        <Alert>
          <Video className="h-4 w-4" />
          <AlertDescription>
            Create your own bag to start sharing videos and building your golf profile
          </AlertDescription>
        </Alert>
      )}

      {/* Duplicate Video Dialog */}
      <DuplicateVideoDialog
        isOpen={showDuplicateDialog}
        onClose={() => {
          setShowDuplicateDialog(false);
          setDuplicatePost(null);
          setPendingVideoData(null);
        }}
        duplicatePost={duplicatePost}
        onAddToBagOnly={handleAddToBagOnly}
        videoTitle={pendingVideoData?.title}
      />
    </div>
  );
}

export default BagVideosTab;