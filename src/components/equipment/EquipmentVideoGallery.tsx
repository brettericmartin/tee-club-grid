import React, { useState, useEffect } from 'react';
import { Play, Plus, Video, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoEmbed } from '@/components/video/VideoEmbed';
import { getEquipmentVideos, incrementVideoViewCount } from '@/services/equipmentVideos';
import type { EquipmentVideo } from '@/types/affiliateVideos';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EquipmentVideoGalleryProps {
  equipmentId: string;
  equipmentName: string;
  className?: string;
  onAddVideo?: () => void;
}

export const EquipmentVideoGallery: React.FC<EquipmentVideoGalleryProps> = ({
  equipmentId,
  equipmentName,
  className,
  onAddVideo
}) => {
  const [videos, setVideos] = useState<EquipmentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<EquipmentVideo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadVideos();
  }, [equipmentId]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const fetchedVideos = await getEquipmentVideos(equipmentId);
      setVideos(fetchedVideos);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = async (video: EquipmentVideo) => {
    setSelectedVideo(video);
    setIsModalOpen(true);
    
    // Track view
    await incrementVideoViewCount(video.id);
  };

  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    }
    return `${count} views`;
  };

  if (loading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-8 bg-gray-700 rounded w-32 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-video bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <Video className="w-12 h-12 mx-auto mb-4 text-gray-500" />
        <h3 className="text-lg font-medium mb-2">No Videos Yet</h3>
        <p className="text-gray-400 mb-4">
          Be the first to add a video for {equipmentName}
        </p>
        {onAddVideo && (
          <Button onClick={onAddVideo} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Video
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Video className="w-5 h-5" />
            Videos ({videos.length})
          </h3>
          {onAddVideo && (
            <Button size="sm" variant="outline" onClick={onAddVideo}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {videos.map((video) => (
            <div
              key={video.id}
              className="group cursor-pointer"
              onClick={() => handleVideoClick(video)}
            >
              <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title || 'Video thumbnail'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                    <Video className="w-8 h-8 text-gray-500" />
                  </div>
                )}
                
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                  <div className="bg-white/90 rounded-full p-2 group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 text-gray-900 fill-current" />
                  </div>
                </div>

                {/* View count badge */}
                {video.view_count > 0 && (
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {formatViewCount(video.view_count)}
                  </div>
                )}
              </div>

              <div className="mt-2">
                <h4 className="font-medium text-sm line-clamp-2">
                  {video.title || 'Equipment Video'}
                </h4>
                {video.channel && (
                  <p className="text-xs text-gray-400 mt-1">{video.channel}</p>
                )}
                {video.added_by && (
                  <p className="text-xs text-gray-500 mt-1">
                    Added by {video.added_by.display_name || video.added_by.username}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl p-0">
          {selectedVideo && (
            <>
              <div className="aspect-video">
                <VideoEmbed
                  url={selectedVideo.url}
                  title={selectedVideo.title}
                  provider={selectedVideo.provider}
                  thumbnail={selectedVideo.thumbnail_url}
                  autoplay={true}
                  className="rounded-t-lg"
                />
              </div>
              <DialogHeader className="p-6">
                <DialogTitle>{selectedVideo.title || 'Equipment Video'}</DialogTitle>
                <div className="flex items-center gap-4 text-sm text-gray-400 mt-2">
                  {selectedVideo.channel && (
                    <span>{selectedVideo.channel}</span>
                  )}
                  <span>{formatViewCount(selectedVideo.view_count)}</span>
                  {selectedVideo.added_by && (
                    <span>
                      Added by {selectedVideo.added_by.display_name || selectedVideo.added_by.username}
                    </span>
                  )}
                </div>
              </DialogHeader>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EquipmentVideoGallery;