import { createClient } from '@supabase/supabase-js';

// Service for handling waitlist operations
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface WaitlistSubmission {
  email: string;
  display_name: string;
  city_region: string;
  role?: string;
  share_channels?: string[];
  learn_channels?: string[];
  spend_bracket?: string;
  uses?: string[];
  buy_frequency?: string;
  share_frequency?: string;
  termsAccepted?: boolean;
  invite_code?: string;
  referral_code?: string;
  // Legacy fields for backward compatibility
  handicap_range?: string;
  rounds_per_month?: string;
}

export async function submitWaitlistApplication(data: WaitlistSubmission) {
  console.log('[Waitlist] Processing submission');
  
  // Calculate score based on role and other factors
  let score = 0;
  
  // Role scoring (updated for new form values)
  switch (data.role) {
    case 'golfer':
      score += 30;
      break;
    case 'fitter_builder':
      score += 40;
      break;
    case 'creator':
      score += 35;
      break;
    case 'league_captain':
      score += 35;
      break;
    case 'retailer_other':
      score += 25;
      break;
    default:
      score += 20;
  }
  
  // Spend bracket scoring
  switch (data.spend_bracket) {
    case '5000_plus':
      score += 30;
      break;
    case '3000_5000':
      score += 25;
      break;
    case '1500_3000':
      score += 20;
      break;
    case '750_1500':
      score += 15;
      break;
    case '300_750':
      score += 10;
      break;
    case '<300':
      score += 5;
      break;
    default:
      score += 5;
  }
  
  // Buy frequency scoring
  switch (data.buy_frequency) {
    case 'weekly_plus':
      score += 25;
      break;
    case 'monthly':
      score += 20;
      break;
    case 'few_per_year':
      score += 15;
      break;
    case 'yearly_1_2':
      score += 10;
      break;
    case 'never':
      score += 5;
      break;
    default:
      score += 5;
  }
  
  // Share frequency scoring  
  switch (data.share_frequency) {
    case 'daily':
      score += 15;
      break;
    case 'weekly':
      score += 12;
      break;
    case 'monthly':
      score += 8;
      break;
    case 'rarely':
      score += 5;
      break;
    default:
      score += 3;
  }
  
  // Bonus for having both share and learn channels
  if (data.share_channels && data.share_channels.length > 0) {
    score += 5;
  }
  if (data.learn_channels && data.learn_channels.length > 0) {
    score += 5;
  }
  
  // Bonus for invite code (instant approval)
  if (data.invite_code) {
    score = 100; // Guaranteed approval
  }
  
  try {
    // SIMPLE DIRECT INSERT - NO FANCY RPC FUNCTIONS
    const { data: submission, error: submitError } = await supabase
      .from('waitlist_applications')
      .insert({
        email: data.email.toLowerCase(),
        display_name: data.display_name,
        city_region: data.city_region,
        answers: {
          role: data.role || 'golfer',
          share_channels: data.share_channels || [],
          learn_channels: data.learn_channels || [],
          spend_bracket: data.spend_bracket,
          uses: data.uses || [],
          buy_frequency: data.buy_frequency,
          share_frequency: data.share_frequency,
          termsAccepted: data.termsAccepted,
          invite_code: data.invite_code,
          referral_code: data.referral_code,
          handicap_range: data.handicap_range,
          rounds_per_month: data.rounds_per_month
        },
        score: score,
        status: 'pending',
        invite_code: data.invite_code || null,
        referral_code: data.referral_code || null
      })
      .select()
      .single();
    
    if (submitError) {
      console.error('[Waitlist] Submit error:', submitError);
      
      // Check if they already applied
      if (submitError.code === '23505' || submitError.message?.includes('duplicate')) {
        const { data: existing } = await supabase
          .from('waitlist_applications')
          .select('*')
          .eq('email', data.email.toLowerCase())
          .single();
        
        if (existing) {
          return {
            status: existing.status === 'approved' ? 'approved' : 'pending',
            score: existing.score,
            message: 'You have already applied for beta access.'
          };
        }
      }
      
      throw submitError;
    }
    
    console.log('[Waitlist] Application submitted successfully');
    
    // Check beta capacity
    const { count: betaCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('beta_access', true);
    
    const spotsRemaining = 150 - (betaCount || 0);
    
    // For high scores or invite codes, auto-approve if capacity
    if (score >= 85 && spotsRemaining > 0) {
      // Update to approved
      await supabase
        .from('waitlist_applications')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', submission.id);
      
      return {
        status: 'approved',
        score,
        spotsRemaining,
        message: 'Congratulations! You have been approved for beta access.'
      };
    }
    
    return {
      status: spotsRemaining > 0 ? 'pending' : 'at_capacity',
      score,
      spotsRemaining,
      message: spotsRemaining > 0 
        ? `Thank you for your interest! You're on the waitlist. Score: ${score}/100`
        : 'We\'re at capacity! You\'re on the waitlist and will be notified when spots open.'
    };
    
  } catch (error: any) {
    console.error('[Waitlist] Error:', error);
    
    // Return a user-friendly error
    return {
      status: 'error' as const,
      message: error.message || 'An error occurred while processing your application. Please try again.'
    };
  }
}

// Check if we're in development mode
export const isDevelopment = () => {
  return import.meta.env.DEV || window.location.hostname === 'localhost';
};