import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  checkAuth: () => Promise<void>;
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
      checkAuth: async () => {},
    };
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false); // Start with false - not loading
  const [profileLoading, setProfileLoading] = useState(false);
  const [initialized, setInitialized] = useState(true); // Start initialized
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist - create it
        const currentUser = user || session?.user;
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
          
          if (newProfile) {
            setProfile(newProfile);
          }
        }
      } else if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('[AuthContext] Profile error:', error);
    } finally {
      setProfileLoading(false);
    }
  }, [user, session]);

  // Check auth - only when explicitly needed
  const checkAuth = useCallback(async () => {
    if (hasCheckedAuth) return; // Already checked once
    
    console.log('[AuthContext] Checking auth (on demand)...');
    setLoading(true);
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (!error && session?.user) {
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id);
      }
      
      setHasCheckedAuth(true);
    } catch (error) {
      console.error('[AuthContext] Auth check error:', error);
    } finally {
      setLoading(false);
    }
  }, [hasCheckedAuth, fetchProfile]);

  useEffect(() => {
    // Only set up the auth state listener - don't check auth on mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[AuthContext] Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          setHasCheckedAuth(true);
          fetchProfile(newSession.user.id);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setHasCheckedAuth(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // Auth state listener will handle the rest
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    setLoading(true);
    try {
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
      // Auth state listener will handle the rest
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log('[AuthContext] Signing out...');
    
    // Clear local state immediately
    setSession(null);
    setUser(null);
    setProfile(null);
    setHasCheckedAuth(false);
    
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
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}