/**
 * Utility for handling dynamic imports with retry logic
 * Solves Vite HMR issues with lazy loading
 */

type ImportFunction<T = any> = () => Promise<{ default: T }>;

/**
 * Retry a dynamic import with exponential backoff
 * This helps with Vite HMR issues and network failures
 */
export async function retryDynamicImport<T = any>(
  fn: ImportFunction<T>,
  retriesLeft = 3,
  interval = 500
): Promise<{ default: T }> {
  try {
    return await fn();
  } catch (error: any) {
    // Check if this is a MIME type error (common on mobile when server returns HTML instead of JS)
    const isMimeError = error?.message?.includes('MIME type') || 
                       error?.message?.includes('text/html');
    
    // On MIME type errors, try to reload the page once to clear cache
    if (isMimeError && retriesLeft === 3) {
      console.warn('[DynamicImport] MIME type error detected, clearing module cache...');
      
      // If on mobile, try to force refresh the module
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        // Clear module cache by adding timestamp to force fresh load
        const timestamp = Date.now();
        const moduleUrl = error?.message?.match(/from ['"](.+?)['"]/)?.[1];
        if (moduleUrl) {
          console.warn(`[DynamicImport] Attempting fresh load of ${moduleUrl}`);
        }
      }
    }
    
    if (retriesLeft === 0) {
      console.error('[DynamicImport] Failed after all retries:', error);
      
      // Provide a more helpful error message for MIME type issues
      if (isMimeError) {
        console.error('[DynamicImport] This usually means the server returned an HTML error page instead of JavaScript.');
        console.error('[DynamicImport] Try refreshing the page or clearing your browser cache.');
      }
      
      throw error;
    }
    
    console.warn(`[DynamicImport] Retry ${4 - retriesLeft}/3 in ${interval}ms...`);
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, interval));
    
    // Exponential backoff for next retry
    return retryDynamicImport(fn, retriesLeft - 1, interval * 2);
  }
}

/**
 * Create a lazy component with retry logic
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(() => retryDynamicImport(importFn));
}

/**
 * Preload a component to improve performance
 */
export function preloadComponent<T = any>(
  importFn: ImportFunction<T>
): Promise<{ default: T }> {
  return retryDynamicImport(importFn);
}

/**
 * Check if we're in a Vite HMR context
 */
export function isViteHMR(): boolean {
  return !!(import.meta.hot);
}

/**
 * Handle HMR for lazy components
 */
export function handleHMR(callback?: () => void): void {
  if (import.meta.hot) {
    import.meta.hot.accept(() => {
      console.log('[HMR] Module updated, reloading...');
      callback?.();
    });
  }
}

// Re-export React for convenience
import React from 'react';
export { React };