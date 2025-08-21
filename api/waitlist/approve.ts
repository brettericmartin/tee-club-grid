import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, type AdminAuthenticatedRequest } from '../../lib/middleware/adminAuth';
import { 
  sendWaitlistApprovedEmail,
  sendInvitePackEmail 
} from '../../src/services/emailService';
import { sanitizeDisplayName } from '../../src/utils/sanitization';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ApproveRequest {
  applicationId?: string;
  email?: string;
  grantInvites?: boolean; // Whether to grant invite quota (default: true)
}

interface ApproveResponse {
  ok: boolean;
  message?: string;
  error?: string;
  profileId?: string;
}

async function approveHandler(
  req: AdminAuthenticatedRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as ApproveRequest;
    const userId = req.userId;
    
    // Admin validation is handled by requireAdmin middleware
    // req.isAdmin is guaranteed to be true at this point
    
    // Validate request - need either applicationId or email
    if (!body.applicationId && !body.email) {
      return res.status(400).json({ 
        ok: false,
        error: 'Either applicationId or email is required' 
      } as ApproveResponse);
    }
    
    // Get email and display name
    let email: string;
    let displayName: string | undefined;
    
    if (body.applicationId) {
      const { data, error } = await supabase
        .from('waitlist_applications')
        .select('email, display_name')
        .eq('id', body.applicationId)
        .single();
      
      if (error || !data) {
        return res.status(404).json({ 
          ok: false,
          error: 'Application not found' 
        } as ApproveResponse);
      }
      email = data.email;
      displayName = sanitizeDisplayName(data.display_name);
    } else {
      email = body.email!.toLowerCase();
      displayName = sanitizeDisplayName(body.email!.split('@')[0]);
    }
    
    // Use the atomic approval function with capacity locking
    const { data: approvalResult, error: approvalError } = await supabase
      .rpc('approve_user_by_email_if_capacity', {
        p_email: email,
        p_display_name: displayName || sanitizeDisplayName(email.split('@')[0]),
        p_grant_invites: body.grantInvites !== false
      });
    
    if (approvalError) {
      console.error('[Approve] Error calling approval function:', approvalError);
      
      // Handle specific error cases
      if (approvalError.message?.includes('at_capacity')) {
        return res.status(409).json({ 
          ok: false,
          error: 'at_capacity',
          message: approvalError.hint || 'Beta is at capacity. Cannot approve more users.' 
        } as ApproveResponse);
      }
      
      return res.status(500).json({ 
        ok: false,
        error: approvalError.message || 'Failed to approve user' 
      } as ApproveResponse);
    }
    
    // Check if the function returned success
    if (!approvalResult?.success) {
      if (approvalResult?.error === 'at_capacity') {
        return res.status(409).json({ 
          ok: false,
          error: 'at_capacity',
          message: approvalResult.message 
        } as ApproveResponse);
      }
      
      return res.status(500).json({ 
        ok: false,
        error: approvalResult?.error || 'Failed to approve user',
        message: approvalResult?.message
      } as ApproveResponse);
    }
    
    // Send emails if invite codes were generated
    if (approvalResult.inviteCodes && approvalResult.inviteCodes.length > 0) {
      sendInvitePackEmail({
        email: email,
        displayName: displayName || sanitizeDisplayName(email.split('@')[0]),
        inviteCodes: approvalResult.inviteCodes
      }).catch(err => console.error('[Approve] Error sending invite pack email:', err));
    }
    
    // Send approval email
    sendWaitlistApprovedEmail({
      email: email,
      displayName: displayName || email.split('@')[0]
    }).catch(err => console.error('[Approve] Error sending approval email:', err));
    
    // Log with hashed email for privacy
    const emailHash = require('crypto').createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 8);
    console.log(`[Approve] Admin ${userId} approved ${emailHash}... for beta access`);
    
    return res.status(200).json({ 
      ok: true,
      message: approvalResult.message || `Successfully approved ${email} for beta access`,
      profileId: approvalResult.profileId
    } as ApproveResponse);
    
  } catch (error) {
    console.error('[Approve] Unexpected error:', error);
    return res.status(500).json({
      ok: false,
      error: 'An unexpected error occurred'
    } as ApproveResponse);
  }
}

// Note: generateInviteCode function has been moved to the database
// The approve_user_by_email_if_capacity function now handles invite code generation internally

// Export the handler wrapped with admin authentication
export default requireAdmin(approveHandler);