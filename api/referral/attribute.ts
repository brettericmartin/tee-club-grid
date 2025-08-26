import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthenticatedRequest } from '../../lib/middleware/auth';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AttributeRequest {
  referral_code: string;
}

interface AttributeResponse {
  success: boolean;
  referrer?: {
    id: string;
    display_name: string | null;
    username: string | null;
  };
  message: string;
  bonus_granted?: boolean;
}

async function attributeHandler(
  req: AuthenticatedRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as AttributeRequest;
    const userId = req.userId;
    
    // Validate request
    if (!body.referral_code) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing referral code' 
      } as AttributeResponse);
    }
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      } as AttributeResponse);
    }
    
    // Clean the referral code
    const referralCode = body.referral_code.trim().toUpperCase();
    
    console.log(`[Attribution] User ${userId} attempting to attribute referral code: ${referralCode}`);
    
    // Check if user already has a referrer
    const { data: existingChain, error: chainError } = await supabase
      .from('referral_chains')
      .select('id')
      .eq('referred_profile_id', userId)
      .single();
    
    if (existingChain) {
      console.log(`[Attribution] User ${userId} already has a referrer`);
      return res.status(400).json({ 
        success: false,
        message: 'You have already been referred by someone' 
      } as AttributeResponse);
    }
    
    // Find the referrer by their referral code
    const { data: referrer, error: referrerError } = await supabase
      .from('profiles')
      .select('id, display_name, username, email, referrals_count, invite_quota')
      .eq('referral_code', referralCode)
      .single();
    
    if (referrerError || !referrer) {
      console.log(`[Attribution] Invalid referral code: ${referralCode}`);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid referral code' 
      } as AttributeResponse);
    }
    
    // Prevent self-referral
    if (referrer.id === userId) {
      return res.status(400).json({ 
        success: false,
        message: 'You cannot refer yourself' 
      } as AttributeResponse);
    }
    
    // Get the referred user's profile for logging
    const { data: referredProfile } = await supabase
      .from('profiles')
      .select('display_name, username, email')
      .eq('id', userId)
      .single();
    
    // Start attribution transaction
    try {
      // 1. Create referral chain entry
      const { error: insertError } = await supabase
        .from('referral_chains')
        .insert({
          referrer_profile_id: referrer.id,
          referred_profile_id: userId,
          referral_code: referralCode,
          attribution_type: 'signup'
        });
      
      if (insertError) {
        throw insertError;
      }
      
      // 2. Update referrer's stats
      const newReferralsCount = (referrer.referrals_count || 0) + 1;
      const shouldGrantBonus = newReferralsCount % 3 === 0; // Bonus every 3 referrals
      
      const updateData: any = {
        referrals_count: newReferralsCount,
        invites_used: Math.min(
          (referrer.invites_used || 0) + 1,
          referrer.invite_quota || 3
        )
      };
      
      // Grant bonus invite every 3 successful referrals
      if (shouldGrantBonus) {
        updateData.invite_quota = (referrer.invite_quota || 3) + 1;
      }
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', referrer.id);
      
      if (updateError) {
        throw updateError;
      }
      
      console.log(`[Attribution] Successfully attributed ${referredProfile?.display_name || userId} to ${referrer.display_name || referrer.username}`);
      
      // Return success with referrer info
      return res.status(200).json({ 
        success: true,
        referrer: {
          id: referrer.id,
          display_name: referrer.display_name,
          username: referrer.username
        },
        message: `You were referred by ${referrer.display_name || referrer.username || 'a member'}!`,
        bonus_granted: shouldGrantBonus
      } as AttributeResponse);
      
    } catch (txError) {
      console.error('[Attribution] Transaction error:', txError);
      
      // Try to clean up if something went wrong
      await supabase
        .from('referral_chains')
        .delete()
        .eq('referred_profile_id', userId);
      
      return res.status(500).json({ 
        success: false,
        message: 'Failed to complete referral attribution' 
      } as AttributeResponse);
    }
    
  } catch (error) {
    console.error('[Attribution] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    } as AttributeResponse);
  }
}

// Export the handler wrapped with authentication
export default withAuth(attributeHandler);