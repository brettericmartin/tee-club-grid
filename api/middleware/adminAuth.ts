/**
 * Admin Authorization Middleware
 * Ensures only admin users can access protected endpoints
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthenticatedRequest } from './auth';

// Initialize Supabase client with service key for admin operations
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[AdminAuth] Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface AdminAuthenticatedRequest extends AuthenticatedRequest {
  isAdmin: boolean;
}

/**
 * Middleware to verify user is an admin
 * Must be used after withAuth middleware
 */
export function requireAdmin(
  handler: (req: AdminAuthenticatedRequest, res: VercelResponse) => Promise<void>
) {
  return withAuth(async (req: AuthenticatedRequest, res: VercelResponse) => {
    try {
      const userId = req.userId;
      
      if (!userId) {
        console.log('[AdminAuth] No user ID in request');
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }
      
      // Check if user exists in admins table
      const { data: adminRecord, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .single();
      
      if (error || !adminRecord) {
        // Log unauthorized admin access attempt
        console.log(`[AdminAuth] Unauthorized admin access attempt by user: ${userId}`);
        
        // Log to abuse_metrics if table exists
        try {
          await supabase
            .from('abuse_metrics')
            .insert({
              metric_type: 'unauthorized_admin_access',
              identifier: userId,
              endpoint: req.url || 'unknown',
              metadata: {
                user_agent: req.headers['user-agent'],
                ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip']
              }
            });
        } catch (logError) {
          // Ignore logging errors
        }
        
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }
      
      // User is admin, proceed with request
      const adminReq = req as AdminAuthenticatedRequest;
      adminReq.isAdmin = true;
      
      console.log(`[AdminAuth] Admin ${userId} accessing ${req.method} ${req.url}`);
      
      return handler(adminReq, res);
    } catch (error) {
      console.error('[AdminAuth] Middleware error:', error);
      return res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Admin verification failed'
      });
    }
  });
}

/**
 * Check if a user is an admin (for conditional logic)
 * Does not block the request
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .single();
    
    return !error && !!data;
  } catch (error) {
    console.error('[AdminAuth] Error checking admin status:', error);
    return false;
  }
}

/**
 * Get list of all admins (admin only)
 */
export async function getAdminList(): Promise<Array<{ user_id: string; created_at: string; notes: string | null }>> {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('user_id, created_at, notes')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('[AdminAuth] Error fetching admin list:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('[AdminAuth] Error in getAdminList:', error);
    return [];
  }
}