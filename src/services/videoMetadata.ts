import { parseVideoUrl } from '@/utils/videoUtils';

interface VideoMetadata {
  title?: string;
  thumbnail?: string;
  duration?: number;
  channel?: string;
  description?: string;
}

/**
 * Fetch video metadata from various platforms
 * Note: These are client-side solutions. For production, consider server-side APIs
 * to avoid CORS issues and API key exposure.
 */

/**
 * Fetch YouTube video metadata using noembed (no API key required)
 */
async function fetchYouTubeMetadata(videoId: string): Promise<VideoMetadata> {
  try {
    // Using noembed service (free, no API key required)
    const response = await fetch(
      `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch metadata');
    
    const data = await response.json();
    
    return {
      title: data.title,
      thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      channel: data.author_name,
      // Duration not available from noembed, would need YouTube API
    };
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
    // Fallback to basic thumbnail
    return {
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
  }
}

/**
 * Fetch TikTok video metadata using oembed
 */
async function fetchTikTokMetadata(url: string): Promise<VideoMetadata> {
  try {
    // TikTok's oEmbed endpoint
    const response = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch metadata');
    
    const data = await response.json();
    
    return {
      title: data.title,
      thumbnail: data.thumbnail_url,
      channel: data.author_name,
    };
  } catch (error) {
    console.error('Error fetching TikTok metadata:', error);
    return {};
  }
}

/**
 * Fetch Vimeo video metadata using oembed
 */
async function fetchVimeoMetadata(videoId: string): Promise<VideoMetadata> {
  try {
    // Vimeo's oEmbed endpoint
    const response = await fetch(
      `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch metadata');
    
    const data = await response.json();
    
    return {
      title: data.title,
      thumbnail: data.thumbnail_url,
      channel: data.author_name,
      duration: data.duration,
    };
  } catch (error) {
    console.error('Error fetching Vimeo metadata:', error);
    return {};
  }
}

/**
 * Main function to fetch video metadata based on URL
 */
export async function fetchVideoMetadata(url: string): Promise<VideoMetadata | null> {
  try {
    const parsed = parseVideoUrl(url);
    
    if (!parsed || !parsed.videoId) {
      return null;
    }
    
    switch (parsed.provider) {
      case 'youtube':
        return await fetchYouTubeMetadata(parsed.videoId);
      
      case 'tiktok':
        return await fetchTikTokMetadata(url);
      
      case 'vimeo':
        return await fetchVimeoMetadata(parsed.videoId);
      
      default:
        return null;
    }
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    return null;
  }
}

/**
 * Format duration from seconds to readable format
 */
export function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}