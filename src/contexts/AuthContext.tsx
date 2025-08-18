import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { DOMAIN_CONFIG } from '@/config/domain';
// import { setupSessionMonitor, getValidSession } from '@/lib/authHelpers'; // DISABLED
// import enhancedAuth from '@/lib/enhancedAuth'; // DISABLED
// import tabFocusAuth from '@/lib/tabFocusAuth'; // DISABLED
// import { toast } from 'sonner'; // DISABLED
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
  // const sessionMonitorCleanup = useRef<(() => void) | null>(null); // DISABLED

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
        console.error('Error fetching profile:', error);
        
        // If profile doesn't exist and this is a Google user, create one
        if (error.code === 'PGRST116' && user?.app_metadata?.provider === 'google') {
          console.log('[AuthContext] Creating profile for Google user');
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              username: user.email?.split('@')[0] || userId.substring(0, 8),
              display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (createError) {
            console.error('Error creating Google user profile:', createError);
            return null;
          }
          
          return newProfile;
        }
        
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    // DISABLED ALL ENHANCED AUTH - Just use basic Supabase auth
    // const cleanupEnhancedAuth = enhancedAuth.initialize();
    
    // Get initial session - SIMPLE VERSION
    const initializeAuth = async () => {
      console.log('[AuthContext] Initializing auth...');
      try {
        // Just use basic Supabase getSession
        const { data: { session: validSession } } = await supabase.auth.getSession();
        setSession(validSession);
        setUser(validSession?.user ?? null);
        
        // Fetch profile if user exists
        if (validSession?.user) {
          console.log('[AuthContext] User found, fetching profile...');
          const profileData = await fetchProfile(validSession.user.id);
          setProfile(profileData);
        } else {
          console.log('[AuthContext] No user session found');
          setProfileLoading(false);
        }
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', error);
        setProfileLoading(false);
      } finally {
        setLoading(false);
        setInitialized(true);
        console.log('[AuthContext] Auth initialization complete');
      }
    };
    
    initializeAuth();

    // DISABLED enhanced auth state change listener
    // const unsubscribeAuth = enhancedAuth.onAuthStateChange((event, session) => {
    
    // DISABLED legacy session monitor
    // sessionMonitorCleanup.current = setupSessionMonitor(

    // MINIMAL auth change listener - only for actual sign in/out actions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // ONLY handle explicit sign out - ignore all other events to prevent tab switching issues
      if (event === 'SIGNED_OUT') {
        console.log('[AuthContext] User explicitly signed out');
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
      }
      // IGNORE all other events including SIGNED_IN, TOKEN_REFRESHED, etc.
      // These fire when switching tabs and cause issues
    });

    return () => {
      subscription.unsubscribe();
      // DISABLED: All other cleanup since we disabled the features
      // if (sessionMonitorCleanup.current) {
      //   sessionMonitorCleanup.current();
      // }
      // cleanupEnhancedAuth();
      // unsubscribeAuth();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    
    // Manually set session since we disabled auth state change listener
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
      if (data.session.user) {
        const profileData = await fetchProfile(data.session.user.id);
        setProfile(profileData);
      }
    }
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

    // Profile creation is now handled by database trigger
    // but we'll try to create it anyway as a fallback
    if (data.user) {
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        // Only throw if it's not a duplicate key error
        if (profileError && profileError.code !== '23505') {
          // Profile creation error - might be created by trigger
        }
      } catch (err) {
        // Profile creation failed, might be created by trigger
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
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
        loading: loading || profileLoading, // Consider loading if either auth or profile is loading
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