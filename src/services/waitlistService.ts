import { createClient } from '@supabase/supabase-js';

// Simple service for beta signups
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface WaitlistSubmission {
  email: string;
  display_name: string;
  username: string;  // User picks this!
  city_region?: string;
  // Keep these for the form but we don't store them anywhere
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
  console.log('[Waitlist] Processing signup for:', data.email);
  
  try {
    // Step 1: Check how many beta users we have
    const { count: betaCount, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('beta_access', true);
    
    if (countError) {
      console.error('[Waitlist] Error counting beta users:', countError);
    }
    
    const currentBetaUsers = betaCount || 0;
    const hasCapacity = currentBetaUsers < 150;
    const spotsRemaining = Math.max(0, 150 - currentBetaUsers);
    
    // Step 2: Check if they already signed up (by email or username)
    const { data: existingByEmail } = await supabase
      .from('profiles')
      .select('email, beta_access')
      .eq('email', data.email.toLowerCase())
      .single();
    
    if (existingByEmail) {
      console.log('[Waitlist] Email already exists:', data.email);
      return {
        status: 'error' as const,
        message: 'This email is already registered. Please sign in.'
      };
    }
    
    // Check if username is taken
    const { data: existingByUsername } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', data.username.toLowerCase())
      .single();
    
    if (existingByUsername) {
      console.log('[Waitlist] Username already taken:', data.username);
      return {
        status: 'error' as const,
        message: 'This username is already taken. Please choose another.'
      };
    }
    
    // Step 3: Create auth user AND profile with username
    console.log('[Waitlist] Creating new user with username:', data.username);
    
    // Generate a random password for the user (they'll reset it via email)
    const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
    
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email.toLowerCase(),
      password: tempPassword,
      options: {
        data: {
          display_name: data.display_name,
          username: data.username.toLowerCase(),
          beta_access: hasCapacity,
        }
      }
    });
    
    if (signUpError) {
      console.error('[Waitlist] Signup error:', signUpError);
      
      // Check if it's because they already exist
      if (signUpError.message?.includes('already registered')) {
        return {
          status: 'error' as const,
          message: 'This email is already registered. Please sign in or reset your password.'
        };
      }
      
      // If it's still the database error, show a more helpful message
      if (signUpError.message?.includes('Database error')) {
        return {
          status: 'error' as const,
          message: 'There was an issue creating your account. Please make sure all fields are filled correctly.'
        };
      }
      
      throw signUpError;
    }
    
    // Step 4: Update the profile with all the details
    if (authData.user) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: data.display_name,
          username: data.username.toLowerCase(),
          beta_access: hasCapacity,
          email: data.email.toLowerCase(),
          city_region: data.city_region
        })
        .eq('id', authData.user.id);
      
      if (updateError) {
        console.error('[Waitlist] Profile update error:', updateError);
        // Continue anyway - at least they have an account
      }
    }
    
    console.log('[Waitlist] User created successfully');
    
    // Step 5: Return appropriate response
    if (hasCapacity) {
      return {
        status: 'approved' as const,
        spotsRemaining: spotsRemaining - 1,
        message: `🎉 Welcome @${data.username}! You're beta user #${currentBetaUsers + 1}. Check your email to set your password.`
      };
    } else {
      // Calculate position in line
      const { count: totalProfiles } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      const position = (totalProfiles || 151) - 150;
      
      return {
        status: 'at_capacity' as const,
        spotsRemaining: 0,
        message: `You're #${position} on the waitlist @${data.username}. Check your email to set your password. We'll notify you when a spot opens!`
      };
    }
    
  } catch (error: any) {
    console.error('[Waitlist] Error:', error);
    
    // Provide helpful error messages
    if (error.message?.includes('profiles_email_key')) {
      return {
        status: 'error' as const,
        message: 'This email is already registered. Please sign in.'
      };
    }
    
    if (error.message?.includes('profiles_username_key')) {
      return {
        status: 'error' as const,
        message: 'This username is already taken. Please choose another.'
      };
    }
    
    return {
      status: 'error' as const,
      message: error.message || 'Something went wrong. Please try again.'
    };
  }
}

// Check if we're in development mode
export const isDevelopment = () => {
  return import.meta.env.DEV || window.location.hostname === 'localhost';
};