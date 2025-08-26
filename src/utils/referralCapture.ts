/**
 * Utility for capturing and managing referral/invite codes
 * Handles URL parameter detection and post-auth redemption
 */

import { trackInviteRedeemed } from './analytics';
import { trackReferralAttribution } from '@/services/referralService';

const STORAGE_KEYS = {
  INVITE_CODE: 'pending_invite_code',
  REFERRAL_CODE: 'pending_referral_code',
  CAPTURED_AT: 'referral_captured_at'
} as const;

/**
 * Capture referral/invite codes from URL parameters
 * Stores them in localStorage for later redemption
 */
export function captureReferralCodes(): void {
  const params = new URLSearchParams(window.location.search);
  
  // Check for invite code (priority)
  const inviteCode = params.get('code') || params.get('invite');
  if (inviteCode) {
    localStorage.setItem(STORAGE_KEYS.INVITE_CODE, inviteCode);
    localStorage.setItem(STORAGE_KEYS.CAPTURED_AT, new Date().toISOString());
    console.log('[Referral] Captured invite code:', inviteCode);
  }
  
  // Check for referral code
  const referralCode = params.get('ref') || params.get('referral');
  if (referralCode) {
    localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, referralCode);
    localStorage.setItem(STORAGE_KEYS.CAPTURED_AT, new Date().toISOString());
    console.log('[Referral] Captured referral code:', referralCode);
  }
}

/**
 * Get stored invite code if available
 */
export function getStoredInviteCode(): string | null {
  return localStorage.getItem(STORAGE_KEYS.INVITE_CODE);
}

/**
 * Get stored referral code if available
 */
export function getStoredReferralCode(): string | null {
  return localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);
}

/**
 * Redeem stored codes after successful authentication
 * @param userId - The authenticated user's ID
 * @returns Promise resolving to redemption result
 */
export async function redeemStoredCodes(userId: string): Promise<{
  success: boolean;
  message?: string;
  referrer?: any;
}> {
  const inviteCode = getStoredInviteCode();
  const referralCode = getStoredReferralCode();
  
  if (!inviteCode && !referralCode) {
    return { success: false, message: 'No codes to redeem' };
  }
  
  let overallSuccess = false;
  let messages: string[] = [];
  let referrerInfo = null;
  
  // Handle referral code attribution (for user referrals)
  if (referralCode) {
    try {
      console.log('[Referral] Attempting to attribute referral code:', referralCode);
      const attributionResult = await trackReferralAttribution(userId, referralCode);
      
      if (attributionResult.success) {
        overallSuccess = true;
        referrerInfo = attributionResult.referrer;
        messages.push(attributionResult.message);
        console.log('[Referral] Successfully attributed referral');
        
        // Clear the referral code after successful attribution
        localStorage.removeItem(STORAGE_KEYS.REFERRAL_CODE);
      } else {
        console.log('[Referral] Attribution failed:', attributionResult.message);
        // Don't fail overall if referral attribution fails
        // The user might have already been referred or code might be invalid
      }
    } catch (error) {
      console.error('[Referral] Error attributing referral:', error);
    }
  }
  
  // Handle invite code redemption (for beta access)
  if (inviteCode) {
    try {
      // Call redemption API for invite codes
      const response = await fetch('/api/beta/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: inviteCode }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.ok) {
        overallSuccess = true;
        messages.push(result.message || 'Invite code redeemed successfully');
        console.log('[Referral] Successfully redeemed invite code');
        
        // Clear the invite code after successful redemption
        localStorage.removeItem(STORAGE_KEYS.INVITE_CODE);
        
        // Track successful redemption
        trackInviteRedeemed(true);
      } else {
        console.error('[Referral] Invite redemption failed:', result.error);
        // Track failed redemption
        trackInviteRedeemed(false);
      }
    } catch (error) {
      console.error('[Referral] Error redeeming invite code:', error);
    }
  }
  
  // Clear timestamp if all codes processed
  if (overallSuccess) {
    localStorage.removeItem(STORAGE_KEYS.CAPTURED_AT);
  }
  
  return { 
    success: overallSuccess,
    message: messages.join('. ') || 'Processing completed',
    referrer: referrerInfo
  };
}

/**
 * Clear all stored referral/invite codes
 */
export function clearStoredCodes(): void {
  localStorage.removeItem(STORAGE_KEYS.INVITE_CODE);
  localStorage.removeItem(STORAGE_KEYS.REFERRAL_CODE);
  localStorage.removeItem(STORAGE_KEYS.CAPTURED_AT);
  console.log('[Referral] Cleared stored codes');
}

/**
 * Check if codes are expired (older than 30 days)
 */
export function areCodesExpired(): boolean {
  const capturedAt = localStorage.getItem(STORAGE_KEYS.CAPTURED_AT);
  if (!capturedAt) return false;
  
  const capturedDate = new Date(capturedAt);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return capturedDate < thirtyDaysAgo;
}

/**
 * Initialize referral capture on app load
 * Should be called once in the main App component
 */
export function initializeReferralCapture(): void {
  // Capture codes from current URL
  captureReferralCodes();
  
  // Clean up expired codes
  if (areCodesExpired()) {
    console.log('[Referral] Clearing expired codes');
    clearStoredCodes();
  }
  
  // Clean URL parameters without page reload
  if (window.location.search.includes('code=') || 
      window.location.search.includes('invite=') || 
      window.location.search.includes('ref=') || 
      window.location.search.includes('referral=')) {
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('invite');
    url.searchParams.delete('ref');
    url.searchParams.delete('referral');
    window.history.replaceState({}, '', url.toString());
  }
}