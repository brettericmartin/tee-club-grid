/**
 * Centralized beta access utilities for action-level gating
 * Complements the existing BetaGuard component for route-level protection
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { trackBetaGuardBlocked, trackBetaGuardPassed } from '@/utils/analytics';

interface FeatureFlags {
  public_beta_enabled: boolean;
  beta_cap: number;
}

// Cache for feature flags (shared with BetaGuard component)
let featureFlagsCache: {
  data: FeatureFlags | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to check beta access status
 * Returns loading state and access status
 */
export function useBetaAccess() {
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasBetaAccess, setHasBetaAccess] = useState(false);
  const [publicBetaEnabled, setPublicBetaEnabled] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Check cache first
        const now = Date.now();
        let flags: FeatureFlags | null = null;
        
        if (featureFlagsCache.data && (now - featureFlagsCache.timestamp) < CACHE_DURATION) {
          flags = featureFlagsCache.data;
        } else {
          // Fetch fresh feature flags
          const { data: fetchedFlags, error } = await supabase
            .from('feature_flags')
            .select('public_beta_enabled, beta_cap')
            .eq('id', 1)
            .single();

          if (!error && fetchedFlags) {
            flags = {
              public_beta_enabled: fetchedFlags.public_beta_enabled || false,
              beta_cap: fetchedFlags.beta_cap || 150
            };
            
            // Update cache
            featureFlagsCache = {
              data: flags,
              timestamp: now
            };
          }
        }

        if (flags) {
          setPublicBetaEnabled(flags.public_beta_enabled);
          
          // If public beta is enabled, everyone has access
          if (flags.public_beta_enabled) {
            setHasBetaAccess(true);
          } else if (profile) {
            // Check user's beta access or admin status
            setHasBetaAccess(profile.beta_access || profile.is_admin || false);
          } else {
            setHasBetaAccess(false);
          }
        }
      } catch (error) {
        console.error('[BetaAccess] Error checking access:', error);
        setHasBetaAccess(false);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAccess();
    }
  }, [user, profile, authLoading]);

  return {
    loading: loading || authLoading,
    hasBetaAccess,
    publicBetaEnabled,
    isAdmin: profile?.is_admin || false
  };
}

/**
 * Hook for action-level beta gating
 * Provides a guard function that can be used in onClick handlers
 */
export function useBetaGuard() {
  const navigate = useNavigate();
  const { hasBetaAccess, publicBetaEnabled } = useBetaAccess();
  const { user } = useAuth();

  const requireBetaAccess = (
    actionName: string = 'perform this action',
    options?: {
      showToast?: boolean;
      redirectToWaitlist?: boolean;
      customMessage?: string;
    }
  ): boolean => {
    const opts = {
      showToast: true,
      redirectToWaitlist: true,
      ...options
    };

    // If public beta is enabled or user has access, allow
    if (publicBetaEnabled || hasBetaAccess) {
      trackBetaGuardPassed({
        route: window.location.pathname,
        hasBetaAccess,
        publicBetaEnabled
      });
      return true;
    }

    // Track the block
    trackBetaGuardBlocked({
      route: window.location.pathname,
      reason: !user ? 'not_authenticated' : 'no_beta_access'
    });

    // Show feedback to user
    if (opts.showToast) {
      const message = opts.customMessage || 
        (!user 
          ? `Please sign in to ${actionName}`
          : `Join the beta to ${actionName}`);
      
      toast.error(message, {
        action: {
          label: user ? 'Join Waitlist' : 'Sign In',
          onClick: () => {
            if (user) {
              navigate('/waitlist?reason=beta_required');
            } else {
              navigate('/?signin=true');
            }
          }
        }
      });
    }

    // Optionally redirect
    if (opts.redirectToWaitlist && user) {
      navigate('/waitlist?reason=beta_required');
    }

    return false;
  };

  return { requireBetaAccess, hasBetaAccess, publicBetaEnabled };
}

/**
 * Component wrapper for conditional rendering based on beta access
 * Shows alternative content when access is denied
 */
interface BetaGatedProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export function BetaGated({ 
  children, 
  fallback = null,
  showFallback = true 
}: BetaGatedProps) {
  const { hasBetaAccess, publicBetaEnabled, loading } = useBetaAccess();
  
  if (loading) {
    return null; // Or a loading skeleton
  }

  if (publicBetaEnabled || hasBetaAccess) {
    return <>{children}</>;
  }

  return showFallback ? <>{fallback}</> : null;
}

/**
 * Higher-order component for wrapping components with beta access check
 */
export function withBetaGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: React.ComponentType<P>;
    redirectToWaitlist?: boolean;
  }
) {
  return function BetaGuardedComponent(props: P) {
    const { hasBetaAccess, publicBetaEnabled, loading } = useBetaAccess();
    const navigate = useNavigate();

    useEffect(() => {
      if (!loading && !publicBetaEnabled && !hasBetaAccess && options?.redirectToWaitlist) {
        navigate('/waitlist?reason=beta_required');
      }
    }, [loading, publicBetaEnabled, hasBetaAccess, navigate]);

    if (loading) {
      return null;
    }

    if (publicBetaEnabled || hasBetaAccess) {
      return <Component {...props} />;
    }

    if (options?.fallback) {
      const FallbackComponent = options.fallback;
      return <FallbackComponent {...props} />;
    }

    return null;
  };
}

/**
 * Utility to clear the feature flags cache
 * Useful for testing or after admin changes
 */
export function clearBetaAccessCache() {
  featureFlagsCache = {
    data: null,
    timestamp: 0
  };
}