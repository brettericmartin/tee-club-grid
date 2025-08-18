import { supabase } from './supabase';
import enhancedAuth from './enhancedAuth';

/**
 * Handle tab visibility changes to maintain auth state
 */

const DEBUG = true;
const log = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[TabFocusAuth] ${new Date().toISOString()} - ${message}`, data || '');
  }
};

// Track tab state
let isTabVisible = true;
let lastVisibilityChange = Date.now();
let tabBlurTime: number | null = null;
let refreshOnFocusTimer: NodeJS.Timeout | null = null;

/**
 * Initialize tab focus authentication handling
 */
export function initializeTabFocusAuth() {
  log('Initializing tab focus auth handler');

  // Handle visibility change (works in all browsers)
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Handle window focus/blur (additional coverage)
  window.addEventListener('focus', handleWindowFocus);
  window.addEventListener('blur', handleWindowBlur);
  
  // Handle page show/hide (for mobile and back/forward cache)
  window.addEventListener('pageshow', handlePageShow);
  window.addEventListener('pagehide', handlePageHide);
  
  // Check session periodically when tab is visible
  startVisibleTabMonitoring();
  
  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleWindowFocus);
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('pageshow', handlePageShow);
    window.removeEventListener('pagehide', handlePageHide);
    stopVisibleTabMonitoring();
  };
}

/**
 * Handle document visibility change
 */
async function handleVisibilityChange() {
  const wasVisible = isTabVisible;
  isTabVisible = !document.hidden;
  lastVisibilityChange = Date.now();
  
  log(`Tab visibility changed: ${wasVisible ? 'visible' : 'hidden'} -> ${isTabVisible ? 'visible' : 'hidden'}`);
  
  if (isTabVisible && !wasVisible) {
    // Tab became visible
    await handleTabBecameVisible();
  } else if (!isTabVisible && wasVisible) {
    // Tab became hidden
    handleTabBecameHidden();
  }
}

/**
 * Handle window focus
 */
async function handleWindowFocus() {
  log('Window gained focus');
  isTabVisible = true;
  
  // Clear any pending refresh timer
  if (refreshOnFocusTimer) {
    clearTimeout(refreshOnFocusTimer);
    refreshOnFocusTimer = null;
  }
  
  await handleTabBecameVisible();
}

/**
 * Handle window blur
 */
function handleWindowBlur() {
  log('Window lost focus');
  tabBlurTime = Date.now();
  
  // Don't immediately mark as hidden - user might be using dev tools
  // Set a timer to check if we're really hidden
  refreshOnFocusTimer = setTimeout(() => {
    if (!document.hasFocus() && document.hidden) {
      isTabVisible = false;
      handleTabBecameHidden();
    }
  }, 1000);
}

/**
 * Handle page show event (for back/forward cache)
 */
async function handlePageShow(event: PageTransitionEvent) {
  log('Page show event', { persisted: event.persisted });
  
  if (event.persisted) {
    // Page was restored from back/forward cache
    log('Page restored from cache, checking auth');
    await forceAuthRefresh();
  }
}

/**
 * Handle page hide event
 */
function handlePageHide() {
  log('Page hide event');
  tabBlurTime = Date.now();
}

/**
 * Handle tab becoming visible
 */
async function handleTabBecameVisible() {
  const hiddenDuration = tabBlurTime ? Date.now() - tabBlurTime : 0;
  log(`Tab became visible after ${Math.round(hiddenDuration / 1000)}s`);
  
  // Reset blur time
  tabBlurTime = null;
  
  // If tab was hidden for more than 30 seconds, check session
  if (hiddenDuration > 30000) {
    log('Tab was hidden for >30s, checking session');
    await checkAndRestoreSession();
  } else if (hiddenDuration > 5000) {
    // If hidden for more than 5 seconds, do a lighter check
    log('Tab was hidden for >5s, doing light session check');
    await lightSessionCheck();
  }
  
  // Resume active monitoring
  startVisibleTabMonitoring();
}

/**
 * Handle tab becoming hidden
 */
function handleTabBecameHidden() {
  log('Tab became hidden');
  tabBlurTime = Date.now();
  
  // Stop aggressive monitoring when tab is hidden
  stopVisibleTabMonitoring();
  
  // Keep session alive with a heartbeat
  startHiddenTabHeartbeat();
}

/**
 * Check and restore session
 */
async function checkAndRestoreSession() {
  try {
    log('Checking and restoring session...');
    
    // First, check if we have a session
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (!currentSession) {
      log('No session found, user needs to sign in');
      return null;
    }
    
    // Check if session is still valid
    const expiresAt = currentSession.expires_at;
    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      const remainingTime = expiresAt - now;
      
      if (remainingTime < 300) { // Less than 5 minutes
        log('Session expiring soon, refreshing');
        return await forceAuthRefresh();
      } else {
        log(`Session still valid for ${Math.round(remainingTime / 60)} minutes`);
        return currentSession;
      }
    }
    
    return currentSession;
  } catch (error) {
    log('Error checking session', error);
    // Try to refresh anyway
    return await forceAuthRefresh();
  }
}

/**
 * Light session check (no refresh unless necessary)
 */
async function lightSessionCheck() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      log('Session still active');
    } else {
      log('Session lost, attempting refresh');
      await forceAuthRefresh();
    }
  } catch (error) {
    log('Error in light session check', error);
  }
}

/**
 * Force auth refresh
 */
async function forceAuthRefresh() {
  try {
    log('Forcing auth refresh...');
    
    // Use enhanced auth's refresh mechanism
    const session = await enhancedAuth.refreshToken();
    
    if (session) {
      log('Session refreshed successfully via tab focus handler');
      
      // Trigger a custom event that components can listen to
      window.dispatchEvent(new CustomEvent('auth-refreshed', { detail: { session } }));
    } else {
      log('Failed to refresh session');
      
      // Try one more time with Supabase directly
      const { data: { session: directSession }, error } = await supabase.auth.refreshSession();
      if (directSession) {
        log('Session refreshed via direct Supabase call');
        window.dispatchEvent(new CustomEvent('auth-refreshed', { detail: { session: directSession } }));
        return directSession;
      } else if (error) {
        log('Direct refresh also failed', error);
      }
    }
    
    return session;
  } catch (error) {
    log('Error forcing auth refresh', error);
    return null;
  }
}

// Monitoring intervals
let visibleMonitorInterval: NodeJS.Timeout | null = null;
let hiddenHeartbeatInterval: NodeJS.Timeout | null = null;

/**
 * Start monitoring when tab is visible
 */
function startVisibleTabMonitoring() {
  stopVisibleTabMonitoring();
  
  if (!isTabVisible) return;
  
  log('Starting visible tab monitoring');
  
  // Check more frequently when tab is visible
  visibleMonitorInterval = setInterval(async () => {
    if (isTabVisible) {
      await lightSessionCheck();
    }
  }, 60000); // Every minute when visible
}

/**
 * Stop visible tab monitoring
 */
function stopVisibleTabMonitoring() {
  if (visibleMonitorInterval) {
    clearInterval(visibleMonitorInterval);
    visibleMonitorInterval = null;
    log('Stopped visible tab monitoring');
  }
}

/**
 * Start heartbeat when tab is hidden
 */
function startHiddenTabHeartbeat() {
  stopHiddenTabHeartbeat();
  
  if (isTabVisible) return;
  
  log('Starting hidden tab heartbeat');
  
  // Less frequent checks when hidden to save resources
  hiddenHeartbeatInterval = setInterval(async () => {
    if (!isTabVisible) {
      // Just keep the session alive, don't refresh unless necessary
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const expiresAt = session.expires_at;
        if (expiresAt) {
          const now = Math.floor(Date.now() / 1000);
          const remainingTime = expiresAt - now;
          
          if (remainingTime < 600) { // Less than 10 minutes
            log('Hidden tab: Session expiring soon, refreshing');
            await forceAuthRefresh();
          }
        }
      }
    } else {
      // Tab became visible, stop heartbeat
      stopHiddenTabHeartbeat();
    }
  }, 5 * 60 * 1000); // Every 5 minutes when hidden
}

/**
 * Stop hidden tab heartbeat
 */
function stopHiddenTabHeartbeat() {
  if (hiddenHeartbeatInterval) {
    clearInterval(hiddenHeartbeatInterval);
    hiddenHeartbeatInterval = null;
    log('Stopped hidden tab heartbeat');
  }
}

/**
 * Get tab focus status
 */
export function getTabFocusStatus() {
  return {
    isVisible: isTabVisible,
    lastChange: lastVisibilityChange,
    hiddenDuration: tabBlurTime ? Date.now() - tabBlurTime : 0
  };
}

/**
 * Manual focus check (for debugging)
 */
export async function manualFocusCheck() {
  const status = getTabFocusStatus();
  log('Manual focus check', status);
  
  if (status.isVisible) {
    await checkAndRestoreSession();
  }
  
  return status;
}

// Add to window for debugging
if (typeof window !== 'undefined') {
  (window as any).tabFocusAuth = {
    status: getTabFocusStatus,
    check: manualFocusCheck,
    refresh: forceAuthRefresh
  };
  
  console.log('📱 Tab Focus Auth Tools:');
  console.log('  tabFocusAuth.status() - Get current tab status');
  console.log('  tabFocusAuth.check() - Manual focus check');
  console.log('  tabFocusAuth.refresh() - Force refresh on focus');
}

export default {
  initialize: initializeTabFocusAuth,
  getStatus: getTabFocusStatus,
  checkFocus: manualFocusCheck,
  forceRefresh: forceAuthRefresh
};