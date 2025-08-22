import type { VideoProvider, VideoMetadata } from '@/types/affiliateVideos';

export type ParsedVideo = {
  provider: VideoProvider;
  videoId?: string;   // stable ID when we can extract one
  url: string;        // sanitized canonical URL we store
};

/**
 * Basic URL sanitizer:
 * - trims
 * - strips dangerous schemes
 */
export function sanitizeUrl(raw: string): string {
  const s = (raw || "").trim();
  try {
    const u = new URL(s);
    // allowlist http(s) only
    if (u.protocol !== "http:" && u.protocol !== "https:") return s;
    return u.toString();
  } catch {
    return s;
  }
}

/**
 * Extract video ID from YouTube URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Handle youtu.be URLs
    if (urlObj.hostname === 'youtu.be' || urlObj.hostname === 'www.youtu.be') {
      return urlObj.pathname.slice(1).split('?')[0];
    }
    
    // Handle youtube.com URLs
    if (urlObj.hostname === 'youtube.com' || urlObj.hostname === 'www.youtube.com') {
      // Watch URLs
      if (urlObj.pathname === '/watch') {
        return urlObj.searchParams.get('v');
      }
      // Embed URLs
      if (urlObj.pathname.startsWith('/embed/')) {
        return urlObj.pathname.split('/embed/')[1].split('?')[0];
      }
      // Shorts URLs
      if (urlObj.pathname.startsWith('/shorts/')) {
        return urlObj.pathname.split('/shorts/')[1].split('?')[0];
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract video ID from TikTok URL
 */
