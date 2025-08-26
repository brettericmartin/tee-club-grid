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
  role: string;
  handicap_range?: string;
  rounds_per_month?: string;
  invite_code?: string;
  referral_code?: string;
}

export async function submitWaitlistApplication(data: WaitlistSubmission) {
  console.log('[Dev Mode] Processing waitlist submission locally');
  
  // Calculate score based on role and other factors
  let score = 0;
  
  // Role scoring
  switch (data.role) {
    case 'pro':
    case 'instructor':
      score += 40;
      break;
    case 'low_handicap':
      score += 35;
      break;
    case 'enthusiast':
      score += 25;
      break;
    case 'beginner':
      score += 15;
      break;
    default:
      score += 20;
  }
  
  // Handicap scoring
  switch (data.handicap_range) {
    case 'scratch':
    case '1-5':
      score += 25;
      break;
    case '6-10':
      score += 20;
      break;
    case '11-15':
      score += 15;
      break;
    case '16-20':
      score += 10;
      break;
    default:
      score += 5;
  }
  
  // Frequency scoring
  switch (data.rounds_per_month) {
    case '20+':
      score += 25;
      break;
    case '10-20':
      score += 20;
      break;
    case '5-10':
      score += 15;
      break;
    case '1-5':
      score += 10;
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
        role: data.role,
        handicap_range: data.handicap_range,
        rounds_per_month: data.rounds_per_month,
        // Store codes in answers until columns are added
        invite_code: data.invite_code,
        referral_code: data.referral_code
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
// Deployment trigger: Mon Aug 25 06:39:29 PM MST 2025
