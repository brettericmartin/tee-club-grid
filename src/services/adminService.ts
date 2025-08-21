/**
 * Admin Service
 * Provides utilities for admin management and operations
 */

import { supabase } from '@/lib/supabase';

export interface AdminUser {
  user_id: string;
  created_at: string;
  created_by: string | null;
  notes: string | null;
  email?: string; // Joined from auth.users
  display_name?: string; // Joined from profiles
}

export interface AdminOperationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Check if the current user is an admin
 */
export async function getCurrentUserAdminStatus(): Promise<{
  isAdmin: boolean;
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { isAdmin: false, error: 'No authenticated user' };
    }

    const { data, error } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - user is not admin
        return { isAdmin: false };
      }
      return { isAdmin: false, error: error.message };
    }

    return { isAdmin: !!data };
  } catch (error) {
    console.error('[AdminService] Error checking admin status:', error);
    return { isAdmin: false, error: 'Unexpected error checking admin status' };
  }
}

/**
 * Get list of all admins with their profile information
 * Requires admin privileges
 */
export async function getAdminList(): Promise<AdminOperationResult> {
  try {
    // Check if current user is admin first
    const { isAdmin, error: authError } = await getCurrentUserAdminStatus();
    if (!isAdmin) {
      return {
        success: false,
        message: 'Admin access required',
        error: authError || 'Unauthorized'
      };
    }

    const { data, error } = await supabase
      .from('admins')
      .select(`
        user_id,
        created_at,
        created_by,
        notes,
        profiles!inner(display_name),
        auth.users!inner(email)
      `)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[AdminService] Error fetching admin list:', error);
      return {
        success: false,
        message: 'Failed to fetch admin list',
        error: error.message
      };
    }

    // Transform the data to flatten the joined fields
    const admins: AdminUser[] = (data || []).map(admin => ({
      user_id: admin.user_id,
      created_at: admin.created_at,
      created_by: admin.created_by,
      notes: admin.notes,
      email: (admin as any).auth?.users?.email,
      display_name: (admin as any).profiles?.display_name
    }));

    return {
      success: true,
      message: `Found ${admins.length} admin(s)`,
      data: admins
    };
  } catch (error) {
    console.error('[AdminService] Unexpected error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred',
      error: String(error)
    };
  }
}

/**
 * Check if a specific user is an admin
 */
export async function checkUserIsAdmin(userId: string): Promise<{
  isAdmin: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - user is not admin
        return { isAdmin: false };
      }
      return { isAdmin: false, error: error.message };
    }

    return { isAdmin: !!data };
  } catch (error) {
    console.error('[AdminService] Error checking user admin status:', error);
    return { isAdmin: false, error: 'Unexpected error' };
  }
}

/**
 * Log admin action for audit trail
 * This uses the abuse_metrics table to track admin actions
 */
export async function logAdminAction(
  action: string,
  targetId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('abuse_metrics')
      .insert({
        metric_type: 'admin_action',
        identifier: user.id,
        endpoint: action,
        metadata: {
          action,
          target_id: targetId,
          timestamp: new Date().toISOString(),
          ...metadata
        }
      });
  } catch (error) {
    // Don't throw errors for logging failures
    console.error('[AdminService] Failed to log admin action:', error);
  }
}

/**
 * Validate admin API request
 * Used for API endpoints that require admin access
 */
export async function validateAdminRequest(
  userId: string
): Promise<AdminOperationResult> {
  try {
    const { isAdmin, error } = await checkUserIsAdmin(userId);
    
    if (error) {
      return {
        success: false,
        message: 'Failed to verify admin status',
        error
      };
    }

    if (!isAdmin) {
      // Log unauthorized access attempt
      await logAdminAction('unauthorized_access_attempt', userId);
      
      return {
        success: false,
        message: 'Admin access required',
        error: 'Forbidden'
      };
    }

    return {
      success: true,
      message: 'Admin access verified'
    };
  } catch (error) {
    console.error('[AdminService] Error validating admin request:', error);
    return {
      success: false,
      message: 'Admin validation failed',
      error: String(error)
    };
  }
}

/**
 * Get admin statistics
 */
export async function getAdminStats(): Promise<AdminOperationResult> {
  try {
    const { isAdmin, error: authError } = await getCurrentUserAdminStatus();
    if (!isAdmin) {
      return {
        success: false,
        message: 'Admin access required',
        error: authError || 'Unauthorized'
      };
    }

    // Get total admin count
    const { count: adminCount, error: adminError } = await supabase
      .from('admins')
      .select('*', { count: 'exact', head: true });

    if (adminError) {
      return {
        success: false,
        message: 'Failed to get admin statistics',
        error: adminError.message
      };
    }

    // Get recent admin actions (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { count: recentActions, error: actionsError } = await supabase
      .from('abuse_metrics')
      .select('*', { count: 'exact', head: true })
      .eq('metric_type', 'admin_action')
      .gte('created_at', yesterday.toISOString());

    const stats = {
      total_admins: adminCount || 0,
      recent_actions_24h: recentActions || 0,
      last_updated: new Date().toISOString()
    };

    return {
      success: true,
      message: 'Admin statistics retrieved',
      data: stats
    };
  } catch (error) {
    console.error('[AdminService] Error getting admin stats:', error);
    return {
      success: false,
      message: 'Failed to get admin statistics',
      error: String(error)
    };
  }
}