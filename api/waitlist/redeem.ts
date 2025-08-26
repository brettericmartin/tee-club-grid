import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthenticatedRequest } from '../../lib/middleware/auth';
import { sanitizeDisplayName } from '../../src/utils/sanitization';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RedeemRequest {
  code: string;
  email?: string;
  displayName?: string;
}

interface RedeemResponse {
  ok: boolean;
  status?: 'approved' | 'already_approved';
  message?: string;
  error?: string;
  inviteCodeOwner?: string;
}

async function redeemHandler(
  req: AuthenticatedRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      ok: false,
      error: 'Method not allowed' 
    });
  }

  try {
    const body = req.body as RedeemRequest;
    const userId = req.userId;
    
    // Validate request
    if (!body.code) {
      return res.status(400).json({ 
        ok: false,
        error: 'Invite code is required' 
      } as RedeemResponse);
    }
    
    // Clean the code (remove spaces, uppercase)
    const cleanCode = body.code.trim().toUpperCase();
    
    console.log(`[Redeem] User ${userId} attempting to redeem code: ${cleanCode}`);
    
    // Sanitize display name if provided
    const sanitizedDisplayName = body.displayName ? 
      sanitizeDisplayName(body.displayName) : 
      (body.email ? sanitizeDisplayName(body.email.split('@')[0]) : null);
    
    // Use the atomic redemption function
    const { data: result, error: redeemError } = await supabase
      .rpc('redeem_invite_code_atomic', {
        p_code: cleanCode,
        p_user_id: userId,
        p_email: body.email || null,
        p_display_name: sanitizedDisplayName
      });
    
    if (redeemError) {
      console.error('[Redeem] Error calling redemption function:', redeemError);
      
      // Handle specific database errors
      if (redeemError.message?.includes('at_capacity')) {
        return res.status(409).json({ 
          ok: false,
          error: 'at_capacity',
          message: 'Beta is currently at capacity. Please try again later.' 
        } as RedeemResponse);
      }
      
      return res.status(500).json({ 
        ok: false,
        error: 'redemption_failed',
        message: redeemError.message || 'Failed to redeem invite code' 
      } as RedeemResponse);
    }
    
    // Check the result from the function
    if (!result?.ok) {
      // Handle different error cases
      if (result?.error === 'invalid_code') {
        return res.status(400).json({ 
          ok: false,
          error: 'invalid_code',
          message: result.message || 'Invalid or expired invite code' 
        } as RedeemResponse);
      }
      
      if (result?.error === 'code_exhausted') {
        return res.status(400).json({ 
          ok: false,
          error: 'code_exhausted',
          message: result.message || 'This invite code has already been used' 
        } as RedeemResponse);
      }
      
      if (result?.error === 'at_capacity') {
        return res.status(409).json({ 
          ok: false,
          error: 'at_capacity',
          message: result.message || 'Beta is at capacity' 
        } as RedeemResponse);
      }
      
      // Generic error
      return res.status(400).json({ 
        ok: false,
        error: result?.error || 'redemption_failed',
        message: result?.message || 'Failed to redeem invite code' 
      } as RedeemResponse);
    }
    
    // Success cases
    if (result.status === 'already_approved') {
      // User already has beta access (idempotent)
      console.log(`[Redeem] User ${userId} already has beta access`);
      return res.status(200).json({ 
        ok: true,
        status: 'already_approved',
        message: result.message || 'You already have beta access'
      } as RedeemResponse);
    }
    
    // Successfully redeemed
    console.log(`[Redeem] User ${userId} successfully redeemed code: ${cleanCode}`);
    
    // Track analytics event
    try {
      // You could track this event if needed
      // trackEvent('invite_redeemed', { code: cleanCode, userId });
    } catch (err) {
      console.error('[Redeem] Error tracking analytics:', err);
    }
    
    return res.status(200).json({ 
      ok: true,
      status: 'approved',
      message: result.message || 'Invite code redeemed successfully! Welcome to Teed.club beta.',
      inviteCodeOwner: result.inviteCodeOwner
    } as RedeemResponse);
    
  } catch (error) {
    console.error('[Redeem] Unexpected error:', error);
    return res.status(500).json({
      ok: false,
      error: 'server_error',
      message: 'An unexpected error occurred'
    } as RedeemResponse);
  }
}

// Export the handler wrapped with authentication
export default withAuth(redeemHandler);

// Also export a validation endpoint (doesn't require auth)
export async function validateInviteCode(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { code } = req.body as { code?: string };
  
  if (!code) {
    return res.status(400).json({ 
      valid: false,
      error: 'Code is required' 
    });
  }
  
  const cleanCode = code.trim().toUpperCase();
  
  try {
    const { data, error } = await supabase
      .rpc('validate_invite_code', { p_code: cleanCode });
    
    if (error) {
      return res.status(500).json({ 
        valid: false,
        error: 'validation_error' 
      });
    }
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('[Validate] Error:', error);
    return res.status(500).json({ 
      valid: false,
      error: 'server_error' 
    });
  }
}