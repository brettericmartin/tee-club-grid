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
  } catch (error) {
    if (retriesLeft === 0) {
      console.error('[DynamicImport] Failed after all retries:', error);
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