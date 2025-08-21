import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for analytics writes
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Rate limiting using leaky bucket algorithm
const rateLimits = new Map<string, {
  tokens: number;
  lastRefill: number;
}>();

const RATE_LIMIT_CONFIG = {
  maxTokens: 100,        // Max events per IP per minute
  refillRate: 100,       // Refill all tokens every minute
  refillInterval: 60000, // 1 minute in ms
};

interface TrackedEvent {
  event_name: string;
  properties: Record<string, any>;
  user_id?: string;
  session_id?: string;
}

interface TrackRequest {
  events: TrackedEvent[];
}

// Get client IP address
function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' 
    ? forwarded.split(',')[0].trim()
    : req.socket.remoteAddress || 'unknown';
  return ip;
}

// Check rate limit for IP
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  let bucket = rateLimits.get(ip);

  if (!bucket) {
    bucket = {
      tokens: RATE_LIMIT_CONFIG.maxTokens,
      lastRefill: now,
    };
    rateLimits.set(ip, bucket);
  }

  // Refill tokens if needed
  const timeSinceRefill = now - bucket.lastRefill;
  if (timeSinceRefill >= RATE_LIMIT_CONFIG.refillInterval) {
    bucket.tokens = RATE_LIMIT_CONFIG.maxTokens;
    bucket.lastRefill = now;
  }

  // Check if we have tokens available
  if (bucket.tokens > 0) {
    bucket.tokens--;
    return true;
  }

  return false;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  const staleTime = 5 * 60 * 1000; // 5 minutes
  
  for (const [ip, bucket] of rateLimits.entries()) {
    if (now - bucket.lastRefill > staleTime) {
      rateLimits.delete(ip);
    }
  }
}, 60000); // Clean every minute

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get client IP for rate limiting
  const clientIp = getClientIp(req);

  // Check rate limit
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ 
      error: 'Too many requests', 
      retryAfter: RATE_LIMIT_CONFIG.refillInterval / 1000 
    });
  }

  try {
    const { events } = req.body as TrackRequest;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Validate and process events
    const validEvents = events
      .filter(event => {
        // Basic validation
        return event.event_name && 
               typeof event.event_name === 'string' &&
               event.event_name.length <= 100 &&
               (!event.properties || typeof event.properties === 'object');
      })
      .slice(0, 50); // Max 50 events per batch

    if (validEvents.length === 0) {
      return res.status(400).json({ error: 'No valid events to track' });
    }

    // Get user ID from auth if available
    const authHeader = req.headers.authorization;
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Insert events into database
    const insertPromises = validEvents.map(event => {
      return supabase.rpc('track_analytics_event', {
        p_event_name: event.event_name,
        p_user_id: event.user_id || userId,
        p_session_id: event.session_id || event.properties?.session_id,
        p_properties: event.properties || {},
        p_page_url: event.properties?.page_url,
        p_referrer: event.properties?.referrer,
        p_user_agent: req.headers['user-agent'] || event.properties?.user_agent,
        p_ip_address: clientIp === 'unknown' ? null : clientIp,
      });
    });

    const results = await Promise.allSettled(insertPromises);

    // Count successful inserts
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failedCount = results.filter(r => r.status === 'rejected').length;

    // Log errors in development
    if (process.env.NODE_ENV === 'development' && failedCount > 0) {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Failed to track event ${validEvents[index].event_name}:`, result.reason);
        }
      });
    }

    // Return success even if some events failed (best effort)
    return res.status(200).json({
      success: true,
      tracked: successCount,
      failed: failedCount,
    });

  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}