import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthenticatedRequest } from '../../lib/middleware/auth';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RevokeRequest {
  code: string;
}

interface RevokeResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

async function revokeHandler(
  req: AuthenticatedRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as RevokeRequest;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      } as RevokeResponse);
    }
    
    if (!body.code) {
      return res.status(400).json({ 
        error: 'Missing invite code' 
      } as RevokeResponse);
    }
    
    const code = body.code.trim().toUpperCase();
    
    console.log(`[RevokeInvite] User ${userId} attempting to revoke code: ${code}`);
    
    // First check if the code exists and belongs to the user
    const { data: inviteCode, error: fetchError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', code)
      .eq('created_by', userId)
      .single();
    
    if (fetchError || !inviteCode) {
      console.log(`[RevokeInvite] Code ${code} not found or doesn't belong to user ${userId}`);
      return res.status(404).json({ 
        error: 'Invite code not found or you do not have permission to revoke it' 
      } as RevokeResponse);
    }
    
    // Check if code is already inactive
    if (!inviteCode.active) {
      return res.status(400).json({ 
        error: 'This invite code is already inactive' 
      } as RevokeResponse);
    }
    
    // Check if code has been used
    if (inviteCode.uses > 0) {
      console.log(`[RevokeInvite] Warning: Code ${code} has been used ${inviteCode.uses} times`);
    }
    
    // Deactivate the invite code
    const { error: updateError } = await supabase
      .from('invite_codes')
      .update({ 
        active: false 
      })
      .eq('code', code)
      .eq('created_by', userId);
    
    if (updateError) {
      console.error('[RevokeInvite] Error updating invite code:', updateError);
      return res.status(500).json({ 
        error: 'Failed to revoke invite code' 
      } as RevokeResponse);
    }
    
    // If the code was unused, decrement the user's invites_used count
    if (inviteCode.uses === 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('invites_used')
        .eq('id', userId)
        .single();
      
      if (profile && profile.invites_used > 0) {
        await supabase
          .from('profiles')
          .update({ 
            invites_used: profile.invites_used - 1 
          })
          .eq('id', userId);
        
        console.log(`[RevokeInvite] Decremented invites_used for user ${userId}`);
      }
    }
    
    console.log(`[RevokeInvite] Successfully revoked invite code ${code}`);
    
    return res.status(200).json({
      success: true,
      message: inviteCode.uses > 0 
        ? `Invite code revoked (was used ${inviteCode.uses} time${inviteCode.uses > 1 ? 's' : ''})`
        : 'Invite code revoked successfully'
    } as RevokeResponse);
    
  } catch (error) {
    console.error('[RevokeInvite] Unexpected error:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred'
    } as RevokeResponse);
  }
}

// Export the handler wrapped with authentication
export default withAuth(revokeHandler);