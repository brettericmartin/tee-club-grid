import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest } from '../middleware/auth';

/**
 * Debug endpoint to verify API configuration
 * Only accessible to authenticated users
 */
async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method Not Allowed',
      message: 'Only GET requests are allowed' 
    });
  }

  // Check environment variables (without exposing sensitive values)
  const config = {
    timestamp: new Date().toISOString(),
    node_version: process.version,
    user_id: req.userId,
    environment: {
      openai_configured: !!process.env.OPENAI_API_KEY,
      supabase_url_configured: !!process.env.SUPABASE_URL,
      vite_supabase_url_configured: !!process.env.VITE_SUPABASE_URL,
      supabase_service_key_configured: !!process.env.SUPABASE_SERVICE_KEY,
      supabase_service_role_key_configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      // Show partial values for debugging (first few chars only)
      supabase_url_prefix: process.env.SUPABASE_URL?.substring(0, 20) || process.env.VITE_SUPABASE_URL?.substring(0, 20) || 'not set',
      openai_key_prefix: process.env.OPENAI_API_KEY ? 'sk-...' + process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4) : 'not set'
    },
    headers: {
      authorization: req.headers.authorization ? 'Bearer ...' : 'not set',
      content_type: req.headers['content-type'] || 'not set'
    }
  };

  return res.status(200).json(config);
}

// Export with authentication
export default withAuth(handler);