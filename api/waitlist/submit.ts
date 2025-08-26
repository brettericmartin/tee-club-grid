import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { 
  validateWaitlistSubmission, 
  scoreApplication, 
  shouldAutoApprove, 
  type WaitlistAnswers 
} from '../../src/lib/waitlist';
import { 
  sendWaitlistPendingEmail, 
  sendWaitlistApprovedEmail,
  sendInvitePackEmail 
} from '../../src/services/emailService';
import { sanitizeDisplayName } from '../../src/utils/sanitization';
import { checkRateLimit } from '../../lib/middleware/rateLimit';
import { RateLimiter, getClientIp } from '../../src/services/rateLimiter';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface WaitlistSubmitRequest extends WaitlistAnswers {
  // WaitlistAnswers already includes all needed fields
}

interface WaitlistSubmitResponse {
  status: 'approved' | 'pending' | 'at_capacity' | 'error';
  score?: number;
  spotsRemaining?: number;
  message?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Apply rate limiting
  const rateLimitOk = await checkRateLimit(req, res, {
    burst: 30,
    perMinute: 10,
    endpoint: '/api/waitlist/submit'
  });
  
  if (!rateLimitOk) {
    return res.status(429).json({ 
      error: 'Too Many Requests',
      message: 'Please wait before submitting again'
    });
  }
  
