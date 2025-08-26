import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface BulkRejectRequest {
  applicationIds: string[];
  reason?: string;
}

interface RejectionResult {
  id: string;
  success: boolean;
  error?: string;
  email?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check admin status
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminData) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { applicationIds, reason } = req.body as BulkRejectRequest;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ error: 'Application IDs required' });
    }

    // Fetch all applications to be rejected
    const { data: applications, error: fetchError } = await supabase
      .from('waitlist_applications')
      .select('*')
      .in('id', applicationIds)
      .eq('status', 'pending');

    if (fetchError) {
      return res.status(500).json({ error: 'Failed to fetch applications' });
    }

    if (!applications || applications.length === 0) {
      return res.status(400).json({ error: 'No valid pending applications found' });
    }

    const results: RejectionResult[] = [];
    const now = new Date().toISOString();

    // Process each application
    for (const app of applications) {
      try {
        const { error: updateError } = await supabase
          .from('waitlist_applications')
          .update({ 
            status: 'rejected',
            rejection_reason: reason,
            updated_at: now
          })
          .eq('id', app.id);

        if (updateError) {
          results.push({
            id: app.id,
            success: false,
            error: 'Failed to update application status',
            email: app.email
          });
        } else {
          results.push({
            id: app.id,
            success: true,
            email: app.email
          });
        }
      } catch (error) {
        results.push({
          id: app.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          email: app.email
        });
      }
    }

    // Return summary
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return res.status(200).json({
      success: true,
      summary: {
        total: applicationIds.length,
        rejected: successCount,
        failed: failureCount
      },
      results
    });

  } catch (error) {
    console.error('Bulk reject error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}