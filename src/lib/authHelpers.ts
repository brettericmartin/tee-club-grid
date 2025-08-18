import { supabase } from './supabase';
import { PostgrestError, Session } from '@supabase/supabase-js';

/**
 * Check if an error is an authentication/session error
 */
export function isAuthError(error: PostgrestError | Error | null): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || '';
  const errorCode = 'code' in error ? error.code : '';
  
  return (
    errorMessage.includes('JWT') ||
    errorMessage.includes('token') ||
    errorMessage.includes('expired') ||
    errorMessage.includes('refresh') ||
    errorCode === 'PGRST301' ||
    errorCode === '401'
  );
}

/**
 * Check if session is expired or about to expire
 */
export function isSessionExpired(session: Session | null): boolean {
  if (!session) return true;
  
  const expiresAt = session.expires_at;
  if (!expiresAt) return false;
  
  // Check if expired or expiring in the next 60 seconds
  const now = Math.floor(Date.now() / 1000);
  const bufferTime = 60; // 60 seconds buffer
  
  return expiresAt <= (now + bufferTime);
}

/**
 * Attempt to refresh the session
 */
export async function refreshSession() {
  try {
    console.log('[AuthHelper] Attempting to refresh session...');
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('[AuthHelper] Failed to refresh session:', error);
      // Clear invalid session
      await supabase.auth.signOut();
      return null;
    }
    if (session) {
      console.log('[AuthHelper] Session refreshed successfully');
    }
    return session;
  } catch (err) {
    console.error('[AuthHelper] Error refreshing session:', err);
    return null;
  }
}

/**
 * Get valid session or refresh if needed
 */
export async function getValidSession(): Promise<Session | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('[AuthHelper] No session found');
      return null;
    }
    
    if (isSessionExpired(session)) {
      console.log('[AuthHelper] Session expired or expiring soon, refreshing...');
      return await refreshSession();
    }
    
    return session;
  } catch (error) {
    console.error('[AuthHelper] Error getting valid session:', error);
    return null;
  }
}

/**
 * Execute a query with automatic retry on auth failure
 */
export async function executeWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options?: {
    maxRetries?: number;
    fallbackFn?: () => Promise<{ data: T | null; error: PostgrestError | null }>;
  }
): Promise<{ data: T | null; error: PostgrestError | null }> {
  const maxRetries = options?.maxRetries || 1;
  let attempts = 0;
  
  // Check session validity before first attempt
  const validSession = await getValidSession();
  
  while (attempts <= maxRetries) {
    const result = await queryFn();
    
    if (!result.error) {
      return result;
    }
    
    if (isAuthError(result.error) && attempts < maxRetries) {
      console.log('[AuthHelper] Auth error detected, attempting to refresh session...');
      const session = await refreshSession();
      
      if (session) {
        console.log('[AuthHelper] Session refreshed, retrying query...');
        attempts++;
        // Small delay to ensure token propagation
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      } else if (options?.fallbackFn) {
        console.log('[AuthHelper] Using fallback query for anonymous access...');
        return await options.fallbackFn();
      } else {
        // Session expired and no fallback - user needs to re-authenticate
        return { 
          data: null, 
          error: { 
            message: 'Session expired. Please sign in again.',
            code: 'SESSION_EXPIRED',
            details: 'Your session has expired and could not be refreshed.',
            hint: 'Please sign in again to continue.'
          } as PostgrestError 
        };
      }
    }
    
    return result;
  }
  
  // This should never be reached, but TypeScript needs it
  return { data: null, error: { message: 'Max retries exceeded' } as PostgrestError };
}

/**
 * Get the current user ID safely
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (err) {
    console.error('[AuthHelper] Error getting current user:', err);
    return null;
  }
}

/**
 * Check if a user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await getValidSession();
    return !!session;
  } catch (err) {
    console.error('[AuthHelper] Error checking authentication:', err);
    return false;
  }
}

/**
 * Monitor session changes and handle expiration
 */
export function setupSessionMonitor(
  onSessionExpired?: () => void,
  onSessionRefreshed?: (session: Session) => void
): () => void {
  let checkInterval: NodeJS.Timeout | null = null;
  
  const startMonitoring = () => {
    // Check every 30 seconds
    checkInterval = setInterval(async () => {
      const session = await getValidSession();
      
      if (!session && onSessionExpired) {
        console.log('[AuthHelper] Session monitor detected expired session');
        onSessionExpired();
        stopMonitoring();
      } else if (session && onSessionRefreshed) {
        // Session was refreshed
        onSessionRefreshed(session);
      }
    }, 30000); // 30 seconds
  };
  
  const stopMonitoring = () => {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  };
  
  // Start monitoring immediately
  startMonitoring();
  
  // Return cleanup function
  return stopMonitoring;
}