  // Check if user is authenticated (optional - for email confirmation check)
  let authenticatedUser = null;
  let emailConfirmed = false;
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        authenticatedUser = user;
        // Check if email is confirmed
        emailConfirmed = !!user.email_confirmed_at;
        // Log with hashed email for privacy
        const emailHash = user.email ? 
          require('crypto').createHash('sha256').update(user.email.toLowerCase()).digest('hex').substring(0, 8) : 
          'unknown';
        console.log(`[Waitlist] Authenticated user: ${emailHash}..., Email confirmed: ${emailConfirmed}`);
      }
    } catch (error) {
      console.log('[Waitlist] Auth check failed:', error);
      // Continue without auth - not required for waitlist submission
    }
  }

  try {
    // Validate request body using Zod schema
    const validation = validateWaitlistSubmission(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Invalid submission data',
        errors: validation.errors 
      });
    }
    
    const body = validation.data;
    
    // Check honeypot field
    let honeypotTriggered = false;
    if (body.contact_phone && body.contact_phone.trim() !== '') {
      honeypotTriggered = true;
      
      // Log honeypot trigger for monitoring
      const clientIp = getClientIp(req.headers as Record<string, string | string[] | undefined>);
      const rateLimiter = new RateLimiter(
        process.env.VITE_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_KEY || ''
      );
      await rateLimiter.logAbuseMetric('honeypot_triggered', clientIp, '/api/waitlist/submit', {
        field_value_length: body.contact_phone.length
      });
      
      console.log(`[Waitlist] Honeypot triggered from IP: ${clientIp}`);
    }
    
    // Sanitize display name
    const sanitizedDisplayName = sanitizeDisplayName(body.display_name);
    
    // Check if terms were accepted
    if (!body.termsAccepted) {
      return res.status(400).json({ 
        error: 'Terms not accepted',
        message: 'You must accept the terms to join the waitlist' 
      });
    }
    
    // Calculate application score
    const scoreResult = scoreApplication(body);
    const score = scoreResult.cappedTotal;
    // Log with hashed email for privacy
    const emailHashLog = require('crypto').createHash('sha256').update(body.email.toLowerCase()).digest('hex').substring(0, 8);
    console.log(`[Waitlist] Application from ${emailHashLog}... scored: ${score}`);
    
    // Get current beta capacity and approved count
    const [featureFlagsResult, approvedCountResult] = await Promise.all([
      supabase
        .from('feature_flags')
        .select('beta_cap, public_beta_enabled')
        .eq('id', 1)
        .single(),
      supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('beta_access', true)
    ]);
    
    if (featureFlagsResult.error) {
      console.error('Error fetching feature flags:', featureFlagsResult.error);
      return res.status(500).json({ 
        error: 'Configuration error',
        message: 'Unable to fetch beta configuration' 
      });
    }
    
    const betaCap = featureFlagsResult.data?.beta_cap || 150;
    const publicBetaEnabled = featureFlagsResult.data?.public_beta_enabled || false;
    const currentApproved = approvedCountResult.count || 0;
    const spotsRemaining = Math.max(0, betaCap - currentApproved);
    
    console.log(`[Waitlist] Capacity: ${currentApproved}/${betaCap}, Spots remaining: ${spotsRemaining}`);
    
    // If public beta is enabled, auto-approve everyone
    if (publicBetaEnabled) {
      // Create or update profile with beta access
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          email: body.email.toLowerCase(),
          display_name: sanitizedDisplayName || sanitizeDisplayName(body.email.split('@')[0]),
          beta_access: true,
          invite_quota: 3,
          invites_used: 0
        }, {
          onConflict: 'email'
        });
      
      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
      
      return res.status(200).json({
        status: 'approved',
        score,
        spotsRemaining,
        message: 'Welcome to Teed.club! Public beta is now open.'
      } as WaitlistSubmitResponse);
    }
    
    // Check if invite code was provided
    if (body.invite_code) {
      // Validate invite code
      const { data: inviteCode, error: inviteError } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', body.invite_code)
        .eq('active', true)
        .single();
      
      if (!inviteError && inviteCode && inviteCode.uses < inviteCode.max_uses) {
        // Valid invite code - auto-approve
        const { error: updateError } = await supabase
          .from('invite_codes')
          .update({ uses: inviteCode.uses + 1 })
          .eq('code', body.invite_code);
        
        if (!updateError) {
          // Create or update profile with beta access
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              email: body.email.toLowerCase(),
              display_name: sanitizedDisplayName || sanitizeDisplayName(body.email.split('@')[0]),
              beta_access: true,
              invite_quota: 3,
              invites_used: 0
            }, {
              onConflict: 'email'
            });
          
          if (!profileError) {
            return res.status(200).json({
              status: 'approved',
              score,
              spotsRemaining: spotsRemaining - 1,
              message: 'Invite code accepted! Welcome to Teed.club beta.'
            } as WaitlistSubmitResponse);
          }
        }
      }
    }
    
    // Check auto-approval eligibility using the database function
    const { data: eligibility, error: eligibilityError } = await supabase
      .rpc('check_auto_approval_eligibility', { p_score: score });
    
    if (eligibilityError) {
      console.error('[Waitlist] Error checking eligibility:', eligibilityError);
    }
    
    // Determine if we should auto-approve
    // Only auto-approve if:
    // 1. Score qualifies for auto-approval
    // 2. User is either not authenticated OR has confirmed email
    // 3. Honeypot was not triggered
    const canAutoApprove = eligibility?.eligible && 
                          shouldAutoApprove(score, currentApproved, betaCap) &&
                          (!authenticatedUser || emailConfirmed) &&
                          !honeypotTriggered;
    
    if (canAutoApprove) {
      // Use the atomic approval function with email-based approach
      const { data: approvalResult, error: approvalError } = await supabase
        .rpc('approve_user_by_email_if_capacity', {
          p_email: body.email.toLowerCase(),
          p_display_name: sanitizedDisplayName || sanitizeDisplayName(body.email.split('@')[0]),
          p_grant_invites: true
        });
      
      if (approvalError) {
        console.error('[Waitlist] Auto-approval error:', approvalError);
        
        // Check if it's a capacity error
        if (approvalError.message?.includes('at_capacity')) {
          // Capacity filled - fall through to pending status
          console.log('[Waitlist] Capacity filled during auto-approval');
        } else {
          // Other error - still save to waitlist as pending
          await supabase
            .from('waitlist_applications')
            .upsert({
              email: body.email.toLowerCase(),
              display_name: sanitizedDisplayName,
              city_region: body.city_region,
              answers: body,
              score,
              status: 'pending'
            }, {
              onConflict: 'email'
            });
          
          // Check if pending due to unconfirmed email
          const pendingMessage = authenticatedUser && !emailConfirmed
            ? 'Please verify your email to complete your application. Check your inbox for a confirmation link.'
            : 'Application received. You\'ll be notified when approved.';
          
          return res.status(200).json({
            status: 'pending',
            score,
            spotsRemaining,
            message: pendingMessage
          } as WaitlistSubmitResponse);
        }
      } else if (approvalResult?.success) {
        // Successfully approved - save to waitlist with approved status
        await supabase
          .from('waitlist_applications')
          .upsert({
            email: body.email.toLowerCase(),
            display_name: sanitizedDisplayName,
            city_region: body.city_region,
            answers: body,
            score,
            status: 'approved',
            approved_at: new Date().toISOString()
          }, {
            onConflict: 'email'
          });
        
        // Send approval email  
        sendWaitlistApprovedEmail({
          email: body.email.toLowerCase(),
          displayName: sanitizedDisplayName || sanitizeDisplayName(body.email.split('@')[0]),
          score
        }).catch(err => console.error('[Waitlist] Error sending approval email:', err));
        
        // Send invite pack email if codes were generated
        if (approvalResult.inviteCodes && approvalResult.inviteCodes.length > 0) {
          sendInvitePackEmail({
            email: body.email.toLowerCase(),
            displayName: sanitizedDisplayName || sanitizeDisplayName(body.email.split('@')[0]),
            inviteCodes: approvalResult.inviteCodes
          }).catch(err => console.error('[Waitlist] Error sending invite pack email:', err));
        }

        return res.status(200).json({
          status: 'approved',
          score,
          spotsRemaining: spotsRemaining - 1,
          message: 'Congratulations! You\'ve been approved for Teed.club beta access.'
        } as WaitlistSubmitResponse);
      }
    } else if (currentApproved >= betaCap) {
      // At capacity - add to waitlist
      await supabase
        .from('waitlist_applications')
        .upsert({
          email: body.email.toLowerCase(),
          display_name: sanitizedDisplayName,
          city_region: body.city_region,
          answers: body,
          score,
          status: 'pending'
        }, {
          onConflict: 'email'
        });
      
      return res.status(200).json({
        status: 'at_capacity',
        score,
        spotsRemaining: 0,
        message: 'Beta is currently at capacity. You\'ve been added to the waitlist.'
      } as WaitlistSubmitResponse);
    } else {
      // Score too low - add to waitlist as pending
      await supabase
        .from('waitlist_applications')
        .upsert({
          email: body.email.toLowerCase(),
          display_name: sanitizedDisplayName,
          city_region: body.city_region,
          answers: body,
          score,
          status: 'pending'
        }, {
          onConflict: 'email'
        });
      
      // Send pending email
      sendWaitlistPendingEmail({
        email: body.email.toLowerCase(),
        displayName: sanitizedDisplayName || sanitizeDisplayName(body.email.split('@')[0]),
        score
      }).catch(err => console.error('[Waitlist] Error sending pending email:', err));

      // Add different message if email confirmation is needed
      const pendingMessage = authenticatedUser && !emailConfirmed 
        ? 'Please verify your email to complete your application. Check your inbox for a confirmation link.'
        : 'Thank you for your interest! You\'ve been added to the waitlist.';
      
      return res.status(200).json({
        status: 'pending',
        score,
        spotsRemaining,
        message: pendingMessage
      } as WaitlistSubmitResponse);
    }
    
  } catch (error) {
    console.error('Waitlist submission error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred processing your application'
    } as WaitlistSubmitResponse);
  }
}