import { createClient } from '@supabase/supabase-js';

// Service for handling waitlist operations in development
// This bypasses the Vercel API endpoints that don't work locally

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
  console.log('[Dev Mode] Processing waitlist submission locally');
  
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
    case 'weekly_plus':
      score += 20;
      break;
    case 'monthly':
      score += 15;
      break;
    case 'few_per_year':
      score += 10;
      break;
    case 'yearly_1_2':
      score += 5;
      break;
    default:
      score += 5;
  }
  
  // Bonus for invite code (instant approval)
  if (data.invite_code) {
    score = 100; // Guaranteed approval
  }
  
  // Determine status based on score
  const status = score >= 75 ? 'approved' : 'pending';
  
  try {
    // Check if application already exists
    const { data: existing } = await supabase
      .from('waitlist_applications')
      .select('*')
      .eq('email', data.email.toLowerCase())
      .single();
    
    if (existing) {
      console.log(`Application already exists for ${data.email}`);
      return {
        status: existing.status,
        score: existing.score,
        message: 'You have already applied for beta access.'
      };
    }
    
    // Create waitlist application
    const application: any = {
      email: data.email.toLowerCase(),
      display_name: data.display_name,
      city_region: data.city_region,
      score,
      status,
      answers: {
        role: data.role || 'golfer',
        share_channels: data.share_channels || [],
        learn_channels: data.learn_channels || [],
        spend_bracket: data.spend_bracket,
        uses: data.uses || [],
        buy_frequency: data.buy_frequency,
        share_frequency: data.share_frequency,
        termsAccepted: data.termsAccepted,
        // Store codes in answers until columns are added
        invite_code: data.invite_code,
        referral_code: data.referral_code,
        // Legacy fields for compatibility
        handicap_range: data.handicap_range,
        rounds_per_month: data.rounds_per_month
      },
      approved_at: status === 'approved' ? new Date().toISOString() : null
    };
    
    // DO NOT set referred_by - it expects UUID not text
    // The referral code is stored in answers.referral_code instead
    
    const { data: newApplication, error } = await supabase
      .from('waitlist_applications')
      .insert(application)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating application:', error);
      throw error;
    }
    
    console.log('Application created successfully:', newApplication);
    
    // If auto-approved, grant beta access
    if (status === 'approved') {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', data.email.toLowerCase())
        .single();
      
      if (existingProfile) {
        // Update existing profile
        await supabase
          .from('profiles')
          .update({
            beta_access: true,
            invite_quota: 3,
            referral_code: Math.random().toString(36).substring(2, 10).toUpperCase()
          })
          .eq('id', existingProfile.id);
      } else {
        // Create new profile
        await supabase
          .from('profiles')
          .insert({
            email: data.email.toLowerCase(),
            display_name: data.display_name,
            beta_access: true,
            invite_quota: 3,
            referral_code: Math.random().toString(36).substring(2, 10).toUpperCase()
          });
      }
      
      console.log('Beta access granted!');
    }
    
    // Get current beta stats
    const { count: approvedCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('beta_access', true)
      .is('deleted_at', null);
    
    const { data: featureFlags } = await supabase
      .from('feature_flags')
      .select('beta_cap')
      .single();
    
    const betaCap = featureFlags?.beta_cap || 150;
    const spotsRemaining = Math.max(0, betaCap - (approvedCount || 0));
    
    return {
      status,
      score,
      spotsRemaining,
      message: status === 'approved' 
        ? 'Congratulations! You have been approved for beta access.'
        : `Thank you for your interest! You're on the waitlist. Score: ${score}/100`
    };
    
  } catch (error) {
    console.error('Error submitting application:', error);
    throw error;
  }
}

// Check if we're in development mode
export function isDevelopment() {
  return import.meta.env.DEV;
}
// Deployment trigger: Mon Aug 25 06:41:15 PM MST 2025 - Updated environment variables
