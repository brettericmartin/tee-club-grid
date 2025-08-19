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
    return {
      user: null,
      session: null,
      profile: null,
      loading: false,
      profileLoading: false,
      initialized: true,
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
  const [profileLoading, setProfileLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Initialize auth state
    const initializeAuth = async () => {
      console.log('[AuthContext] Checking auth status...');
      
      try {
        // Get current session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('[AuthContext] Error getting session:', error);
          // Continue anyway - user is just logged out
        }
        
        if (session?.user) {
          console.log('[AuthContext] User session found');
          setSession(session);
          setUser(session.user);
          
          // Try to fetch profile but don't block
          fetchProfile(session.user.id);
        } else {
          console.log('[AuthContext] No active session');
        }
        
      } catch (error) {
        console.error('[AuthContext] Unexpected error:', error);
        // Continue anyway - treat as logged out
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
          console.log('[AuthContext] Auth check complete');
        }
      }
    };

    // Fetch user profile
    const fetchProfile = async (userId: string) => {
      if (!mounted) return;
      
      setProfileLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (!mounted) return;
        
        if (error) {
          if (error.code === 'PGRST116') {
            // Profile doesn't exist - try to create it
            console.log('[AuthContext] Creating profile for new user');
            const currentUser = session?.user || user;
            if (currentUser) {
              const { data: newProfile } = await supabase
                .from('profiles')
                .insert({
                  id: currentUser.id,
                  username: currentUser.email?.split('@')[0] || currentUser.id.substring(0, 8),
                  display_name: currentUser.user_metadata?.full_name || 
                               currentUser.user_metadata?.name || 
                               currentUser.email?.split('@')[0],
                  avatar_url: currentUser.user_metadata?.avatar_url || 
                             currentUser.user_metadata?.picture,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single();
              
              if (mounted && newProfile) {
                setProfile(newProfile);
              }
            }
          }
        } else if (data && mounted) {
          console.log('[AuthContext] Profile loaded:', data.username);
          setProfile(data);
        }
      } catch (error) {
        console.error('[AuthContext] Profile error:', error);
      } finally {
        if (mounted) {
          setProfileLoading(false);
        }
      }
    };

    // Start initialization
    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        
        console.log('[AuthContext] Auth state changed:', event);
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
        } else if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          
          // Fetch profile on sign in
          if (event === 'SIGNED_IN') {
            fetchProfile(newSession.user.id);
          }
        }
      }
    );

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
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
  };

  const signOut = async () => {
    console.log('[AuthContext] Signing out...');
    
    // Clear local state immediately
    setSession(null);
    setUser(null);
    setProfile(null);
    
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[AuthContext] Sign out error:', error);
    }
    
    // Navigate to home
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
    
    if (error) throw error;
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