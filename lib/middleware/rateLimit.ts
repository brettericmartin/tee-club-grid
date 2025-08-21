/**
 * Rate Limiting Middleware for Vercel Functions
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { RateLimiter, getClientIp, type RateLimitConfig } from '../../src/services/rateLimiter';

// Initialize rate limiter with Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const rateLimiter = new RateLimiter(supabaseUrl, supabaseServiceKey);

// Default rate limit configuration
const DEFAULT_CONFIG: RateLimitConfig = {
  burst: 30,
  perMinute: 10,
  endpoint: 'default'
};

/**
 * Rate limiting middleware
 * @param config - Optional rate limit configuration
 * @returns Middleware function
 */
export function withRateLimit(config?: Partial<RateLimitConfig>) {
  const finalConfig: RateLimitConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };
  
  return function rateLimit(
    handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
  ) {
    return async (req: VercelRequest, res: VercelResponse) => {
      // Check if rate limiting is enabled via environment variable
      if (process.env.RATE_LIMIT_ENABLED === 'false') {
        return handler(req, res);
      }
      
      // Extract client IP
      const clientIp = getClientIp(req.headers as Record<string, string | string[] | undefined>);
      
      // Apply rate limiting
      const result = await rateLimiter.checkLimit(clientIp, finalConfig);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', finalConfig.burst.toString());
      res.setHeader('X-RateLimit-Remaining', result.remainingTokens.toString());
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + result.resetAfter * 1000).toISOString());
      
      if (!result.allowed) {
        // Request denied due to rate limit
        res.setHeader('Retry-After', result.retryAfter?.toString() || '60');
        
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: result.retryAfter
        });
      }
      
      // Proceed with the request
      return handler(req, res);
    };
  };
}

/**
 * Apply rate limiting directly within a handler
 * Useful when you need different limits for different conditions
 */
export async function checkRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  config?: Partial<RateLimitConfig>
): Promise<boolean> {
  const finalConfig: RateLimitConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };
  
  // Check if rate limiting is enabled
  if (process.env.RATE_LIMIT_ENABLED === 'false') {
    return true;
  }
  
  const clientIp = getClientIp(req.headers as Record<string, string | string[] | undefined>);
  const result = await rateLimiter.checkLimit(clientIp, finalConfig);
  
  // Set headers
  res.setHeader('X-RateLimit-Limit', finalConfig.burst.toString());
  res.setHeader('X-RateLimit-Remaining', result.remainingTokens.toString());
  res.setHeader('X-RateLimit-Reset', new Date(Date.now() + result.resetAfter * 1000).toISOString());
  
  if (!result.allowed) {
    res.setHeader('Retry-After', result.retryAfter?.toString() || '60');
  }
  
  return result.allowed;
}

/**
 * Periodic cleanup of old rate limit entries
 * Call this from a cron job or scheduled function
 */
export async function cleanupRateLimits(): Promise<void> {
  await rateLimiter.cleanup();
}