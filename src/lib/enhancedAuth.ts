import { supabase } from './supabase';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

/**
 * Enhanced auth management with better token handling
 */

// Track auth state changes
let authStateListeners: ((event: AuthChangeEvent, session: Session | null) => void)[] = [];

// Session refresh configuration
const SESSION_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes (less aggressive)
const SESSION_CHECK_INTERVAL = 60 * 1000; // 60 seconds (less frequent)
const TOKEN_EXPIRY_BUFFER = 5 * 60; // 5 minutes before expiry

// Debug logging
const DEBUG = false; // Disabled to reduce console noise
let log = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[EnhancedAuth] ${new Date().toISOString()} - ${message}`, data || '');
  }
};

/**
 * Initialize enhanced auth monitoring
 */
export function initializeEnhancedAuth() {
  log('Initializing enhanced auth monitoring');

  // Subscribe to auth state changes
  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    log(`Auth state changed: ${event}`, {
      hasSession: !!session,
      expiresAt: session?.expires_at,
      expiresIn: session?.expires_in,
      user: session?.user?.email
    });

    // Handle different auth events
    switch (event) {
      case 'SIGNED_IN':
        log('User signed in');
        startTokenRefreshTimer(session);
        break;
      
      case 'SIGNED_OUT':
        log('User signed out');
        stopTokenRefreshTimer();
        break;
      
      case 'TOKEN_REFRESHED':
        log('Token refreshed successfully');
        startTokenRefreshTimer(session);
        break;
      
      case 'USER_UPDATED':
        log('User data updated');
        break;
      
      case 'PASSWORD_RECOVERY':
        log('Password recovery initiated');
        break;
    }

    // Notify all listeners
    authStateListeners.forEach(listener => listener(event, session));
  });

  // Start monitoring session
  startSessionMonitoring();

  // Return cleanup function
  return () => {
    authListener?.subscription.unsubscribe();
    stopTokenRefreshTimer();
    stopSessionMonitoring();
  };
}

// Token refresh timer
let tokenRefreshTimer: NodeJS.Timeout | null = null;

/**
 * Start automatic token refresh timer
 */
function startTokenRefreshTimer(session: Session | null) {
  stopTokenRefreshTimer();
  
  if (!session) {
    log('No session to refresh');
    return;
  }

  const expiresAt = session.expires_at;
  if (!expiresAt) {
    log('Session has no expiry time');
    return;
  }

  // Calculate when to refresh (5 minutes before expiry)
  const now = Math.floor(Date.now() / 1000);
  const refreshAt = expiresAt - TOKEN_EXPIRY_BUFFER;
  const timeUntilRefresh = Math.max(0, (refreshAt - now) * 1000);

  log(`Scheduling token refresh in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);

  tokenRefreshTimer = setTimeout(async () => {
    log('Token refresh timer triggered');
    await forceTokenRefresh();
  }, timeUntilRefresh);
}

/**
 * Stop token refresh timer
 */
function stopTokenRefreshTimer() {
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
    tokenRefreshTimer = null;
    log('Token refresh timer stopped');
  }
}

// Session monitoring
let sessionMonitorInterval: NodeJS.Timeout | null = null;

/**
 * Start session monitoring
 */
function startSessionMonitoring() {
  stopSessionMonitoring();
  
  log('Starting session monitoring');
  
  sessionMonitorInterval = setInterval(async () => {
    const session = await checkAndRefreshSession();
    if (!session) {
      log('Session check: No active session');
    } else {
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const now = Math.floor(Date.now() / 1000);
        const remainingTime = expiresAt - now;
        log(`Session check: Token expires in ${Math.round(remainingTime / 60)} minutes`);
        
        // If less than 5 minutes remaining, refresh now
        if (remainingTime < TOKEN_EXPIRY_BUFFER) {
          log('Token expiring soon, refreshing now');
          await forceTokenRefresh();
        }
      }
    }
  }, SESSION_CHECK_INTERVAL);
}

/**
 * Stop session monitoring
 */
function stopSessionMonitoring() {
  if (sessionMonitorInterval) {
    clearInterval(sessionMonitorInterval);
    sessionMonitorInterval = null;
    log('Session monitoring stopped');
  }
}

