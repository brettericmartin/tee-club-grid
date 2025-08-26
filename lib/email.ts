/**
 * Email Service Adapter
 * Handles email sending with Resend provider
 */

import { Resend } from 'resend';
import { convert } from 'html-to-text';
import type { CreateEmailOptions } from 'resend/build/src/emails/interfaces';

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Email configuration
const EMAIL_CONFIG = {
  from: process.env.RESEND_FROM_EMAIL || 'hello@teed.club',
  fromName: process.env.RESEND_FROM_NAME || 'Teed.club',
  replyTo: process.env.RESEND_REPLY_TO || 'support@teed.club',
  enabled: process.env.EMAIL_ENABLED !== 'false',
  devMode: process.env.EMAIL_DEV_MODE === 'true' || process.env.NODE_ENV === 'development',
  testRecipient: process.env.EMAIL_TEST_RECIPIENT || 'dev@example.com'
};

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  headers?: Record<string, string>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Convert HTML to plain text for email fallback
 */
export function htmlToText(html: string): string {
  return convert(html, {
    wordwrap: 130,
    selectors: [
      { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
      { selector: 'img', format: 'skip' },
      { selector: 'style', format: 'skip' }
    ]
  });
}

/**
 * Generate a referral link for a user
 */
export function generateReferralLink(referralCode: string): string {
  const baseUrl = process.env.VITE_PUBLIC_URL || 'https://teed.club';
  return `${baseUrl}/waitlist?ref=${referralCode}`;
}

/**
 * Format queue position with ordinal suffix
 */
export function formatQueuePosition(position: number): string {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const v = position % 100;
  return `${position}${suffix[(v - 20) % 10] || suffix[v] || suffix[0]}`;
}

/**
 * Estimate wait time based on queue position
 */
export function estimateWaitTime(position: number, dailyApprovals: number = 10): string {
  const days = Math.ceil(position / dailyApprovals);
  
  if (days <= 1) return 'within 24 hours';
  if (days <= 3) return '2-3 days';
  if (days <= 7) return 'this week';
  if (days <= 14) return 'next week';
  if (days <= 30) return 'within a month';
  
  return `${Math.ceil(days / 7)} weeks`;
}

/**
 * Send an email using the configured provider
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    // Check if email is enabled
    if (!EMAIL_CONFIG.enabled) {
      console.log('[Email] Email sending is disabled');
      return { success: true, id: 'disabled' };
    }

    // Generate text version if not provided
    if (!options.text && options.html) {
      options.text = htmlToText(options.html);
    }

    // Format from address
    const from = options.from || `${EMAIL_CONFIG.fromName} <${EMAIL_CONFIG.from}>`;

    // Override recipient in dev mode
    const recipients = EMAIL_CONFIG.devMode 
      ? EMAIL_CONFIG.testRecipient 
      : options.to;

    // Log in dev mode
    if (EMAIL_CONFIG.devMode) {
      console.log('[Email] Dev mode - would send to:', options.to);
      console.log('[Email] Subject:', options.subject);
      console.log('[Email] Preview:', options.text?.substring(0, 200) + '...');
      
      // In dev without Resend key, just log and return success
      if (!resend) {
        return { success: true, id: 'dev-mode' };
      }
    }

    // Check if Resend is configured
    if (!resend) {
      console.error('[Email] Resend API key not configured');
      return { 
        success: false, 
        error: 'Email service not configured. Please set RESEND_API_KEY.' 
      };
    }

    // Prepare Resend options
    const resendOptions: CreateEmailOptions = {
      from,
      to: Array.isArray(recipients) ? recipients : [recipients],
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo || EMAIL_CONFIG.replyTo,
      tags: options.tags,
      headers: {
        'X-Entity-Ref-ID': crypto.randomUUID(),
        ...options.headers
      }
    };

    // Send email via Resend
    const { data, error } = await resend.emails.send(resendOptions);

    if (error) {
      console.error('[Email] Send error:', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Sent successfully:', data?.id);
    return { success: true, id: data?.id };

  } catch (error) {
    console.error('[Email] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    };
  }
}

/**
 * Send a batch of emails
 */
export async function sendBatch(emails: EmailOptions[]): Promise<EmailResult[]> {
  if (!resend) {
    console.error('[Email] Resend not configured for batch sending');
    return emails.map(() => ({ success: false, error: 'Email service not configured' }));
  }

  try {
    // Resend batch API has a limit of 100 emails per batch
    const batches = [];
    for (let i = 0; i < emails.length; i += 100) {
      batches.push(emails.slice(i, i + 100));
    }

    const results: EmailResult[] = [];
    
    for (const batch of batches) {
      const batchData = batch.map(email => ({
        from: `${EMAIL_CONFIG.fromName} <${EMAIL_CONFIG.from}>`,
        to: Array.isArray(email.to) ? email.to : [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text || htmlToText(email.html),
        reply_to: email.replyTo || EMAIL_CONFIG.replyTo
      }));

      const { data, error } = await resend.batch.send(batchData);
      
      if (error) {
        // If batch fails, mark all as failed
        batch.forEach(() => results.push({ success: false, error: error.message }));
      } else {
        // Add results for each email
        data?.data?.forEach((result: any) => {
          results.push({ success: true, id: result.id });
        });
      }
    }

    return results;
  } catch (error) {
    console.error('[Email] Batch send error:', error);
    return emails.map(() => ({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Batch send failed' 
    }));
  }
}

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Sanitize email for safe display
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}