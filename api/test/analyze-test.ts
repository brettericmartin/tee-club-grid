import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Test endpoint to verify API routing and environment variables
 * GET /api/test/analyze-test
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[analyze-test] Test endpoint called:', {
    method: req.method,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });

  const config = {
    timestamp: new Date().toISOString(),
    method: req.method,
    environment: {
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasViteSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
      nodeVersion: process.version
    },
    message: 'Test endpoint is working'
  };

  return res.status(200).json(config);
}