/**
 * Check and refresh session if needed
 */
export async function checkAndRefreshSession(): Promise<Session | null> {
  try {
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      log('Error getting session', error);
      return null;
    }
    
    if (!session) {
      return null;
    }
    
    // Check if session is expired or expiring soon
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      const remainingTime = expiresAt - now;
      
      if (remainingTime < TOKEN_EXPIRY_BUFFER) {
        log('Session expiring soon, refreshing...');
        return await forceTokenRefresh();
      }
    }
    
    return session;
  } catch (error) {
    log('Error checking session', error);
    return null;
  }
}

/**
 * Force a token refresh
 */
export async function forceTokenRefresh(): Promise<Session | null> {
  try {
    log('Forcing token refresh...');
    
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      log('Failed to refresh session', error);
      
      // If refresh fails, try to get a new session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        log('Using existing session after refresh failure');
        return currentSession;
      }
      
      return null;
    }
    
    if (session) {
      log('Session refreshed successfully', {
        expiresAt: session.expires_at,
        expiresIn: session.expires_in
      });
      
      // Restart the refresh timer with new session
      startTokenRefreshTimer(session);
    }
    
    return session;
  } catch (error) {
    log('Error refreshing session', error);
    return null;
  }
}

/**
 * Get current valid session or null
 */
export async function getValidSession(): Promise<Session | null> {
  const session = await checkAndRefreshSession();
  if (session) {
    log('Valid session obtained');
  } else {
    log('No valid session available');
  }
  return session;
}

/**
 * Add auth state change listener
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  authStateListeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    authStateListeners = authStateListeners.filter(listener => listener !== callback);
  };
}

/**
 * Manually trigger session check
 */
export async function manualSessionCheck() {
  log('Manual session check requested');
  const session = await checkAndRefreshSession();
  
  if (session) {
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      const remainingMinutes = Math.round((expiresAt - now) / 60);
      log(`Session valid for ${remainingMinutes} more minutes`);
      
      // Show user feedback
      if ((window as any).toast) {
        (window as any).toast.success(`Session valid for ${remainingMinutes} more minutes`);
      }
    }
  } else {
    log('No active session found');
    if ((window as any).toast) {
      (window as any).toast.error('No active session. Please sign in again.');
    }
  }
  
  return session;
}

// Add to window for debugging
if (typeof window !== 'undefined') {
  (window as any).authDebug = {
    checkSession: manualSessionCheck,
    refreshToken: forceTokenRefresh,
    getSession: getValidSession,
    logs: [] as string[],
    showLogs: () => {
      console.log('=== Auth Debug Logs ===');
      (window as any).authDebug.logs.forEach((log: string) => console.log(log));
      console.log('======================');
    },
    clearLogs: () => {
      (window as any).authDebug.logs = [];
      console.log('Logs cleared');
    }
  };
  
  // Store original log function
  const originalLog = log;
  
  // Create new log function that also stores in window
  const enhancedLog = (message: string, data?: any) => {
    originalLog(message, data);
    (window as any).authDebug.logs.push(`${new Date().toISOString()} - ${message}`);
    // Keep only last 100 logs
    if ((window as any).authDebug.logs.length > 100) {
      (window as any).authDebug.logs.shift();
    }
  };
  
  // Replace log function
  log = enhancedLog;
  
  // Add toast to window for enhanced auth
  (window as any).toast = (window as any).toast || {
    success: (msg: string) => console.log('✅', msg),
    error: (msg: string) => console.error('❌', msg)
  };
  
  // Only show debug tools in development
  if (import.meta.env.DEV) {
    console.log('🔐 Auth Debug Tools Available:');
    console.log('  authDebug.checkSession() - Check current session status');
    console.log('  authDebug.refreshToken() - Force token refresh');
    console.log('  authDebug.getSession() - Get current session');
    console.log('  authDebug.showLogs() - Show recent auth logs');
    console.log('  authDebug.clearLogs() - Clear auth logs');
  }
}

export default {
  initialize: initializeEnhancedAuth,
  checkSession: checkAndRefreshSession,
  refreshToken: forceTokenRefresh,
  getValidSession,
  onAuthStateChange,
  manualCheck: manualSessionCheck
};