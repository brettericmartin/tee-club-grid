/**
 * Utility functions for consistent display name handling across the app
 */

import { sanitizeEmailForDisplay } from './sanitization';

/**
 * Gets the display name for a user profile with fallbacks
 * Priority: display_name > username > email local part
 * 
 * @param profile - The user profile object
 * @returns The display name to show
 */
export function getDisplayName(profile: {
  display_name?: string | null;
  username?: string | null;
  email?: string | null;
} | null | undefined): string {
  if (!profile) return 'Unknown';
  
  // First priority: display_name
  if (profile.display_name && profile.display_name.trim()) {
    return profile.display_name;
  }
  
  // Second priority: username
  if (profile.username && profile.username.trim()) {
    return profile.username;
  }
  
  // Last resort: email local part (never show domain)
  if (profile.email) {
    const localPart = sanitizeEmailForDisplay(profile.email);
    if (localPart) return localPart;
  }
  
  return 'Unknown';
}

/**
 * Gets initials for avatar display
 * 
 * @param profile - The user profile object
 * @returns 1-2 character initials
 */
export function getDisplayInitials(profile: {
  display_name?: string | null;
  username?: string | null;
  email?: string | null;
} | null | undefined): string {
  const name = getDisplayName(profile);
  
  if (name === 'Unknown') return '?';
  
  // Split by spaces and take first letter of each word (max 2)
  const parts = name.trim().split(/\s+/);
  
  if (parts.length >= 2) {
    // Two or more words: use first letter of first two words
    return (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts[0].length >= 2) {
    // Single word: use first two letters
    return parts[0].substring(0, 2).toUpperCase();
  } else {
    // Single character name
    return parts[0][0].toUpperCase();
  }
}

/**
 * Formats a display name for mentions (e.g., @username style)
 * 
 * @param profile - The user profile object
 * @returns The formatted mention string
 */
export function getMentionName(profile: {
  display_name?: string | null;
  username?: string | null;
  email?: string | null;
} | null | undefined): string {
  if (!profile) return '@unknown';
  
  // Prefer username for mentions if available
  if (profile.username && profile.username.trim()) {
    return `@${profile.username}`;
  }
  
  // Otherwise use display name without spaces
  const displayName = getDisplayName(profile);
  const mentionName = displayName.replace(/\s+/g, '').toLowerCase();
  
  return `@${mentionName}`;
}