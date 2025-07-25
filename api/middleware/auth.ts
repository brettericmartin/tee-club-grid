import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service key for server-side operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface AuthenticatedRequest extends VercelRequest {
  userId?: string;
  user?: any;
}

/**
 * Middleware to verify Supabase JWT tokens
 * Extracts and validates the JWT from the Authorization header
 */
export async function withAuth(
  handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: AuthenticatedRequest, res: VercelResponse) => {
    try {
      // Extract the JWT token from the Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Missing or invalid authorization header' 
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify the JWT token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Invalid or expired token' 
        });
      }

      // Attach user information to the request
      req.userId = user.id;
      req.user = user;

      // Continue to the handler
      return handler(req, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'Authentication failed' 
      });
    }
  };
}

/**
 * Optional: Verify if user has specific permissions
 */
export function requirePermission(permission: string) {
  return (handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<void>) => {
    return withAuth(async (req: AuthenticatedRequest, res: VercelResponse) => {
      // Add permission checking logic here if needed
      // For now, just pass through if authenticated
      return handler(req, res);
    });
  };
}