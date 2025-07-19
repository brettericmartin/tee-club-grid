// Environment-based logging utility
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors
    console.error(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  debug: (...args: any[]) => {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  }
};

// For production-critical logs that should always appear
export const prodLogger = {
  error: console.error,
  critical: (...args: any[]) => console.error('[CRITICAL]', ...args)
};