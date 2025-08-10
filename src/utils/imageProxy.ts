// Image proxy utility to handle external images that might be CORS-blocked
export const getProxiedImageUrl = (url: string | null | undefined): string => {
  if (!url) return '/placeholder.svg';
  
  // If it's already a local URL or data URL, return as-is
  if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  
  // For external URLs that might be CORS-blocked, return placeholder
  // In production, you'd want to use a proper image proxy service
  if (url.includes('callawaygolf.com') || url.includes('taylormade.com')) {
    console.warn('External image blocked by CORS, using placeholder:', url);
    return '/placeholder.svg';
  }
  
  return url;
};