/**
 * Service for managing invite codes and referrals
 */

interface InviteCode {
  code: string;
  created_by: string;
  note: string | null;
  max_uses: number;
  uses: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface ReferredUser {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  joined_at: string;
}

interface InviteStats {
  totalInvites: number;
  successfulInvites: number;
  pendingInvites: number;
  successRate: number;
  bonusInvitesEarned: number;
}

interface InviteListResponse {
  codes: InviteCode[];
  referredUsers: ReferredUser[];
  stats: InviteStats;
  inviteQuota: number;
  invitesUsed: number;
}

/**
 * Get list of user's invite codes and referred users
 */
export async function getInvitesList(): Promise<InviteListResponse> {
  try {
    const response = await fetch('/api/invites/list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch invites');
    }
    
    return await response.json();
  } catch (error) {
    console.error('[InviteService] Error fetching invites list:', error);
    throw error;
  }
}

/**
 * Issue a new invite code
 */
export async function issueInviteCode(note?: string, maxUses: number = 1): Promise<InviteCode | null> {
  try {
    const response = await fetch('/api/invites/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        note,
        max_uses: maxUses,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to issue invite code');
    }
    
    return await response.json();
  } catch (error) {
    console.error('[InviteService] Error issuing invite code:', error);
    throw error;
  }
}

/**
 * Revoke an invite code
 */
export async function revokeInviteCode(code: string): Promise<void> {
  try {
    const response = await fetch('/api/invites/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ code }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to revoke invite code');
    }
  } catch (error) {
    console.error('[InviteService] Error revoking invite code:', error);
    throw error;
  }
}

/**
 * Generate a shareable invite URL
 */
export function generateInviteUrl(code: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/waitlist?code=${code}`;
}

/**
 * Generate social share messages
 */
export function generateShareMessages(code: string) {
  const url = generateInviteUrl(code);
  const message = `Join me on Teed.club - the social platform for golf equipment enthusiasts! 🏌️‍♂️⛳`;
  
  return {
    twitter: {
      text: `${message}\n\nUse my invite code: ${code}`,
      url,
      hashtags: 'golf,golfing,golfequipment',
    },
    linkedin: {
      text: `${message}\n\nI've got an exclusive invite for you to join Teed.club. Use code: ${code}`,
      url,
    },
    facebook: {
      text: message,
      url,
    },
    email: {
      subject: 'Your invite to Teed.club 🏌️‍♂️',
      body: `Hey!

I wanted to invite you to join Teed.club - it's a new social platform for golf equipment enthusiasts where you can:

• Share your golf bag setup
• Discover equipment from other players
• Get personalized recommendations
• Connect with the golf community

I have a limited number of invites, and I'd love for you to join!

Use my invite code: ${code}
Or click here: ${url}

See you on the course!`,
    },
    sms: {
      text: `Join me on Teed.club! Use my invite code: ${code} at ${url}`,
    },
  };
}

/**
 * Copy invite URL to clipboard
 */
export async function copyInviteUrl(code: string): Promise<boolean> {
  try {
    const url = generateInviteUrl(code);
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('[InviteService] Error copying to clipboard:', error);
    return false;
  }
}

/**
 * Copy invite code to clipboard
 */
export async function copyInviteCode(code: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(code);
    return true;
  } catch (error) {
    console.error('[InviteService] Error copying to clipboard:', error);
    return false;
  }
}

/**
 * Check if an invite code is expired
 */
export function isInviteExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

/**
 * Get days until invite expires
 */
export function getDaysUntilExpiry(expiresAt: string | null): number {
  if (!expiresAt) return -1;
  
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Format expiry date for display
 */
export function formatExpiryDate(expiresAt: string | null): string {
  if (!expiresAt) return 'Never';
  
  const days = getDaysUntilExpiry(expiresAt);
  
  if (days === 0) {
    return 'Expires today';
  } else if (days === 1) {
    return 'Expires tomorrow';
  } else if (days < 7) {
    return `Expires in ${days} days`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `Expires in ${weeks} week${weeks > 1 ? 's' : ''}`;
  } else {
    return new Date(expiresAt).toLocaleDateString();
  }
}