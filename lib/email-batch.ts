/**
 * Enhanced batch email sending with retry logic
 */

import { sendEmail, EmailOptions, EmailResult } from './email';
import { renderEmailTemplate } from './email-templates';

export interface BatchEmailOptions {
  emails: string[];
  templateName: string;
  templateData?: Record<string, any>;
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface BatchEmailResult {
  sent: number;
  failed: number;
  results: Array<{
    email: string;
    success: boolean;
    error?: string;
    retries?: number;
  }>;
}

/**
 * Send approval emails to multiple recipients with retry logic
 */
export async function sendApprovalEmail(email: string): Promise<EmailResult> {
  try {
    const template = await renderEmailTemplate('waitlist-approved', {
      email,
      loginUrl: `${process.env.VITE_PUBLIC_URL || 'https://teed.club'}/login`,
      supportEmail: 'support@teed.club'
    });

    return await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: [
        { name: 'type', value: 'waitlist-approval' },
        { name: 'batch', value: 'true' }
      ]
    });
  } catch (error) {
    console.error(`[Email] Failed to send approval to ${email}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send approval email'
    };
  }
}

/**
 * Send rejection emails to multiple recipients
 */
export async function sendRejectionEmail(email: string, reason?: string): Promise<EmailResult> {
  try {
    const template = await renderEmailTemplate('waitlist-rejected', {
      email,
      reason: reason || 'Unfortunately, we are unable to offer you beta access at this time.',
      waitlistUrl: `${process.env.VITE_PUBLIC_URL || 'https://teed.club'}/waitlist`,
      supportEmail: 'support@teed.club'
    });

    return await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: [
        { name: 'type', value: 'waitlist-rejection' },
        { name: 'batch', value: 'true' }
      ]
    });
  } catch (error) {
    console.error(`[Email] Failed to send rejection to ${email}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send rejection email'
    };
  }
}

/**
 * Send emails in batch with retry logic
 */
export async function sendBatchEmailsWithRetry(
  emails: string[],
  emailGenerator: (email: string) => Promise<EmailResult>,
  options: {
    batchSize?: number;
    maxRetries?: number;
    retryDelay?: number;
    onProgress?: (sent: number, total: number) => void;
  } = {}
): Promise<BatchEmailResult> {
  const {
    batchSize = 10,
    maxRetries = 3,
    retryDelay = 1000,
    onProgress
  } = options;

  const results: BatchEmailResult['results'] = [];
  let sentCount = 0;
  let failedCount = 0;

  // Process emails in batches
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    
    // Process each email in the batch
    await Promise.all(
      batch.map(async (email) => {
        let retries = 0;
        let success = false;
        let lastError: string | undefined;

        // Retry logic
        while (retries <= maxRetries && !success) {
          try {
            const result = await emailGenerator(email);
            
            if (result.success) {
              success = true;
              sentCount++;
              results.push({
                email,
                success: true,
                retries: retries > 0 ? retries : undefined
              });
            } else {
              lastError = result.error;
              retries++;
              
              // Wait before retry with exponential backoff
              if (retries <= maxRetries) {
                await new Promise(resolve => 
                  setTimeout(resolve, retryDelay * Math.pow(2, retries - 1))
                );
              }
            }
          } catch (error) {
            lastError = error instanceof Error ? error.message : 'Unknown error';
            retries++;
            
            // Wait before retry
            if (retries <= maxRetries) {
              await new Promise(resolve => 
                setTimeout(resolve, retryDelay * Math.pow(2, retries - 1))
              );
            }
          }
        }

        // If still failed after all retries
        if (!success) {
          failedCount++;
          results.push({
            email,
            success: false,
            error: lastError || 'Failed after maximum retries',
            retries: maxRetries
          });
        }

        // Report progress
        if (onProgress) {
          onProgress(sentCount + failedCount, emails.length);
        }
      })
    );

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return {
    sent: sentCount,
    failed: failedCount,
    results
  };
}

/**
 * Send custom email campaign to multiple recipients
 */
export async function sendCustomCampaign(
  emails: string[],
  subject: string,
  htmlContent: string,
  options: {
    batchSize?: number;
    maxRetries?: number;
    tags?: Array<{ name: string; value: string }>;
  } = {}
): Promise<BatchEmailResult> {
  const emailGenerator = async (email: string) => {
    return await sendEmail({
      to: email,
      subject,
      html: htmlContent,
      tags: options.tags || [{ name: 'type', value: 'custom-campaign' }]
    });
  };

  return await sendBatchEmailsWithRetry(emails, emailGenerator, {
    batchSize: options.batchSize,
    maxRetries: options.maxRetries
  });
}

/**
 * Process wave approvals with email notifications
 */
export async function processWaveApprovals(
  emails: string[],
  options: {
    waveName?: string;
    batchSize?: number;
    onProgress?: (sent: number, total: number) => void;
  } = {}
): Promise<BatchEmailResult> {
  console.log(`[Email] Processing wave approval for ${emails.length} recipients`);
  
  const startTime = Date.now();
  
  const result = await sendBatchEmailsWithRetry(
    emails,
    sendApprovalEmail,
    {
      batchSize: options.batchSize || 10,
      maxRetries: 3,
      retryDelay: 2000,
      onProgress: options.onProgress
    }
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log(`[Email] Wave approval complete:`, {
    waveName: options.waveName,
    sent: result.sent,
    failed: result.failed,
    duration: `${duration}s`,
    averageTime: `${(parseFloat(duration) / emails.length).toFixed(2)}s per email`
  });

  // Log failures for debugging
  if (result.failed > 0) {
    const failures = result.results.filter(r => !r.success);
    console.error('[Email] Failed recipients:', failures);
  }

  return result;
}

/**
 * Send notification emails with priority queueing
 */
export async function sendPriorityNotifications(
  notifications: Array<{
    email: string;
    priority: 'high' | 'medium' | 'low';
    subject: string;
    content: string;
  }>
): Promise<BatchEmailResult> {
  // Sort by priority
  const sorted = notifications.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const results: BatchEmailResult['results'] = [];
  let sentCount = 0;
  let failedCount = 0;

  for (const notification of sorted) {
    const result = await sendEmail({
      to: notification.email,
      subject: notification.subject,
      html: notification.content,
      tags: [
        { name: 'type', value: 'notification' },
        { name: 'priority', value: notification.priority }
      ]
    });

    if (result.success) {
      sentCount++;
    } else {
      failedCount++;
    }

    results.push({
      email: notification.email,
      success: result.success,
      error: result.error
    });

    // Rate limiting based on priority
    const delay = notification.priority === 'high' ? 100 : 
                  notification.priority === 'medium' ? 500 : 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  return {
    sent: sentCount,
    failed: failedCount,
    results
  };
}