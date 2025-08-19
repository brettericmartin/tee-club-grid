import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { DOMAIN_CONFIG } from '@/config/domain';
import type { Database } from '@/lib/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Return a safe default for components that might render before AuthProvider
    console.warn('useAuth called outside AuthProvider, returning default values');
    return {
      user: null,
      session: null,
      profile: null,
      loading: true, // Default to loading to prevent premature renders
      profileLoading: true,
      initialized: false,
      signIn: async () => { throw new Error('Auth not initialized'); },
      signUp: async () => { throw new Error('Auth not initialized'); },
      signOut: async () => { throw new Error('Auth not initialized'); },
      signInWithGoogle: async () => { throw new Error('Auth not initialized'); },
    };
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        // PGRST116 means no rows found - profile doesn't exist
        if (error.code === 'PGRST116') {
          console.log('[AuthContext] Profile does not exist for user:', userId);
          // Try to create profile
          const user = session?.user;
          if (user) {
            const { data: newProfile } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                username: user.email?.split('@')[0] || user.id.substring(0, 8),
                display_name: user.user_metadata?.full_name || 
                             user.user_metadata?.name || 
                             user.email?.split('@')[0],
                avatar_url: user.user_metadata?.avatar_url || 
                           user.user_metadata?.picture,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
            
            if (newProfile) {
              console.log('[AuthContext] Profile created successfully');
              return newProfile;
            }
          }
          return null;
        }
        
        console.error('Error fetching profile:', error);
        return null;
      }
      
      console.log('[AuthContext] Profile fetched successfully:', data.username);
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    // Initialize auth - the RIGHT way according to Supabase docs
    const initializeAuth = async () => {
      console.log('[AuthContext] Initializing auth...');
      try {
        // Get the session from Supabase - this handles ALL the complexity
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('[AuthContext] Session found, setting user...');
          setSession(session);
          setUser(session.user);
          
          // Fetch profile
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        } else {
          console.log('[AuthContext] No session found');
          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileLoading(false);
        }
      } catch (error) {
        console.error('[AuthContext] Error during initialization:', error);
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
      } finally {
        setLoading(false);
        setInitialized(true);
        console.log('[AuthContext] Auth initialization complete');
      }
    };
    
    // Initialize immediately
    initializeAuth();

    // Listen for auth changes - let Supabase handle the complexity
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth event:', event);
        
        // Update our state based on what Supabase tells us
        if (session) {
          setSession(session);
          setUser(session.user);
          
          // Fetch/create profile for new sessions
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
          }
        } else {
          // No session means logged out
          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileLoading(false);
        }
      }
    );

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    // Auth state change listener will handle the rest
  };

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (error) throw error;
    // Profile creation will be handled by auth state change listener
  };

  const signOut = async () => {
    console.log('[AuthContext] Signing out...');
    
    // Clear local state immediately for better UX
    setSession(null);
    setUser(null);
    setProfile(null);
    setProfileLoading(false);
    
    try {
      // Tell Supabase to sign out
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthContext] Error signing out:', error);
      }
    } catch (err) {
      console.error('[AuthContext] Unexpected error during sign out:', err);
    }
    
    // Redirect to home
    window.location.href = '/';
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: DOMAIN_CONFIG.getAuthCallbackUrl(),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: 'email profile',
      },
    });
    
    if (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
    
    console.log('Google OAuth initiated, redirecting to:', data?.url);
    
    // The OAuth flow will redirect automatically if successful
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        profileLoading,
        initialized,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}