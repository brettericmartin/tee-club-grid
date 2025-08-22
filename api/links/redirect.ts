import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client with service role for server-side operations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Get client IP address
function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' 
    ? forwarded.split(',')[0].trim()
    : req.socket?.remoteAddress || 'unknown';
  return ip;
}

// Hash IP for privacy
function hashIp(ip: string): string | null {
  if (ip === 'unknown') return null;
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests for redirects
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract link ID from query parameters
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid link ID' });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'Invalid link ID format' });
    }

    // Fetch the link from database
    const { data: link, error: linkError } = await supabase
      .from('user_equipment_links')
      .select('*')
      .eq('id', id)
      .single();

    if (linkError || !link) {
      console.error('Link not found:', linkError);
      return res.status(404).json({ error: 'Link not found' });
    }

    // Extract tracking parameters
    const utm_source = (req.query.utm_source as string) || 'teed';
    const utm_medium = (req.query.utm_medium as string) || 'web';
    const utm_campaign = (req.query.utm_campaign as string) || null;
    const referrer = req.headers.referer || req.headers.referrer || null;
    const userAgent = req.headers['user-agent'] || null;
    
    // Get authenticated user if token is provided
    let clickedByUser: string | null = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        clickedByUser = user?.id || null;
      } catch (authError) {
        console.warn('Auth token validation failed:', authError);
        // Continue without user authentication
      }
    }

    // Get client IP and hash it for privacy
    const clientIp = getClientIp(req);
    const ipHash = hashIp(clientIp);

    // Track the click
    const clickData = {
      link_id: link.id,
      clicked_by_user: clickedByUser,
      bag_id: link.bag_id,
      referrer: referrer ? String(referrer).substring(0, 500) : null,
      utm_source: utm_source ? String(utm_source).substring(0, 100) : null,
      utm_medium: utm_medium ? String(utm_medium).substring(0, 100) : null,
      utm_campaign: utm_campaign ? String(utm_campaign).substring(0, 100) : null,
      ip_hash: ipHash,
      user_agent: userAgent ? String(userAgent).substring(0, 500) : null
    };

    // Insert click tracking data (fire and forget)
    supabase
      .from('link_clicks')
      .insert(clickData)
      .then(({ error: clickError }) => {
        if (clickError) {
          console.error('Failed to track click:', clickError);
        }
      })
      .catch(err => {
        console.error('Click tracking error:', err);
      });

    // Validate destination URL
    let destinationUrl: string;
    try {
      const url = new URL(link.url);
      // Ensure it's a valid HTTP(S) URL
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
      destinationUrl = link.url;
    } catch (urlError) {
      console.error('Invalid destination URL:', link.url, urlError);
      return res.status(500).json({ error: 'Invalid destination URL' });
    }

    // Set cache headers to prevent caching of redirects
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Perform the redirect
    res.setHeader('Location', destinationUrl);
    return res.status(302).end();

  } catch (error) {
    console.error('[Links API] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}