import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { DOMAIN_CONFIG } from '@/config/domain';
import { setupSessionMonitor, getValidSession } from '@/lib/authHelpers';
import enhancedAuth from '@/lib/enhancedAuth';
// import tabFocusAuth from '@/lib/tabFocusAuth'; // TEMPORARILY DISABLED
import { toast } from 'sonner';
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
  const sessionMonitorCleanup = useRef<(() => void) | null>(null);

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
    // Initialize enhanced auth monitoring
    const cleanupEnhancedAuth = enhancedAuth.initialize();
    
    // TEMPORARILY DISABLED: Tab focus auth causing issues
    // const cleanupTabFocusAuth = tabFocusAuth.initialize();
    
    // TEMPORARILY DISABLED: Listen for auth refresh events from tab focus handler
    // const handleAuthRefreshed = (event: CustomEvent) => {
    //   console.log('[AuthContext] Auth refreshed from tab focus');
    //   const { session } = event.detail;
    //   if (session) {
    //     setSession(session);
    //     setUser(session.user);
    //     if (session.user) {
    //       fetchProfile(session.user.id).then(setProfile);
    //     }
    //   }
    // };
    // window.addEventListener('auth-refreshed', handleAuthRefreshed as EventListener);
    
    // Get initial session
    const initializeAuth = async () => {
      console.log('[AuthContext] Initializing auth...');
      try {
        // Use enhanced auth to get valid session
        const validSession = await enhancedAuth.getValidSession();
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

    // Set up enhanced auth state change listener
    const unsubscribeAuth = enhancedAuth.onAuthStateChange((event, session) => {
      console.log(`[AuthContext] Auth event: ${event}`, session?.user?.email);
      
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id).then(setProfile);
        }
      }
    });

    // Set up legacy session monitor as backup
    sessionMonitorCleanup.current = setupSessionMonitor(
      // On session expired
      () => {
        console.log('[AuthContext] Session expired, clearing auth state');
        setSession(null);
        setUser(null);
        setProfile(null);
        toast.error('Your session has expired. Please sign in again.');
      },
      // On session refreshed
      (newSession) => {
        console.log('[AuthContext] Session auto-refreshed (legacy)');
        setSession(newSession);
        setUser(newSession.user);
      }
    );

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state changed:', event);
      
      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
          console.log('[AuthContext] User signed in');
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
          }
          break;
          
        case 'SIGNED_OUT':
          console.log('[AuthContext] User signed out');
          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileLoading(false);
          break;
          
        case 'TOKEN_REFRESHED':
          console.log('[AuthContext] Token refreshed successfully');
          setSession(session);
          setUser(session?.user ?? null);
          break;
          
        case 'USER_UPDATED':
          console.log('[AuthContext] User updated');
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
          }
          break;
          
        default:
          // Handle any other events
          setSession(session);
          setUser(session?.user ?? null);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (sessionMonitorCleanup.current) {
        sessionMonitorCleanup.current();
      }
      cleanupEnhancedAuth();
      // TEMPORARILY DISABLED: cleanupTabFocusAuth();
      unsubscribeAuth();
      // TEMPORARILY DISABLED: window.removeEventListener('auth-refreshed', handleAuthRefreshed as EventListener);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
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