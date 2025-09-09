import { useEffect } from 'react';

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
  // Debug logging
  console.log('[SimpleVideoEmbed] Rendering:', { provider, url, videoId, title });
  
  // YouTube embed with privacy-enhanced mode and link overlay
  if (provider === 'youtube' && videoId) {
    const embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
    const youtubeUrl = url || `https://youtube.com/watch?v=${videoId}`;
    console.log('[SimpleVideoEmbed] YouTube embed URL:', embedUrl);
    return (
      <div className={`relative aspect-video w-full overflow-hidden rounded-2xl shadow group ${className}`}>
        <iframe
          className="h-full w-full"
          src={embedUrl}
          title={title ?? 'YouTube video'}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onError={(e) => console.error('[SimpleVideoEmbed] YouTube iframe error:', e)}
        />
        {/* Link overlay - appears on hover */}
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-black/90"
          title="Open in YouTube"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
          YouTube
        </a>
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
  console.warn('[SimpleVideoEmbed] Falling back to link display:', { provider, videoId });
  return (
    <div className={`p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 ${className}`}>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        External video: (Provider: {provider}, Has ID: {!!videoId})
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