export function extractTikTokVideoId(url: string): string | null {
  try {
    const match = url.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Extract video ID from Vimeo URL
 */
export function extractVimeoVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Handle vimeo.com URLs
    if (urlObj.hostname === 'vimeo.com' || urlObj.hostname === 'www.vimeo.com') {
      const match = urlObj.pathname.match(/^\/(\d+)/);
      return match ? match[1] : null;
    }
    
    // Handle player.vimeo.com URLs
    if (urlObj.hostname === 'player.vimeo.com') {
      const match = urlObj.pathname.match(/^\/video\/(\d+)/);
      return match ? match[1] : null;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Detect video provider from URL
 */
export function detectVideoProvider(url: string): VideoProvider {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube';
  }
  if (lowerUrl.includes('tiktok.com')) {
    return 'tiktok';
  }
  if (lowerUrl.includes('vimeo.com')) {
    return 'vimeo';
  }
  
  return 'other';
}

/**
 * Build a privacy-friendly YouTube embed URL.
 * (Use with <iframe src=...>)
 */
export function getYouTubeEmbedUrl(videoId?: string): string | undefined {
  if (!videoId) return undefined;
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
}

/**
 * Quick embeddability check (useful for UI guards).
 */
export function isEmbeddable(p: ParsedVideo): boolean {
  if (p.provider === "youtube" && p.videoId) return true;
  if (p.provider === "tiktok") return true; // relies on TikTok oEmbed script
  if (p.provider === "vimeo" && p.videoId) return true;
  return false;
}

/**
 * Generate embed URL for video
 */
export function generateEmbedUrl(provider: VideoProvider, videoId: string): string {
  switch (provider) {
    case 'youtube':
      // Use privacy-enhanced mode
      return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
    case 'tiktok':
      // TikTok doesn't have a simple embed URL pattern
      return `https://www.tiktok.com/embed/v2/${videoId}`;
    case 'vimeo':
      return `https://player.vimeo.com/video/${videoId}`;
    default:
      return '';
  }
}

/**
 * Generate thumbnail URL for video
 */
export function generateThumbnailUrl(provider: VideoProvider, videoId: string): string | null {
  switch (provider) {
    case 'youtube':
      // Use high quality thumbnail
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    case 'vimeo':
      // Vimeo requires API call to get thumbnail
      // Return null and fetch via API later
      return null;
    case 'tiktok':
      // TikTok requires API call to get thumbnail
      return null;
    default:
      return null;
  }
}

/**
 * Primary parser for incoming video URLs (YouTube/TikTok/Other).
 * Stores a canonical url + (when possible) a stable videoId for embeds.
 */
export function parseVideoUrl(url: string): ParsedVideo {
  const sanitizedUrl = sanitizeUrl(url);
  try {
    const u = new URL(sanitizedUrl);
    const host = u.hostname.toLowerCase();

    // YouTube
    if (
      host === "youtu.be" ||
      host.endsWith(".youtube.com") ||
      host === "youtube.com"
    ) {
      const videoId = extractYouTubeVideoId(sanitizedUrl);
      return { provider: "youtube", videoId: videoId || undefined, url: sanitizedUrl };
    }

    // TikTok
    if (host.endsWith(".tiktok.com") || host === "tiktok.com") {
      const videoId = extractTikTokVideoId(sanitizedUrl);
      return { provider: "tiktok", videoId: videoId || undefined, url: sanitizedUrl };
    }

    // Vimeo
    if (host.endsWith(".vimeo.com") || host === "vimeo.com" || host === "player.vimeo.com") {
      const videoId = extractVimeoVideoId(sanitizedUrl);
      return { provider: "vimeo" as VideoProvider, videoId: videoId || undefined, url: sanitizedUrl };
    }

    // Fallback
    return { provider: "other", url: sanitizedUrl };
  } catch {
    return { provider: "other", url: sanitizedUrl };
  }
}

/**
 * Parse video URL and extract full metadata (legacy compatibility)
 */
export function parseVideoUrlMetadata(url: string): VideoMetadata | null {
  const parsed = parseVideoUrl(url);
  
  if (!parsed.videoId && parsed.provider === 'other') {
    return null;
  }
  
  const embedUrl = parsed.videoId ? generateEmbedUrl(parsed.provider, parsed.videoId) : url;
  const thumbnailUrl = parsed.videoId ? generateThumbnailUrl(parsed.provider, parsed.videoId) : null;
  
  return {
    provider: parsed.provider,
    video_id: parsed.videoId || null,
    embed_url: embedUrl,
    thumbnail_url: thumbnailUrl || undefined
  };
}

/**
 * Validate video URL
 */
export function isValidVideoUrl(url: string): boolean {
  try {
    const parsed = parseVideoUrl(url);
    
    if (parsed.provider === 'other') {
      // Check if it's a valid URL at least
      const urlObj = new URL(parsed.url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    }
    
    // For known providers, check if we can extract an ID
    return parsed.videoId !== undefined;
  } catch {
    return false;
  }
}

/**
 * Format video duration from seconds to readable format
 */
export function formatVideoDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get video provider display name
 */
export function getProviderDisplayName(provider: VideoProvider): string {
  switch (provider) {
    case 'youtube':
      return 'YouTube';
    case 'tiktok':
      return 'TikTok';
    case 'vimeo':
      return 'Vimeo';
    default:
      return 'Video';
  }
}

/**
 * Get video provider icon/logo URL
 */
export function getProviderIcon(provider: VideoProvider): string {
  switch (provider) {
    case 'youtube':
      return '/icons/youtube.svg';
    case 'tiktok':
      return '/icons/tiktok.svg';
    case 'vimeo':
      return '/icons/vimeo.svg';
    default:
      return '/icons/video.svg';
  }
}

/**
 * Build YouTube embed URL with options
 */
export function buildYouTubeEmbedUrl(videoId: string, options?: {
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  modestBranding?: boolean;
  rel?: boolean;
  start?: number;
  end?: number;
}): string {
  const params = new URLSearchParams();
  
  // Default options
  params.set('rel', options?.rel ? '1' : '0');
  params.set('modestbranding', options?.modestBranding !== false ? '1' : '0');
  
  if (options?.autoplay) params.set('autoplay', '1');
  if (options?.muted) params.set('mute', '1');
  if (options?.loop) {
    params.set('loop', '1');
    params.set('playlist', videoId); // Required for loop to work
  }
  if (options?.controls === false) params.set('controls', '0');
  if (options?.start) params.set('start', options.start.toString());
  if (options?.end) params.set('end', options.end.toString());
  
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Extract timestamp from YouTube URL (for ?t= parameter)
 */
export function extractYouTubeTimestamp(url: string): number | null {
  try {
    const urlObj = new URL(url);
    const timeParam = urlObj.searchParams.get('t');
    
    if (timeParam) {
      // Handle both formats: 123 (seconds) and 2m3s
      if (/^\d+$/.test(timeParam)) {
        return parseInt(timeParam);
      }
      
      const match = timeParam.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
      if (match) {
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');
        return hours * 3600 + minutes * 60 + seconds;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}