/**
 * Referral Code Generator Utility
 * Generates unique, URL-safe referral codes for user profiles
 */

/**
 * Generate a random referral code
 * Format: 8 uppercase alphanumeric characters
 * @returns A unique referral code string
 */
export function generateReferralCode(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  
  // Generate 8 random characters
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  
  return code;
}

/**
 * Validate a referral code format
 * @param code The code to validate
 * @returns True if the code is valid format
 */
export function isValidReferralCode(code: string): boolean {
  // Must be 8 characters, uppercase alphanumeric only
  const pattern = /^[A-Z0-9]{8}$/;
  return pattern.test(code);
}

/**
 * Generate a referral code with retry logic for uniqueness
 * @param checkUniqueness Async function to check if code already exists
 * @param maxRetries Maximum number of generation attempts
 * @returns A unique referral code or null if max retries exceeded
 */
export async function generateUniqueReferralCode(
  checkUniqueness: (code: string) => Promise<boolean>,
  maxRetries: number = 10
): Promise<string | null> {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateReferralCode();
    const isUnique = await checkUniqueness(code);
    
    if (isUnique) {
      return code;
    }
    
    console.log(`[ReferralCode] Code ${code} already exists, retrying... (${i + 1}/${maxRetries})`);
  }
  
  console.error('[ReferralCode] Failed to generate unique code after max retries');
  return null;
}

/**
 * Format a referral code for display
 * Adds spacing for better readability (e.g., "A3K9-P2M7")
 * @param code The code to format
 * @returns Formatted code string
 */
export function formatReferralCode(code: string): string {
  if (!code || code.length !== 8) {
    return code;
  }
  
  // Split into two groups of 4 for readability
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Clean a referral code for storage/comparison
 * Removes any formatting and converts to uppercase
 * @param code The code to clean
 * @returns Cleaned code string
 */
export function cleanReferralCode(code: string): string {
  if (!code) return '';
  
  // Remove any non-alphanumeric characters and convert to uppercase
  return code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

/**
 * Generate a shareable referral URL
 * @param code The referral code
 * @param baseUrl The base URL (defaults to production)
 * @returns Full referral URL
 */
export function generateReferralUrl(
  code: string,
  baseUrl: string = 'https://teed.club'
): string {
  if (!code) return baseUrl;
  
  // Clean the code before adding to URL
  const cleanCode = cleanReferralCode(code);
  return `${baseUrl}/?ref=${cleanCode}`;
}

/**
 * Extract referral code from URL
 * @param url The URL to parse
 * @returns The referral code or null if not found
 */
export function extractReferralCodeFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const ref = urlObj.searchParams.get('ref') || 
                urlObj.searchParams.get('referral');
    
    if (ref) {
      const cleanCode = cleanReferralCode(ref);
      return isValidReferralCode(cleanCode) ? cleanCode : null;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate social share messages with referral link
 */
export const shareMessages = {
  twitter: (code: string) => {
    const url = generateReferralUrl(code);
    return `Join me on @TeedClub - the social platform for golf equipment! Use my referral code ${formatReferralCode(code)} to skip the waitlist 🏌️‍♂️ ${url}`;
  },
  
  whatsapp: (code: string) => {
    const url = generateReferralUrl(code);
    return `Hey! I'm on Teed.club - check out this platform for showcasing golf equipment. Use my referral code ${formatReferralCode(code)} to get instant access: ${url}`;
  },
  
  email: {
    subject: () => 'Join me on Teed.club!',
    body: (code: string) => {
      const url = generateReferralUrl(code);
      return `Hi there,

I wanted to invite you to Teed.club, a new social platform for golfers to showcase their equipment and connect with other players.

Use my referral code to skip the waitlist and get instant access:

Referral Code: ${formatReferralCode(code)}
Sign up here: ${url}

See you on the course!`;
    }
  }
};

/**
 * Generate share URLs for different platforms
 */
export const getShareUrl = {
  twitter: (code: string) => {
    const message = encodeURIComponent(shareMessages.twitter(code));
    return `https://twitter.com/intent/tweet?text=${message}`;
  },
  
  whatsapp: (code: string) => {
    const message = encodeURIComponent(shareMessages.whatsapp(code));
    return `https://wa.me/?text=${message}`;
  },
  
  email: (code: string) => {
    const subject = encodeURIComponent(shareMessages.email.subject());
    const body = encodeURIComponent(shareMessages.email.body(code));
    return `mailto:?subject=${subject}&body=${body}`;
  }
};