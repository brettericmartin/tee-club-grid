import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthenticatedRequest } from '../../lib/middleware/auth';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface WaitlistPosition {
  position: number;
  total_waiting: number;
  score: number;
  referral_count: number;
  estimated_days: number;
  wave_cap: number;
  wave_filled_today: number;
  ahead_of_you: number;
  behind_you: number;
  referral_boost: number;
  application_date: string;
  status: 'pending' | 'approved' | 'rejected';
  approval_wave?: number;
  last_movement?: {
    direction: 'up' | 'down' | 'none';
    spots: number;
    timestamp: string;
  };
}

async function meHandler(
  req: AuthenticatedRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.userId;
    const userEmail = req.userEmail;
    
    if (!userId || !userEmail) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }
    
    console.log(`[WaitlistMe] Fetching position for user ${userId}`);
    
    // First check if user has an application
    const { data: application, error: appError } = await supabase
      .from('waitlist_applications')
      .select('*')
      .eq('email', userEmail.toLowerCase())
      .single();
    
    if (appError || !application) {
      // No application found
      return res.status(404).json({ 
        error: 'No waitlist application found',
        message: 'You have not applied to the waitlist yet'
      });
    }
    
    // If already approved or rejected, return status
    if (application.status !== 'pending') {
      return res.status(200).json({
        status: application.status,
        application_date: application.created_at,
        score: application.score,
        message: application.status === 'approved' 
          ? 'Congratulations! You have been approved for beta access.'
          : 'Your application was not approved at this time.'
      });
    }
    
    // Get feature flags for capacity info
    const { data: featureFlags } = await supabase
      .from('feature_flags')
      .select('beta_cap')
      .eq('id', 1)
      .single();
    
    const betaCap = featureFlags?.beta_cap || 150;
    
    // Count total pending applications
    const { count: totalPending } = await supabase
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    // Get applications with higher scores (ahead in queue)
    const { count: aheadCount } = await supabase
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .or(`score.gt.${application.score},and(score.eq.${application.score},created_at.lt.${application.created_at})`);
    
    const position = (aheadCount || 0) + 1;
    const behindCount = (totalPending || 0) - position;
    
    // Count referrals for this user
    let referralCount = 0;
    let referralBoost = 0;
    
    // Check if user has a profile to count referrals
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, referrals_count')
      .eq('id', userId)
      .single();
    
    if (profile) {
      referralCount = profile.referrals_count || 0;
      // Each referral improves position by 5 spots
      referralBoost = referralCount * 5;
    }
    
    // Count approvals today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: approvalsToday } = await supabase
      .from('waitlist_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('approved_at', today.toISOString());
    
    // Calculate estimated wait time
    // Assume 10 approvals per day on average
    const avgApprovalsPerDay = 10;
    const effectivePosition = Math.max(1, position - referralBoost);
    const estimatedDays = Math.ceil(effectivePosition / avgApprovalsPerDay);
    
    // Check for recent movement (in last 24 hours)
    // This would require tracking position history - for now, we'll simulate
    const lastMovement = {
      direction: 'up' as const,
      spots: referralBoost > 0 ? referralBoost : 0,
      timestamp: new Date().toISOString()
    };
    
    const response: WaitlistPosition = {
      position,
      total_waiting: totalPending || 0,
      score: application.score,
      referral_count: referralCount,
      estimated_days: estimatedDays,
      wave_cap: betaCap,
      wave_filled_today: approvalsToday || 0,
      ahead_of_you: aheadCount || 0,
      behind_you: behindCount,
      referral_boost: referralBoost,
      application_date: application.created_at,
      status: application.status,
      last_movement: referralBoost > 0 ? lastMovement : undefined
    };
    
    console.log(`[WaitlistMe] User ${userId} is position ${position} of ${totalPending}`);
    
    // Set cache headers for 30 seconds
    res.setHeader('Cache-Control', 'private, max-age=30, must-revalidate');
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('[WaitlistMe] Unexpected error:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred'
    });
  }
}

// Export the handler wrapped with authentication
export default withAuth(meHandler);