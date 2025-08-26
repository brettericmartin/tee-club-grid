import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { sendBatchEmailsWithRetry, sendApprovalEmail } from '../../lib/email-batch';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface BulkApproveRequest {
  applicationIds: string[];
  sendEmails?: boolean;
}

interface ApprovalResult {
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

    const { applicationIds, sendEmails = true } = req.body as BulkApproveRequest;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ error: 'Application IDs required' });
    }

    // Check current capacity
    const { data: flags } = await supabase
      .from('feature_flags')
      .select('beta_cap')
      .single();

    const betaCap = flags?.beta_cap || 150;

    // Count current approved users
    const { count: currentApproved } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('beta_access', true)
      .is('deleted_at', null);

    const remainingCapacity = betaCap - (currentApproved || 0);

    if (remainingCapacity < applicationIds.length) {
      return res.status(400).json({ 
        error: `Insufficient capacity. Only ${remainingCapacity} slots available, but trying to approve ${applicationIds.length} applications.`,
        remainingCapacity,
        requestedCount: applicationIds.length
      });
    }

    // Fetch all applications to be approved
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

    const results: ApprovalResult[] = [];
    const approvedEmails: string[] = [];
    const now = new Date().toISOString();

    // Process each application
    for (const app of applications) {
      try {
        // Start transaction-like operation
        // 1. Update waitlist application
        const { error: updateError } = await supabase
          .from('waitlist_applications')
          .update({ 
            status: 'approved',
            approved_at: now,
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
          continue;
        }

        // 2. Check if user profile exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', app.email.toLowerCase())
          .single();

        if (existingProfile) {
          // Update existing profile
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
              beta_access: true,
              updated_at: now
            })
            .eq('id', existingProfile.id);

          if (profileError) {
            // Rollback waitlist update
            await supabase
              .from('waitlist_applications')
              .update({ status: 'pending', approved_at: null })
              .eq('id', app.id);

            results.push({
              id: app.id,
              success: false,
              error: 'Failed to grant beta access',
              email: app.email
            });
            continue;
          }
        }

        approvedEmails.push(app.email);
        results.push({
          id: app.id,
          success: true,
          email: app.email
        });

      } catch (error) {
        results.push({
          id: app.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          email: app.email
        });
      }
    }

    // Send emails in batch with retry logic
    if (sendEmails && approvedEmails.length > 0) {
      const emailResults = await sendBatchEmailsWithRetry(
        approvedEmails,
        sendApprovalEmail,
        {
          batchSize: 10,
          maxRetries: 3,
          retryDelay: 2000
        }
      );
      
      // Log email sending results
      console.log('Email sending results:', {
        sent: emailResults.sent,
        failed: emailResults.failed,
        total: approvedEmails.length
      });
    }

    // Return summary
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return res.status(200).json({
      success: true,
      summary: {
        total: applicationIds.length,
        approved: successCount,
        failed: failureCount,
        emailsSent: sendEmails ? approvedEmails.length : 0
      },
      results,
      remainingCapacity: remainingCapacity - successCount
    });

  } catch (error) {
    console.error('Bulk approve error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}