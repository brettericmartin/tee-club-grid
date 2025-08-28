/**
 * Simplified Admin Authorization Middleware
 * Simple check for is_admin flag in profiles table
 * No complex RLS - just application-level protection
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthenticatedRequest } from './auth';

// Initialize Supabase client with service key
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
 * Simple admin check middleware - no complex RLS
 * Just checks the is_admin flag in profiles table
 */
export function requireAdmin(
  handler: (req: AdminAuthenticatedRequest, res: VercelResponse) => Promise<VercelResponse | void>
) {
  return withAuth(async (req: AuthenticatedRequest, res: VercelResponse) => {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }
    
    // Simple admin check - just look at the flag
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    
    if (error || !profile?.is_admin) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }
    
    // User is admin, proceed
    const adminReq = req as AdminAuthenticatedRequest;
    adminReq.isAdmin = true;
    
    return handler(adminReq, res);
  });
}

/**
 * Simple helper to check if a user is an admin
 * For use in conditional logic, not security
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();
  
  return data?.is_admin === true;
}