/**
 * @deprecated This AdminContext is being phased out in favor of useAdminAuth hook.
 * For new components, please use useAdminAuth, useRequireAdmin, or useOptionalAdminAuth 
 * from @/hooks/useAdminAuth instead.
 * 
 * This context is maintained for backward compatibility with existing forum components.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

interface AdminContextType {
  isAdmin: boolean;
  checkingAdmin: boolean;
  refreshAdminStatus: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setCheckingAdmin(false);
      return;
    }

    setCheckingAdmin(true);
    try {
      // Check if user exists in admins table (consistent with new admin system)
      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // PGRST116 means "not found" - user is not admin
        if (error.code === 'PGRST116') {
          setIsAdmin(false);
        } else {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(!!data);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  };

  const refreshAdminStatus = async () => {
    await checkAdminStatus();
  };

  // Check admin status when user changes
  useEffect(() => {
    checkAdminStatus();
  }, [user?.id]);

  const value: AdminContextType = {
    isAdmin,
    checkingAdmin,
    refreshAdminStatus
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}