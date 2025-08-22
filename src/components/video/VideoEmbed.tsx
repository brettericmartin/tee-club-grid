import React, { useState, useEffect, useRef } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseVideoUrl, getProviderDisplayName } from '@/utils/videoUtils';
import type { VideoProvider } from '@/types/affiliateVideos';

interface VideoEmbedProps {
  url: string;
  title?: string;
  provider?: VideoProvider;
  thumbnail?: string;
  className?: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  lazy?: boolean;
  onPlay?: () => void;
  onError?: (error: Error) => void;
}

export const VideoEmbed: React.FC<VideoEmbedProps> = ({
  url,
  title,
  provider: providedProvider,
  thumbnail,
  className,
  autoplay = false,
  muted = false,
  controls = true,
  lazy = true,
  onPlay,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showPlayer, setShowPlayer] = useState(!lazy || autoplay);
  const [videoMetadata, setVideoMetadata] = useState<ReturnType<typeof parseVideoUrl>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const metadata = parseVideoUrl(url);
    if (metadata) {
      setVideoMetadata(metadata);
    } else {
      setHasError(true);
      onError?.(new Error('Invalid video URL'));
    }
  }, [url, onError]);

  useEffect(() => {
    if (!lazy || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !showPlayer) {
          // Preload when in viewport
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [lazy, showPlayer]);

  const handlePlayClick = () => {
    setShowPlayer(true);
    setIsLoading(true);
    onPlay?.();
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setHasError(true);
    setIsLoading(false);
    onError?.(new Error('Failed to load video'));
  };

  if (hasError) {
    return (
      <div 
        className={cn(
          "relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center",
          "aspect-video",
          className
        )}
      >
        <div className="text-center p-4">
          <p className="text-gray-400 mb-2">Failed to load video</p>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm"
          >
            Watch on {getProviderDisplayName(videoMetadata?.provider || providedProvider || 'other')}
          </a>
        </div>
      </div>
    );
  }

  if (!videoMetadata) {
    return (
      <div 
        className={cn(
          "relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center",
          "aspect-video",
          className
        )}
      >
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const thumbnailUrl = thumbnail || videoMetadata.thumbnail_url;
  const embedUrl = videoMetadata.embed_url;
  const provider = videoMetadata.provider || providedProvider;

  // Build embed URL with parameters
  let finalEmbedUrl = embedUrl;
  if (provider === 'youtube' && showPlayer) {
    const params = new URLSearchParams();
    if (autoplay) params.set('autoplay', '1');
    if (muted) params.set('mute', '1');
    if (!controls) params.set('controls', '0');
    params.set('rel', '0');
    params.set('modestbranding', '1');
    
    finalEmbedUrl = `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}${params.toString()}`;
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative bg-gray-900 rounded-lg overflow-hidden",
        "aspect-video",
        className
      )}
    >
      {!showPlayer ? (
        <>
          {/* Thumbnail with play button overlay */}
          <div className="absolute inset-0">
            {thumbnailUrl ? (
              <img 
                src={thumbnailUrl} 
                alt={title || 'Video thumbnail'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
            )}
            <div className="absolute inset-0 bg-black/30" />
          </div>
          
          {/* Play button */}
          <button
            onClick={handlePlayClick}
            className="absolute inset-0 flex items-center justify-center group"
            aria-label="Play video"
          >
            <div className="bg-black/70 rounded-full p-4 group-hover:bg-black/80 transition-colors">
              <Play className="w-12 h-12 text-white fill-current" />
            </div>
          </button>

          {/* Title overlay */}
          {title && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
              <h3 className="text-white font-medium line-clamp-2">{title}</h3>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Loading spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}

          {/* Video iframe */}
          <iframe
            ref={iframeRef}
            src={finalEmbedUrl}
            title={title || 'Embedded video'}
            className="absolute inset-0 w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        </>
      )}

      {/* Provider badge */}
      {provider && provider !== 'other' && !showPlayer && (
        <div className="absolute top-2 right-2">
          <span className="bg-black/70 text-white text-xs px-2 py-1 rounded">
            {getProviderDisplayName(provider)}
          </span>
        </div>
      )}
    </div>
  );
};

export default VideoEmbed;