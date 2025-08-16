// Domain configuration for Teed.club
export const DOMAIN_CONFIG = {
  // Production domain
  production: 'https://teed.club',
  
  // Auth domain (Supabase custom domain)
  auth: 'https://auth.teed.club',
  
  // Development domain
  development: 'http://localhost:3333',
  
  // Get the current domain based on environment
  getCurrentDomain: () => {
    if (typeof window === 'undefined') {
      return 'https://teed.club';
    }
    
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${window.location.protocol}//${window.location.host}`;
    }
    
    if (hostname === 'teed.club' || hostname === 'www.teed.club') {
      return 'https://teed.club';
    }
    
    // Fallback to current origin
    return window.location.origin;
  },
  
  // Get redirect URL for auth callbacks
  getAuthCallbackUrl: () => {
    const currentDomain = DOMAIN_CONFIG.getCurrentDomain();
    return `${currentDomain}/auth/callback`;
  },
  
  // Get share URL for bags
  getBagShareUrl: (bagId: string) => {
    const domain = DOMAIN_CONFIG.production;
    return `${domain}/bag/${bagId}`;
  },
  
  // Get profile URL
  getProfileUrl: (username: string) => {
    const domain = DOMAIN_CONFIG.production;
    return `${domain}/@${username}`;
  }
};