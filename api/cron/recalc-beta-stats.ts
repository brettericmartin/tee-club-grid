import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RecalcResponse {
  ok: boolean;
  message: string;
  stats?: {
    activeCount: number;
    totalCount: number;
    deletedCount: number;
    cap: number;
    timestamp: string;
  };
  error?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify this is a valid cron request (Vercel adds a special header)
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  
  // In production, verify the request is from Vercel Cron
  if (process.env.NODE_ENV === 'production') {
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.log('[RecalcBetaStats] Unauthorized cron request');
      return res.status(401).json({ 
        ok: false,
        error: 'Unauthorized' 
      });
    }
  }

  // Only allow GET/POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ 
      ok: false,
      error: 'Method not allowed' 
    });
  }

  try {
    console.log('[RecalcBetaStats] Starting beta statistics recalculation');
    
    // Get current feature flags
    const { data: featureFlags, error: flagsError } = await supabase
      .from('feature_flags')
      .select('beta_cap')
      .eq('id', 1)
      .single();
    
    if (flagsError) {
      console.error('[RecalcBetaStats] Error fetching feature flags:', flagsError);
      return res.status(500).json({ 
        ok: false,
        error: 'Unable to fetch beta configuration',
        message: flagsError.message
      } as RecalcResponse);
    }
    
    const betaCap = featureFlags?.beta_cap || 150;
    
    // Count ACTIVE approved beta users (not soft-deleted)
    const { count: activeCount, error: activeError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: false })
      .eq('beta_access', true)
      .is('deleted_at', null);
    
    if (activeError) {
      console.error('[RecalcBetaStats] Error counting active users:', activeError);
      return res.status(500).json({ 
        ok: false,
        error: 'Unable to count active users',
        message: activeError.message
      } as RecalcResponse);
    }
    
    // Count TOTAL approved beta users (including soft-deleted)
    const { count: totalCount, error: totalError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: false })
      .eq('beta_access', true);
    
    if (totalError) {
      console.error('[RecalcBetaStats] Error counting total users:', totalError);
      return res.status(500).json({ 
        ok: false,
        error: 'Unable to count total users',
        message: totalError.message
      } as RecalcResponse);
    }
    
    // Count DELETED beta users
    const { count: deletedCount, error: deletedError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: false })
      .eq('beta_access', true)
      .not('deleted_at', 'is', null);
    
    if (deletedError) {
      console.error('[RecalcBetaStats] Error counting deleted users:', deletedError);
      // Non-critical error - continue with 0
    }
    
    const stats = {
      activeCount: activeCount || 0,
      totalCount: totalCount || 0,
      deletedCount: deletedCount || 0,
      cap: betaCap,
      timestamp: new Date().toISOString()
    };
    
    // Log the recalculation event (optional - for audit trail)
    try {
      await supabase
        .from('abuse_metrics')
        .insert({
          metric_type: 'beta_stats_recalc',
          identifier: 'cron',
          endpoint: '/api/cron/recalc-beta-stats',
          metadata: stats
        });
    } catch (logError) {
      // Non-critical - continue even if logging fails
      console.error('[RecalcBetaStats] Failed to log recalc event:', logError);
    }
    
    console.log('[RecalcBetaStats] Recalculation complete:', stats);
    
    // Optionally update a cache table here if needed
    // For now, we're relying on real-time queries in the summary endpoint
    
    const response: RecalcResponse = {
      ok: true,
      message: 'Beta statistics recalculated successfully',
      stats
    };
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('[RecalcBetaStats] Unexpected error:', error);
    return res.status(500).json({
      ok: false,
      error: 'An unexpected error occurred',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as RecalcResponse);
  }
}