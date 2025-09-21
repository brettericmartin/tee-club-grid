import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Log the full URL for debugging
        console.log('Auth callback URL:', window.location.href);
        console.log('Hash:', window.location.hash);
        console.log('Search params:', window.location.search);
        
        // Handle hash-based flow (for implicit grant)
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken) {
            console.log('Found access token in hash');
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (error) {
              console.error('Error setting session from hash:', error);
              setError(error.message);
            } else if (data?.session) {
              console.log('Session set successfully from hash');
              
              // Check if user has beta access
              const { data: profile } = await supabase
                .from('profiles')
                .select('beta_access, is_admin')
                .eq('id', data.session.user.id)
                .single();
              
              // Wait for auth state to propagate and navigate based on beta access
              setTimeout(() => {
                if (profile && (profile.beta_access || profile.is_admin)) {
                  console.log('User has beta access, navigating to my-bag');
                  navigate('/my-bag');
                } else {
                  console.log('User needs waitlist, navigating to waitlist');
                  navigate('/waitlist');
                }
              }, 500);
              return;
            }
          }
        }
        
        // Handle code-based flow (for authorization code grant)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const errorParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription);
          setError(errorDescription || errorParam);
          setTimeout(() => navigate('/waitlist'), 3000);
          return;
        }
        
        if (code) {
          console.log('Found code in query params, exchanging for session');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Error exchanging code for session:', error);
            setError(error.message);
            setTimeout(() => navigate('/waitlist'), 3000);
            return;
          }
          
          if (data?.session) {
            console.log('Successfully authenticated with Google, session:', data.session.user?.email);
            
            // Check if user has beta access
            const { data: profile } = await supabase
              .from('profiles')
              .select('beta_access, is_admin')
              .eq('id', data.session.user.id)
              .single();
            
            // Force a refresh of the auth state
            await supabase.auth.refreshSession();
            
            // Wait for auth state to propagate and navigate based on beta access
            setTimeout(() => {
              if (profile && (profile.beta_access || profile.is_admin)) {
                console.log('User has beta access, navigating to my-bag');
                navigate('/my-bag');
              } else {
                console.log('User needs waitlist, navigating to waitlist');
                navigate('/waitlist');
              }
            }, 500);
            return;
          }
        }
        
        // If no code or hash, check if there's already a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          setError(sessionError.message);
          setTimeout(() => navigate('/waitlist'), 3000);
          return;
        }

        if (session) {
          console.log('Found existing session');
          
          // Check if user has beta access
          const { data: profile } = await supabase
            .from('profiles')
            .select('beta_access, is_admin')
            .eq('id', session.user.id)
            .single();
          
          if (profile && (profile.beta_access || profile.is_admin)) {
            console.log('User has beta access, navigating to my-bag');
            navigate('/my-bag');
          } else {
            console.log('User needs waitlist, navigating to waitlist');
            navigate('/waitlist');
          }
        } else {
          console.log('No session found after callback');
          setError('Authentication failed - no session created');
          setTimeout(() => navigate('/waitlist'), 3000);
        }
      } catch (error) {
        console.error('Error during auth callback:', error);
        setError('An unexpected error occurred');
        setTimeout(() => navigate('/waitlist'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary/10 flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-red-500 mb-4">⚠️</div>
            <p className="text-white mb-2">Authentication Error</p>
            <p className="text-white/70 text-sm max-w-md">{error}</p>
            <p className="text-white/50 text-xs mt-4">Redirecting to sign in...</p>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-white">Completing sign in...</p>
          </>
        )}
      </div>
    </div>
  );
}