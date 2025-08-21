import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { withAuth, AuthenticatedRequest } from '../../lib/middleware/auth';
import { strictRateLimit } from '../../lib/middleware/rateLimit';
import { analyzeGolfBagImage, validateEquipmentData } from '../../lib/utils/openai';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * POST /api/equipment/analyze-image
 * Analyzes a golf bag image using OpenAI Vision API
 * 
 * Request body:
 * {
 *   image: string (base64 encoded image),
 *   mimeType: string (optional, defaults to 'image/jpeg')
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   analysis: EquipmentAnalysisResult,
 *   usage?: { requestsRemaining: number, resetTime: number }
 * }
 */
async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  console.log('[analyze-image] Request received:', {
    method: req.method,
    hasAuth: !!req.headers.authorization,
    userId: req.userId,
    bodySize: JSON.stringify(req.body || {}).length
  });

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('[analyze-image] Rejecting non-POST request');
    return res.status(405).json({ 
      error: 'Method Not Allowed',
      message: 'Only POST requests are allowed' 
    });
  }

  try {
    // Validate request body
    const { image, mimeType = 'image/jpeg' } = req.body;

    if (!image) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Image data is required'
      });
    }

    // Validate image size (base64 is ~1.37x larger than binary)
    const estimatedSize = (image.length * 3) / 4;
    if (estimatedSize > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Image too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
      });
    }

    // Validate mime type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(mimeType)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid image type. Allowed types: JPEG, PNG, WebP'
      });
    }

    console.log(`Analyzing image for user ${req.userId}`);

    // Check if configuration is properly set
    if (!process.env.OPENAI_API_KEY) {
      console.error('Missing OpenAI API key in environment');
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'AI service is not properly configured. Please contact support.'
      });
    }

    // Analyze the image with OpenAI
    const analysis = await analyzeGolfBagImage(image, mimeType);

    // Validate and enhance the results with our database
    const enhancedAnalysis = await validateEquipmentData(analysis, supabase);

    // Log the analysis for tracking
    supabase
      .from('ai_analysis_logs')
      .insert({
        user_id: req.userId,
        analysis_type: 'golf_bag_image',
        clubs_detected: enhancedAnalysis.clubs.length,
        confidence_score: enhancedAnalysis.overallConfidence,
        created_at: new Date().toISOString()
      })
      .then(() => console.log('Analysis logged successfully'))
      .catch((err: any) => console.error('Failed to log analysis:', err));

    // Get rate limit info from headers
    const rateLimitInfo = {
      requestsRemaining: parseInt(res.getHeader('X-RateLimit-Remaining') as string || '0'),
      resetTime: parseInt(res.getHeader('X-RateLimit-Reset') as string || '0')
    };

    return res.status(200).json({
      success: true,
      analysis: enhancedAnalysis,
      usage: rateLimitInfo
    });

  } catch (error) {
    console.error('[analyze-image] Error occurred:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Always return JSON error responses
    res.setHeader('Content-Type', 'application/json');
    
    // Check if it's an OpenAI API error
    if (error instanceof Error) {
      if (error.message.includes('OpenAI') || error.message.includes('Failed to analyze')) {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'AI analysis service is temporarily unavailable. Please try again later.',
          details: error.message
        });
      }
      
      if (error.message.includes('parse') || error.message.includes('JSON')) {
        return res.status(502).json({
          error: 'Bad Gateway',
          message: 'AI service returned invalid response format. This may be due to the AI model change.',
          details: error.message,
          suggestion: 'Please try again or contact support if the issue persists.'
        });
      }
    }

    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to analyze image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Export the handler with authentication and rate limiting
export default strictRateLimit(withAuth(handler));
