import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface BetaSummaryResponse {
  cap: number;
  approved: number;          // Deprecated: use approvedActive instead
  approvedActive: number;    // Active beta users (not soft-deleted)
  approvedTotal: number;     // Total beta users (including soft-deleted)
  remaining: number;
  publicBetaEnabled: boolean;
  waitlistCount?: number;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch feature flags to get beta cap and status
    const { data: featureFlags, error: flagsError } = await supabase
      .from('feature_flags')
      .select('beta_cap, public_beta_enabled')
      .eq('id', 1)
      .single();
    
    if (flagsError) {
      console.error('[BetaSummary] Error fetching feature flags:', flagsError);
      return res.status(500).json({ 
        error: 'Unable to fetch beta configuration' 
      });
    }
    
    const betaCap = featureFlags?.beta_cap || 150;
    const publicBetaEnabled = featureFlags?.public_beta_enabled || false;
    
    // Count ACTIVE approved beta users (not soft-deleted)
    const { count: activeCount, error: activeError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: false })
      .eq('beta_access', true)
      .is('deleted_at', null);
    
    if (activeError) {
      console.error('[BetaSummary] Error counting active approved users:', activeError);
      return res.status(500).json({ 
        error: 'Unable to count active approved users' 
      });
    }
    
    // Count TOTAL approved beta users (including soft-deleted)
    const { count: totalCount, error: totalError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: false })
      .eq('beta_access', true);
    
    if (totalError) {
      console.error('[BetaSummary] Error counting total approved users:', totalError);
      return res.status(500).json({ 
        error: 'Unable to count total approved users' 
      });
    }
    
    const approvedActive = activeCount || 0;
    const approvedTotal = totalCount || 0;
    const remaining = Math.max(0, betaCap - approvedActive);
    
    // Optionally count waitlist size
    const { count: waitlistCount } = await supabase
      .from('waitlist_applications')
      .select('id', { count: 'exact', head: false })
      .eq('status', 'pending');
    
    const response: BetaSummaryResponse = {
      cap: betaCap,
      approved: approvedActive,     // Deprecated field - kept for backward compatibility
      approvedActive,               // Active beta users
      approvedTotal,                // Total beta users (including soft-deleted)
      remaining,
      publicBetaEnabled,
      waitlistCount: waitlistCount || 0
    };
    
    // Set cache headers for 1 minute
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('[BetaSummary] Unexpected error:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred'
    });
  }
}