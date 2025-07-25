import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticatedRequest } from './auth';

// Simple in-memory rate limiter (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  windowMs?: number;  // Time window in milliseconds (default: 60000 = 1 minute)
  maxRequests?: number;  // Max requests per window (default: 5)
  keyGenerator?: (req: AuthenticatedRequest) => string;  // Function to generate rate limit key
}

/**
 * Rate limiting middleware for API endpoints
 * Limits requests per user within a time window
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 60 * 1000,  // 1 minute
    maxRequests = 5,
    keyGenerator = (req) => req.userId || req.headers['x-forwarded-for'] as string || 'anonymous'
  } = options;

  return (handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<void>) => {
    return async (req: AuthenticatedRequest, res: VercelResponse) => {
      try {
        const key = keyGenerator(req);
        const now = Date.now();
        
        // Get or create rate limit entry
        let rateLimitEntry = rateLimitMap.get(key);
        
        if (!rateLimitEntry || rateLimitEntry.resetTime < now) {
          // Create new entry or reset expired one
          rateLimitEntry = {
            count: 0,
            resetTime: now + windowMs
          };
          rateLimitMap.set(key, rateLimitEntry);
        }

        // Increment request count
        rateLimitEntry.count++;

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - rateLimitEntry.count).toString());
        res.setHeader('X-RateLimit-Reset', rateLimitEntry.resetTime.toString());

        // Check if limit exceeded
        if (rateLimitEntry.count > maxRequests) {
          const retryAfter = Math.ceil((rateLimitEntry.resetTime - now) / 1000);
          res.setHeader('Retry-After', retryAfter.toString());
          
          return res.status(429).json({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
            retryAfter
          });
        }

        // Continue to handler
        return handler(req, res);
      } catch (error) {
        console.error('Rate limit middleware error:', error);
        // Don't block on rate limit errors
        return handler(req, res);
      }
    };
  };
}

/**
 * Stricter rate limit for AI/expensive operations
 */
export const strictRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  maxRequests: 3  // 3 requests per 5 minutes
});