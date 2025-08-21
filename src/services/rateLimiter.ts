/**
 * Rate Limiter Service
 * Implements a leaky bucket algorithm using Supabase for storage
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface RateLimitConfig {
  burst: number;           // Max tokens in bucket (burst capacity)
  perMinute: number;       // Tokens refilled per minute (sustained rate)
  endpoint: string;        // API endpoint being limited
}

export interface RateLimitResult {
  allowed: boolean;        // Whether request is allowed
  remainingTokens: number; // Tokens left in bucket
  resetAfter: number;      // Seconds until next token refill
  retryAfter?: number;     // Seconds to wait before retry (if not allowed)
}

export class RateLimiter {
  private supabase: SupabaseClient;
  
  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  /**
   * Check and consume rate limit for an identifier
   * @param identifier - Usually IP address
   * @param config - Rate limit configuration
   * @returns Rate limit result
   */
  async checkLimit(
    identifier: string, 
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    try {
      // Get current bucket state
      const { data: bucket, error: fetchError } = await this.supabase
        .from('rate_limit_buckets')
        .select('*')
        .eq('identifier', identifier)
        .eq('endpoint', config.endpoint)
        .single();
      
      const now = new Date();
      const tokensPerSecond = config.perMinute / 60;
      
      if (!bucket || fetchError?.code === 'PGRST116') {
        // No bucket exists, create new one
        const newBucket = {
          identifier,
          endpoint: config.endpoint,
          tokens: config.burst - 1, // Consume 1 token for this request
          last_refill: now.toISOString(),
          request_count: 1,
          last_request_at: now.toISOString()
        };
        
        const { error: insertError } = await this.supabase
          .from('rate_limit_buckets')
          .insert(newBucket);
        
        if (insertError) {
          console.error('Error creating rate limit bucket:', insertError);
          // On error, allow request but log it
          return {
            allowed: true,
            remainingTokens: config.burst - 1,
            resetAfter: 0
          };
        }
        
        return {
          allowed: true,
          remainingTokens: config.burst - 1,
          resetAfter: Math.ceil(1 / tokensPerSecond)
        };
      }
      
      // Calculate tokens to add based on time elapsed
      const lastRefill = new Date(bucket.last_refill);
      const secondsElapsed = (now.getTime() - lastRefill.getTime()) / 1000;
      const tokensToAdd = Math.min(
        secondsElapsed * tokensPerSecond,
        config.burst - bucket.tokens
      );
      
      // Calculate new token count
      const newTokens = Math.min(bucket.tokens + tokensToAdd, config.burst);
      
      // Check if request can be allowed
      if (newTokens >= 1) {
        // Consume 1 token and update bucket
        const updatedTokens = newTokens - 1;
        
        const { error: updateError } = await this.supabase
          .from('rate_limit_buckets')
          .update({
            tokens: updatedTokens,
            last_refill: now.toISOString(),
            request_count: bucket.request_count + 1,
            last_request_at: now.toISOString()
          })
          .eq('identifier', identifier)
          .eq('endpoint', config.endpoint);
        
        if (updateError) {
          console.error('Error updating rate limit bucket:', updateError);
        }
        
        return {
          allowed: true,
          remainingTokens: Math.floor(updatedTokens),
          resetAfter: Math.ceil((1 - (updatedTokens % 1)) / tokensPerSecond)
        };
      } else {
        // Not enough tokens, request denied
        const tokensNeeded = 1 - newTokens;
        const secondsToWait = Math.ceil(tokensNeeded / tokensPerSecond);
        
        // Log rate limit exceeded
        await this.logAbuseMetric('rate_limit_exceeded', identifier, config.endpoint, {
          tokens_available: newTokens,
          tokens_needed: 1
        });
        
        return {
          allowed: false,
          remainingTokens: 0,
          resetAfter: secondsToWait,
          retryAfter: secondsToWait
        };
      }
    } catch (error) {
      console.error('Rate limiter error:', error);
      // On error, allow request to avoid blocking legitimate users
      return {
        allowed: true,
        remainingTokens: 0,
        resetAfter: 60
      };
    }
  }
  
  /**
   * Log an abuse metric for monitoring
   */
  async logAbuseMetric(
    metricType: string,
    identifier: string,
    endpoint: string,
    metadata?: any
  ): Promise<void> {
    try {
      await this.supabase
        .from('abuse_metrics')
        .insert({
          metric_type: metricType,
          identifier,
          endpoint,
          metadata: metadata || {}
        });
    } catch (error) {
      console.error('Error logging abuse metric:', error);
    }
  }
  
  /**
   * Clean up old rate limit entries
   */
  async cleanup(): Promise<void> {
    try {
      const { error } = await this.supabase
        .rpc('cleanup_old_rate_limits');
      
      if (error) {
        console.error('Error cleaning up rate limits:', error);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
  
  /**
   * Check if CAPTCHA should be auto-enabled based on abuse metrics
   */
  async shouldEnableCaptcha(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .rpc('should_enable_captcha');
      
      if (error) {
        console.error('Error checking captcha status:', error);
        return false;
      }
      
      return data || false;
    } catch (error) {
      console.error('Error checking captcha:', error);
      return false;
    }
  }
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  // Try various headers in order of preference
  const candidates = [
    headers['x-real-ip'],
    headers['x-forwarded-for']?.toString().split(',')[0].trim(),
    headers['cf-connecting-ip'],
    headers['x-client-ip'],
    headers['x-cluster-client-ip'],
    headers['x-forwarded'],
    headers['forwarded-for'],
    headers['forwarded']?.toString().match(/for=([^;,]+)/)?.[1]
  ];
  
  for (const ip of candidates) {
    if (ip && typeof ip === 'string' && ip !== 'unknown') {
      // Basic IP validation (IPv4 or IPv6)
      const trimmedIp = ip.trim();
      if (/^[\d.]+$/.test(trimmedIp) || /^[\da-fA-F:]+$/.test(trimmedIp)) {
        return trimmedIp;
      }
    }
  }
  
  // Fallback to a generic identifier
  return 'unknown-ip';
}