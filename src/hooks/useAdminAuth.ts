/**
 * React hook for admin authentication and authorization
 * Provides admin status checking and loading states
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface AdminAuthState {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  checkAdminStatus: () => Promise<void>;
}

export function useAdminAuth(): AdminAuthState {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAdminStatus = async (): Promise<void> => {
    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check if user is admin in profiles table
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (queryError) {
        // If error is "PGRST116" (not found), user is not admin
        if (queryError.code === 'PGRST116') {
          setIsAdmin(false);
        } else {
          console.error('[useAdminAuth] Error checking admin status:', queryError);
          setError('Failed to verify admin status');
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(data?.is_admin === true);
      }
    } catch (err) {
      console.error('[useAdminAuth] Unexpected error:', err);
      setError('An unexpected error occurred');
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Check admin status when user changes or component mounts
  useEffect(() => {
    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  return {
    isAdmin,
    isLoading: authLoading || isLoading,
    error,
    checkAdminStatus
  };
}

/**
 * Hook specifically for requiring admin access
 * Returns loading state until admin status is verified
 * Throws error if user is not admin
 */
export function useRequireAdmin(): AdminAuthState & { 
  isAuthorized: boolean;
} {
  const adminAuth = useAdminAuth();
  const { user } = useAuth();

  const isAuthorized = !adminAuth.isLoading && 
                      !!user && 
                      adminAuth.isAdmin && 
                      !adminAuth.error;

  return {
    ...adminAuth,
    isAuthorized
  };
}

/**
 * Conditional admin auth hook - doesn't require admin access
 * Useful for components that show different UI based on admin status
 */
export function useOptionalAdminAuth(): AdminAuthState {
  return useAdminAuth();
}