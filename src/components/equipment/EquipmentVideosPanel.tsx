import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Video, Play, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SimpleVideoEmbed from '@/components/video/SimpleVideoEmbed';
import { listEquipmentVideos, addEquipmentVideo } from '@/services/equipmentVideos';
import { parseVideoUrl } from '@/utils/videoUtils';
import { fetchVideoMetadata } from '@/services/videoMetadata';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EquipmentVideosPanelProps {
  equipmentId: string;
  equipmentName?: string;
  className?: string;
  canAdd?: boolean;
}

export function EquipmentVideosPanel({ 
  equipmentId,
  equipmentName,
  className,
  canAdd = true
}: EquipmentVideosPanelProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [autoTitle, setAutoTitle] = useState('');
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch equipment videos
  const { data: videosResponse, isLoading } = useQuery({
    queryKey: ['equipment_videos', equipmentId],
    queryFn: () => listEquipmentVideos(equipmentId)
  });

  const videos = videosResponse?.data || [];

  // Add video mutation
  const addMutation = useMutation({
    mutationFn: (input: any) => addEquipmentVideo(input),
    onSuccess: () => {
      setUrl('');
      setTitle('');
      setAutoTitle('');
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: ['equipment_videos', equipmentId] });
      toast.success('Video added successfully! It will be reviewed shortly.');
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
      equipment_id: equipmentId,
      url: url.trim(),
      title: videoTitle,
      channel: undefined
    });
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

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <section className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Video className="h-5 w-5" />
            Top Videos
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Curated by the community.
          </p>
        </div>
        
        {canAdd && user && !showAddForm && (
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

      {/* Add Video Form */}
      {showAddForm && (
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
              Share tutorials, reviews, or gameplay featuring {equipmentName || 'this equipment'}
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
                
                {/* Verified Badge */}
                {video.verified && (
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 left-2 bg-green-500/90 text-white"
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
                
                {video.added_by && (
                  <p className="text-xs text-muted-foreground">
                    Added by {video.added_by.display_name || video.added_by.username}
                  </p>
                )}
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
          {canAdd && user ? (
            <Button
              variant="outline"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Share the First Video
            </Button>
          ) : !user ? (
            <p className="text-sm text-muted-foreground">
              Sign in to share videos
            </p>
          ) : null}
        </div>
      )}

      {/* Info Alert for non-authenticated users */}
      {!user && videos.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Sign in to share your own videos and contribute to the community
          </AlertDescription>
        </Alert>
      )}
    </section>
  );
}

export default EquipmentVideosPanel;