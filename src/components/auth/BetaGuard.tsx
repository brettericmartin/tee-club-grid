import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { trackBetaGuardBlocked, trackBetaGuardPassed } from "@/utils/analytics";

interface BetaGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean; // Optional: also require authentication
}

interface FeatureFlags {
  public_beta_enabled: boolean;
  beta_cap: number;
}

// Cache for feature flags to avoid repeated fetches
let featureFlagsCache: {
  data: FeatureFlags | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function BetaGuard({ children, requireAuth = false }: BetaGuardProps) {
  const { user, profile, loading: authLoading } = useAuth();
  const location = useLocation();
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [betaAccess, setBetaAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkBetaAccess = async () => {
      try {
        // Check cache first
        const now = Date.now();
        if (featureFlagsCache.data && (now - featureFlagsCache.timestamp) < CACHE_DURATION) {
          setFeatureFlags(featureFlagsCache.data);
        } else {
          // Fetch fresh feature flags
          const { data: flags, error: flagsError } = await supabase
            .from('feature_flags')
            .select('public_beta_enabled, beta_cap')
            .eq('id', 1)
            .single();

          if (!flagsError && flags) {
            const flagData = {
              public_beta_enabled: flags.public_beta_enabled || false,
              beta_cap: flags.beta_cap || 150
            };
            
            // Update cache
            featureFlagsCache = {
              data: flagData,
              timestamp: now
            };
            
            setFeatureFlags(flagData);
          } else {
            // Default to requiring beta if we can't fetch flags
            console.error('[BetaGuard] Error fetching feature flags:', flagsError);
            setFeatureFlags({ public_beta_enabled: false, beta_cap: 150 });
          }
        }

        // Check user's beta access if authenticated
        if (user && profile) {
          // Profile already has beta_access field from AuthContext
          // Also grant access to admins
          setBetaAccess(profile.beta_access || profile.is_admin || false);
        } else if (user && !profile) {
          // Fetch profile if not available
          const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('beta_access, is_admin')
            .eq('id', user.id)
            .single();

          if (!profileError && userProfile) {
            // Also grant access to admins
            setBetaAccess(userProfile.beta_access || userProfile.is_admin || false);
          } else {
            setBetaAccess(false);
          }
        } else {
          setBetaAccess(false);
        }
      } catch (error) {
        console.error('[BetaGuard] Unexpected error:', error);
        // Default to requiring beta on error
        setFeatureFlags({ public_beta_enabled: false, beta_cap: 150 });
        setBetaAccess(false);
      } finally {
        setLoading(false);
      }
    };

    // Don't check if still loading auth
    if (!authLoading) {
      checkBetaAccess();
    }
  }, [user, profile, authLoading]);

  // Track access based on conditions (must be called unconditionally)
  useEffect(() => {
    // Don't track while loading
    if (loading || authLoading) return;

    // Track based on access decision
    if (featureFlags?.public_beta_enabled) {
      trackBetaGuardPassed({
        route: location.pathname,
        publicBetaEnabled: true,
      });
    } else if (requireAuth && !user) {
      trackBetaGuardBlocked({
        route: location.pathname,
        reason: 'not_authenticated',
      });
    } else if (betaAccess) {
      trackBetaGuardPassed({
        route: location.pathname,
        hasBetaAccess: true,
        publicBetaEnabled: false,
      });
    } else {
      trackBetaGuardBlocked({
        route: location.pathname,
        reason: 'no_beta_access',
      });
    }
  }, [location.pathname, loading, authLoading, featureFlags, requireAuth, user, betaAccess]);

  // Show loading skeleton while checking
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-8 w-48 mx-auto bg-white/10" />
          <Skeleton className="h-64 w-full bg-white/10" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full bg-white/10" />
            <Skeleton className="h-4 w-3/4 bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  // If public beta is enabled, allow everyone
  if (featureFlags?.public_beta_enabled) {
    return <>{children}</>;
  }

  // If auth is required but user is not authenticated
  if (requireAuth && !user) {
    return <Navigate to="/waitlist" state={{ from: location }} replace />;
  }

  // Check beta access
  if (betaAccess) {
    return <>{children}</>;
  }

  // No beta access - redirect to waitlist
  return <Navigate to="/waitlist" state={{ from: location }} replace />;
}

// Utility function to clear cache (useful for testing or after updates)
export function clearBetaGuardCache() {
  featureFlagsCache = {
    data: null,
    timestamp: 0
  };
}