import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthenticatedRequest } from '../../lib/middleware/auth';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface IssueRequest {
  note?: string;
  max_uses?: number;
}

interface IssueResponse {
  code?: string;
  created_by?: string;
  note?: string | null;
  max_uses?: number;
  uses?: number;
  active?: boolean;
  expires_at?: string | null;
  created_at?: string;
  error?: string;
}

// Generate a unique invite code
function generateInviteCode(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function issueHandler(
  req: AuthenticatedRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as IssueRequest;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      } as IssueResponse);
    }
    
    console.log(`[IssueInvite] User ${userId} requesting new invite code`);
    
    // Get user's profile to check quota
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('invite_quota, invites_used, display_name, username')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile) {
      console.error('[IssueInvite] Error fetching profile:', profileError);
      return res.status(500).json({ 
        error: 'Failed to fetch user profile' 
      } as IssueResponse);
    }
    
    // Check if user has invites remaining
    const inviteQuota = profile.invite_quota || 3;
    const invitesUsed = profile.invites_used || 0;
    
    if (invitesUsed >= inviteQuota) {
      console.log(`[IssueInvite] User ${userId} has no invites remaining (${invitesUsed}/${inviteQuota})`);
      return res.status(400).json({ 
        error: 'No invites remaining. Refer more users to earn bonus invites!' 
      } as IssueResponse);
    }
    
    // Generate a unique code
    let code = generateInviteCode();
    let attempts = 0;
    const maxAttempts = 10;
    
    // Ensure code is unique
    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('invite_codes')
        .select('code')
        .eq('code', code)
        .single();
      
      if (!existing) {
        break;
      }
      
      code = generateInviteCode();
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.error('[IssueInvite] Failed to generate unique code after', maxAttempts, 'attempts');
      return res.status(500).json({ 
        error: 'Failed to generate unique invite code' 
      } as IssueResponse);
    }
    
    // Calculate expiration (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Create the invite code
    const inviteData = {
      code,
      created_by: userId,
      note: body.note || `Invite from ${profile.display_name || profile.username || 'a member'}`,
      max_uses: body.max_uses || 1,
      uses: 0,
      active: true,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    };
    
    const { data: newInvite, error: insertError } = await supabase
      .from('invite_codes')
      .insert(inviteData)
      .select()
      .single();
    
    if (insertError) {
      console.error('[IssueInvite] Error creating invite code:', insertError);
      return res.status(500).json({ 
        error: 'Failed to create invite code' 
      } as IssueResponse);
    }
    
    // Update user's invites_used count
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        invites_used: invitesUsed + 1 
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('[IssueInvite] Error updating invites_used:', updateError);
      // Don't fail the request, code was created successfully
    }
    
    console.log(`[IssueInvite] Successfully created invite code ${code} for user ${userId}`);
    
    // Return the new invite code
    return res.status(200).json(newInvite as IssueResponse);
    
  } catch (error) {
    console.error('[IssueInvite] Unexpected error:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred'
    } as IssueResponse);
  }
}

// Export the handler wrapped with authentication
export default withAuth(issueHandler);