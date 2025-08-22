import React, { useEffect } from 'react';

// Declare global flag for TikTok script loading
declare global {
  interface Window {
    tiktokEmbedLoaded?: boolean;
  }
}

type Props = {
  provider: 'youtube' | 'tiktok' | 'vimeo' | 'other';
  url: string;
  videoId?: string;
  title?: string;
  className?: string;
};

export default function SimpleVideoEmbed({ 
  provider, 
  url, 
  videoId, 
  title,
  className = ''
}: Props) {
  // YouTube embed with privacy-enhanced mode
  if (provider === 'youtube' && videoId) {
    return (
      <div className={`aspect-video w-full overflow-hidden rounded-2xl shadow ${className}`}>
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`}
          title={title ?? 'YouTube video'}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  // TikTok embed with dynamic script loading
  if (provider === 'tiktok') {
    useEffect(() => {
      // Check if script is already loaded globally
      if (window.tiktokEmbedLoaded) return;
      
      // Check if script already exists in DOM
      const existingScript = document.querySelector('script[src="https://www.tiktok.com/embed.js"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://www.tiktok.com/embed.js';
        script.async = true;
        document.body.appendChild(script);
        
        // Mark as loaded globally
        window.tiktokEmbedLoaded = true;
        
        // Don't remove the script on unmount since other components may need it
      } else {
        // Script exists but flag wasn't set
        window.tiktokEmbedLoaded = true;
      }
    }, []);

    return (
      <div className={`tiktok-embed-container ${className}`}>
        <blockquote 
          className="tiktok-embed" 
          cite={url} 
          data-video-id={videoId}
          style={{ maxWidth: 605, minWidth: 325 }}
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            {title ?? 'View on TikTok'}
          </a>
        </blockquote>
      </div>
    );
  }

  // Vimeo embed
  if (provider === 'vimeo' && videoId) {
    return (
      <div className={`aspect-video w-full overflow-hidden rounded-2xl shadow ${className}`}>
        <iframe
          className="h-full w-full"
          src={`https://player.vimeo.com/video/${encodeURIComponent(videoId)}`}
          title={title ?? 'Vimeo video'}
          loading="lazy"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // Fallback for unsupported providers or missing video ID
  return (
    <div className={`p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 ${className}`}>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        External video:
      </p>
      <a 
        className="text-blue-600 dark:text-blue-400 underline hover:no-underline" 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
      >
        {title ?? url}
      </a>
    </div>
  );
}