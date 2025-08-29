import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Simple service for beta signups - just creates profiles
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface WaitlistSubmission {
  email: string;
  display_name: string;
  city_region?: string;
  // Keep these for the form but we don't store them
  role?: string;
  share_channels?: string[];
  learn_channels?: string[];
  spend_bracket?: string;
  uses?: string[];
  buy_frequency?: string;
  share_frequency?: string;
  termsAccepted?: boolean;
}

export async function submitWaitlistApplication(data: WaitlistSubmission) {
  console.log('[Waitlist] Creating profile for:', data.email);
  
  try {
    // Step 1: Check how many beta users we have
    const { count: betaCount, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('beta_access', true);
    
    if (countError) {
      console.error('[Waitlist] Error counting beta users:', countError);
      // Continue anyway, default to no beta access
    }
    
    const currentBetaUsers = betaCount || 0;
    const hasCapacity = currentBetaUsers < 150;
    
    // Step 2: Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, email, beta_access')
      .eq('email', data.email.toLowerCase())
      .single();
    
    if (existingProfile) {
      // Profile already exists
      console.log('[Waitlist] Profile already exists for:', data.email);
      return {
        status: existingProfile.beta_access ? 'approved' : 'pending',
        spotsRemaining: Math.max(0, 150 - currentBetaUsers),
        message: existingProfile.beta_access 
          ? 'You already have beta access! Sign in to continue.'
          : `You're already on the waitlist. ${150 - currentBetaUsers} spots remaining.`
      };
    }
    
    // Step 3: Create new profile with beta access based on capacity
    const newProfileId = uuidv4();
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: newProfileId,
        email: data.email.toLowerCase(),
        display_name: data.display_name,
        username: data.display_name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000),
        beta_access: hasCapacity,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('[Waitlist] Error creating profile:', insertError);
      
      // If it's a unique constraint error, they probably already exist
      if (insertError.code === '23505') {
        return {
          status: 'pending',
          message: 'An account with this email already exists. Please sign in.'
        };
      }
      
      throw insertError;
    }
    
    console.log('[Waitlist] Profile created successfully');
    
    // Step 4: Return appropriate response
    if (hasCapacity) {
      return {
        status: 'approved' as const,
        spotsRemaining: 150 - currentBetaUsers - 1,
        message: `🎉 Congratulations! You're beta user #${currentBetaUsers + 1}. Check your email to set up your account!`
      };
    } else {
      // Calculate their position in line
      const { count: totalProfiles } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      const position = (totalProfiles || 151) - 150;
      
      return {
        status: 'at_capacity' as const,
        spotsRemaining: 0,
        message: `You're #${position} on the waitlist. We'll email you when a spot opens up!`
      };
    }
    
  } catch (error: any) {
    console.error('[Waitlist] Unexpected error:', error);
    return {
      status: 'error' as const,
      message: 'Something went wrong. Please try again or contact support.'
    };
  }
}

// Check if we're in development mode
export const isDevelopment = () => {
  return import.meta.env.DEV || window.location.hostname === 'localhost';
};