import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthenticatedRequest } from '../../lib/middleware/auth';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface InviteCode {
  code: string;
  created_by: string;
  note: string | null;
  max_uses: number;
  uses: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface ReferredUser {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  joined_at: string;
}

interface InviteStats {
  totalInvites: number;
  successfulInvites: number;
  pendingInvites: number;
  successRate: number;
  bonusInvitesEarned: number;
}

interface ListResponse {
  codes?: InviteCode[];
  referredUsers?: ReferredUser[];
  stats?: InviteStats;
  inviteQuota?: number;
  invitesUsed?: number;
  error?: string;
}

async function listHandler(
  req: AuthenticatedRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      } as ListResponse);
    }
    
    console.log(`[ListInvites] Fetching invites for user ${userId}`);
    
    // Get user's profile for quota info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('invite_quota, invites_used, referrals_count')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('[ListInvites] Error fetching profile:', profileError);
      return res.status(500).json({ 
        error: 'Failed to fetch user profile' 
      } as ListResponse);
    }
    
    // Fetch user's invite codes
    const { data: codes, error: codesError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });
    
    if (codesError) {
      console.error('[ListInvites] Error fetching invite codes:', codesError);
      return res.status(500).json({ 
        error: 'Failed to fetch invite codes' 
      } as ListResponse);
    }
    
    // Fetch referred users through referral_chains
    let referredUsers: ReferredUser[] = [];
    const { data: referralChains, error: chainsError } = await supabase
      .from('referral_chains')
      .select(`
        created_at,
        referred:referred_profile_id (
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .eq('referrer_profile_id', userId)
      .order('created_at', { ascending: false });
    
    if (!chainsError && referralChains) {
      referredUsers = referralChains
        .filter(chain => chain.referred)
        .map(chain => ({
          id: chain.referred.id,
          display_name: chain.referred.display_name,
          username: chain.referred.username,
          avatar_url: chain.referred.avatar_url,
          joined_at: chain.created_at
        }));
    }
    
    // Calculate statistics
    const totalInvites = codes?.length || 0;
    const successfulInvites = codes?.reduce((sum, code) => sum + code.uses, 0) || 0;
    const activeInvites = codes?.filter(c => c.active && (!c.expires_at || new Date(c.expires_at) > new Date())).length || 0;
    const pendingInvites = activeInvites;
    const successRate = totalInvites > 0 ? Math.round((successfulInvites / totalInvites) * 100) : 0;
    
    // Calculate bonus invites earned (1 bonus per 3 successful referrals)
    const referralsCount = profile?.referrals_count || 0;
    const bonusInvitesEarned = Math.floor(referralsCount / 3);
    
    const stats: InviteStats = {
      totalInvites,
      successfulInvites,
      pendingInvites,
      successRate,
      bonusInvitesEarned
    };
    
    // Filter codes to only show non-expired ones
    const validCodes = codes?.filter(code => {
      if (!code.expires_at) return true;
      return new Date(code.expires_at) > new Date();
    }) || [];
    
    const response: ListResponse = {
      codes: validCodes,
      referredUsers,
      stats,
      inviteQuota: profile?.invite_quota || 3,
      invitesUsed: profile?.invites_used || 0
    };
    
    console.log(`[ListInvites] Returning ${validCodes.length} codes and ${referredUsers.length} referred users`);
    
    // Set cache headers for 30 seconds
    res.setHeader('Cache-Control', 'private, max-age=30');
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('[ListInvites] Unexpected error:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred'
    } as ListResponse);
  }
}

// Export the handler wrapped with authentication
export default withAuth(listHandler);