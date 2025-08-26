import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthenticatedRequest } from '../../lib/middleware/auth';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RedeemRequest {
  code: string;
}

interface RedeemResponse {
  ok: boolean;
  message?: string;
  error?: string;
}

async function redeemHandler(
  req: AuthenticatedRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as RedeemRequest;
    const userId = req.userId;
    
    // Validate request
    if (!body.code) {
      return res.status(400).json({ 
        ok: false,
        error: 'Missing invite code' 
      } as RedeemResponse);
    }
    
    if (!userId) {
      return res.status(401).json({ 
        ok: false,
        error: 'Authentication required' 
      } as RedeemResponse);
    }
    
    // Sanitize code (remove spaces, convert to uppercase)
    const code = body.code.trim().toUpperCase();
    
    console.log(`[Redeem] User ${userId} attempting to redeem code: ${code}`);
    
    // Start a transaction by using Supabase RPC for atomic operations
    // First, let's check if the code exists and is valid
    const { data: inviteCode, error: fetchError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', code)
      .single();
    
    if (fetchError || !inviteCode) {
      console.log(`[Redeem] Invalid code: ${code}`);
      return res.status(400).json({ 
        ok: false,
        error: 'Invalid invite code' 
      } as RedeemResponse);
    }
    
    // Validate code conditions
    if (!inviteCode.active) {
      return res.status(400).json({ 
        ok: false,
        error: 'This invite code is no longer active' 
      } as RedeemResponse);
    }
    
    if (inviteCode.uses >= inviteCode.max_uses) {
      return res.status(400).json({ 
        ok: false,
        error: 'This invite code has already been used the maximum number of times' 
      } as RedeemResponse);
    }
    
    if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
      return res.status(400).json({ 
        ok: false,
        error: 'This invite code has expired' 
      } as RedeemResponse);
    }
    
    // Check if user already has beta access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('beta_access')
      .eq('id', userId)
      .single();
    
    if (profile?.beta_access) {
      return res.status(400).json({ 
        ok: false,
        error: 'You already have beta access' 
      } as RedeemResponse);
    }
    
    // Perform the redemption in a transaction-like manner
    // Update invite code usage count
    const { error: updateCodeError } = await supabase
      .from('invite_codes')
      .update({ 
        uses: inviteCode.uses + 1,
        // If this was the last use, deactivate the code
        active: inviteCode.uses + 1 < inviteCode.max_uses 
      })
      .eq('code', code)
      .eq('uses', inviteCode.uses); // Optimistic locking - only update if uses hasn't changed
    
    if (updateCodeError) {
      console.error('[Redeem] Error updating invite code:', updateCodeError);
      return res.status(500).json({ 
        ok: false,
        error: 'Failed to redeem invite code. Please try again.' 
      } as RedeemResponse);
    }
    
    // Grant beta access to the user
    const { error: grantAccessError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        beta_access: true,
        invite_quota: 3,
        invites_used: 0
      }, {
        onConflict: 'id'
      });
    
    if (grantAccessError) {
      console.error('[Redeem] Error granting beta access:', grantAccessError);
      
      // Try to rollback the invite code update
      await supabase
        .from('invite_codes')
        .update({ 
          uses: inviteCode.uses,
          active: inviteCode.active
        })
        .eq('code', code);
      
      return res.status(500).json({ 
        ok: false,
        error: 'Failed to grant beta access. Please try again.' 
      } as RedeemResponse);
    }
    
    // Log the successful redemption
    console.log(`[Redeem] User ${userId} successfully redeemed code: ${code}`);
    
    // If the code was created by someone, we could track referrals here
    if (inviteCode.created_by) {
      // Optionally increment the inviter's invites_used count
      await supabase
        .from('profiles')
        .update({ 
          invites_used: supabase.raw('invites_used + 1')
        })
        .eq('id', inviteCode.created_by);
    }
    
    return res.status(200).json({ 
      ok: true,
      message: 'Invite code redeemed successfully! Welcome to Teed.club beta.' 
    } as RedeemResponse);
    
  } catch (error) {
    console.error('[Redeem] Unexpected error:', error);
    return res.status(500).json({
      ok: false,
      error: 'An unexpected error occurred. Please try again.'
    } as RedeemResponse);
  }
}

// Export the handler wrapped with authentication
export default withAuth(redeemHandler);