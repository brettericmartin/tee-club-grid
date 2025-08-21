/**
 * Utility functions for sanitizing user input
 */

/**
 * Sanitizes a display name for safe storage and display
 * - Trims whitespace
 * - Collapses multiple spaces
 * - Removes control characters
 * - Caps length at specified limit
 * - Preserves emoji and international characters
 * 
 * @param name - The display name to sanitize
 * @param maxLength - Maximum allowed length (default: 40)
 * @returns Sanitized display name
 */
export function sanitizeDisplayName(name: string | null | undefined, maxLength: number = 40): string {
  if (!name) return '';
  
  // Remove control characters (0x00-0x1F, 0x7F-0x9F) and zero-width characters
  // but preserve emoji and international characters
  let sanitized = name
    // Remove ASCII control characters
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Remove other problematic Unicode categories
    .replace(/[\u2028\u2029]/g, '') // Line/paragraph separators
    // Trim whitespace
    .trim()
    // Collapse multiple spaces/tabs/newlines to single space
    .replace(/\s+/g, ' ');
  
  // Remove HTML/script tags (basic XSS prevention)
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '');
  
  // Truncate to max length (preserving whole emoji if possible)
  if (sanitized.length > maxLength) {
    // Try to avoid cutting in the middle of an emoji or combining character
    let truncated = sanitized.substring(0, maxLength);
    
    // Check if we might have cut in the middle of a multi-byte character
    // If the last character is a high surrogate, remove it
    const lastChar = truncated.charCodeAt(truncated.length - 1);
    if (lastChar >= 0xD800 && lastChar <= 0xDBFF) {
      truncated = truncated.substring(0, truncated.length - 1);
    }
    
    sanitized = truncated.trim();
  }
  
  return sanitized;
}

/**
 * Sanitizes an email for display (extracts local part only)
 * Never shows the domain for privacy
 * 
 * @param email - The email address
 * @param maxLength - Maximum length for the local part (default: 20)
 * @returns The local part of the email, sanitized and truncated
 */
export function sanitizeEmailForDisplay(email: string | null | undefined, maxLength: number = 20): string {
  if (!email) return '';
  
  // Extract local part (before @)
  const localPart = email.split('@')[0] || '';
  
  // Sanitize the local part similar to display name
  // but be more restrictive since it's a fallback
  let sanitized = localPart
    .replace(/[^a-zA-Z0-9._-]/g, '') // Only allow safe chars for display
    .substring(0, maxLength);
  
  return sanitized;
}

/**
 * Validates if a display name is acceptable
 * Returns an error message if invalid, or null if valid
 * 
 * @param name - The display name to validate
 * @returns Error message or null
 */
export function validateDisplayName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Display name is required';
  }
  
  const sanitized = sanitizeDisplayName(name);
  
  if (sanitized.length === 0) {
    return 'Display name contains only invalid characters';
  }
  
  if (sanitized.length < 2) {
    return 'Display name must be at least 2 characters';
  }
  
  if (sanitized.length > 40) {
    return 'Display name must be 40 characters or less';
  }
  
  // Check for offensive patterns (basic check)
  const offensivePatterns = [
    /admin/i,
    /moderator/i,
    /official/i,
    /support/i,
    /teed\.club/i,
    /teedclub/i
  ];
  
  for (const pattern of offensivePatterns) {
    if (pattern.test(sanitized)) {
      return 'Display name contains restricted terms';
    }
  }
  
  return null;
}