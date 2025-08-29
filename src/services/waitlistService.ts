import { createClient } from '@supabase/supabase-js';

// Simple service for beta signups
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface WaitlistSubmission {
  email: string;
  display_name: string;  // This becomes their username!
  password: string;  // User provides their own password
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
  
  // Sanitize display_name to be a valid username (lowercase, no spaces)
  const username = data.display_name.toLowerCase().replace(/[^a-z0-9_]/g, '');
  
  if (!username || username.length < 3) {
    return {
      status: 'error' as const,
      message: 'Username must be at least 3 characters (letters, numbers, underscores only)'
    };
  }
  
  try {
    // Step 1: Check if username is already taken
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();
    
    if (existingUsername) {
      console.log('[Waitlist] Username already taken:', username);
      return {
        status: 'error' as const,
        message: `@${username} is already taken. Try adding numbers or underscores.`
      };
    }
    
    // Step 2: Check if email is already registered
    const { data: existingEmail } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', data.email.toLowerCase())
      .single();
    
    if (existingEmail) {
      console.log('[Waitlist] Email already registered:', data.email);
      return {
        status: 'error' as const,
        message: 'This email is already registered. Please sign in.'
      };
    }
    
    // Step 3: Check how many beta users we have
    const { count: betaCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('beta_access', true);
    
    const currentBetaUsers = betaCount || 0;
    const hasCapacity = currentBetaUsers < 150;
    const spotsRemaining = Math.max(0, 150 - currentBetaUsers);
    
    // Step 4: Create auth user with username in metadata
    console.log('[Waitlist] Creating user with username:', username);
    
    // Use the password provided by the user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email.toLowerCase(),
      password: data.password,  // Use user-provided password
      options: {
        data: {
          username: username,  // Pass username to trigger
          display_name: data.display_name,  // Keep original display name
          beta_access: hasCapacity,
        }
      }
    });
    
    if (signUpError) {
      console.error('[Waitlist] Signup error:', signUpError);
      
      if (signUpError.message?.includes('already registered')) {
        return {
          status: 'error' as const,
          message: 'This email is already registered. Please sign in.'
        };
      }
      
      if (signUpError.message?.includes('Database error')) {
        return {
          status: 'error' as const,
          message: 'Database error. Make sure the username is valid.'
        };
      }
      
      throw signUpError;
    }
    
    // Step 5: Update profile with additional info
    if (authData.user) {
      await supabase
        .from('profiles')
        .update({
          display_name: data.display_name,
          username: username,
          beta_access: hasCapacity,
          email: data.email.toLowerCase(),
          city_region: data.city_region
        })
        .eq('id', authData.user.id);
    }
    
    console.log('[Waitlist] User created successfully');
    
    // Step 6: Return response with username
    if (hasCapacity) {
      return {
        status: 'approved' as const,
        spotsRemaining: spotsRemaining - 1,
        message: `🎉 Welcome @${username}! You're beta user #${currentBetaUsers + 1}. You can now sign in with your email and password.`
      };
    } else {
      const { count: totalProfiles } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      const position = (totalProfiles || 151) - 150;
      
      return {
        status: 'at_capacity' as const,
        spotsRemaining: 0,
        message: `You're #${position} on the waitlist @${username}. You can sign in with your email and password once approved.`
      };
    }
    
  } catch (error: any) {
    console.error('[Waitlist] Error:', error);
    
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