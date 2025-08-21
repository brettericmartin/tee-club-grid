/**
 * Email Service for Teed.club
 * Handles email notifications for waitlist and beta access
 */

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface WaitlistEmailData {
  email: string;
  displayName: string;
  score?: number;
  position?: number;
  inviteCode?: string;
}

interface InvitePackData {
  email: string;
  displayName: string;
  inviteCodes: string[];
}

/**
 * Send an email (stub - implement with your preferred service)
 * Options: SendGrid, Resend, AWS SES, Postmark, etc.
 */
async function sendEmail(data: EmailData): Promise<boolean> {
  try {
    // In production, implement with your email service
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send(data);

    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send(data);

    // For now, log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Email Service] Would send email:', {
        to: data.to,
        subject: data.subject,
        preview: data.text?.substring(0, 100) + '...'
      });
    }

    // TODO: Implement actual email sending
    return true;
  } catch (error) {
    console.error('[Email Service] Error sending email:', error);
    return false;
  }
}

/**
 * Email Templates
 */
export const EmailTemplates = {
  /**
   * Waitlist Pending Email
   */
  waitlistPending: (data: WaitlistEmailData) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on the Founders' List</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #10B981;
      text-decoration: none;
    }
    h1 {
      color: #111;
      font-size: 28px;
      margin: 20px 0;
    }
    .badge {
      display: inline-block;
      background: #10B981;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      margin: 20px 0;
    }
    .score-box {
      background: #f9f9f9;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }
    .score {
      font-size: 48px;
      font-weight: bold;
      color: #10B981;
    }
    .cta-button {
      display: inline-block;
      background: #10B981;
      color: white;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
    .social-links {
      margin: 20px 0;
    }
    .social-links a {
      margin: 0 10px;
      color: #10B981;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="https://teed.club" class="logo">⛳ Teed.club</a>
      <h1>You're on the Founders' List!</h1>
      <div class="badge">Waitlist #${data.position || 'TBD'}</div>
    </div>

    <p>Hey ${data.displayName},</p>

    <p>Thanks for joining the Teed.club waitlist! You're now part of an exclusive group of golf enthusiasts who will shape the future of equipment discovery and sharing.</p>

    ${data.score ? `
    <div class="score-box">
      <div>Your Application Score</div>
      <div class="score">${data.score}/10</div>
      <div style="font-size: 14px; color: #666;">Higher scores get priority access</div>
    </div>
    ` : ''}

    <h2 style="color: #111; font-size: 20px;">Move Up the List 🚀</h2>
    
    <p>Want to skip ahead? Here's how:</p>
    <ul>
      <li><strong>Get an invite code</strong> from a current member for instant access</li>
      <li><strong>Share your referral link</strong> to earn priority points</li>
      <li><strong>Follow us on social</strong> for exclusive early access drops</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://teed.club/waitlist" class="cta-button">Check Your Status</a>
    </div>

    <p>We're approving new members daily based on engagement potential and community fit. You'll be the first to know when your spot opens up!</p>

    <p>In the meantime, start thinking about your dream bag setup. You'll be showcasing it soon!</p>

    <p>Cheers,<br>
    The Teed.club Team</p>

    <div class="footer">
      <div class="social-links">
        <a href="https://twitter.com/teedclub">Twitter</a>
        <a href="https://instagram.com/teedclub">Instagram</a>
        <a href="https://reddit.com/r/teedclub">Reddit</a>
      </div>
      <p>© 2024 Teed.club - Your golf bag IS your social profile</p>
      <p style="font-size: 12px;">
        You're receiving this because you joined our waitlist.<br>
        <a href="https://teed.club/unsubscribe" style="color: #666;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
You're on the Founders' List!

Hey ${data.displayName},

Thanks for joining the Teed.club waitlist! You're now part of an exclusive group of golf enthusiasts who will shape the future of equipment discovery and sharing.

${data.score ? `Your Application Score: ${data.score}/10` : ''}
${data.position ? `Waitlist Position: #${data.position}` : ''}

Move Up the List:
- Get an invite code from a current member for instant access
- Share your referral link to earn priority points
- Follow us on social for exclusive early access drops

Check your status: https://teed.club/waitlist

We're approving new members daily. You'll be the first to know when your spot opens up!

Cheers,
The Teed.club Team
    `;

    return { html, text };
  },

  /**
   * Waitlist Approved Email
   */
  waitlistApproved: (data: WaitlistEmailData) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Teed.club Beta!</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .celebration {
      font-size: 48px;
      margin: 20px 0;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #10B981;
      text-decoration: none;
    }
    h1 {
      color: #111;
      font-size: 28px;
      margin: 20px 0;
    }
    .badge {
      display: inline-block;
      background: linear-gradient(135deg, #10B981, #059669);
      color: white;
      padding: 12px 24px;
      border-radius: 24px;
      font-size: 16px;
      font-weight: 600;
      margin: 20px 0;
    }
    .benefits {
      background: #f0fdf4;
      border-left: 4px solid #10B981;
      padding: 20px;
      margin: 30px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #10B981, #059669);
      color: white;
      padding: 16px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 18px;
      margin: 20px 0;
      box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);
    }
    .step {
      display: flex;
      align-items: start;
      margin: 20px 0;
    }
    .step-number {
      background: #10B981;
      color: white;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 15px;
      flex-shrink: 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="celebration">🎉</div>
      <a href="https://teed.club" class="logo">⛳ Teed.club</a>
      <h1>Welcome to the Founders' Beta!</h1>
      <div class="badge">🏆 Founding Member</div>
    </div>

    <p>Hey ${data.displayName},</p>

    <p><strong>Congratulations!</strong> You've been approved for Teed.club beta access. You're now part of an exclusive group of founding members who will shape the future of golf equipment sharing.</p>

    <div class="benefits">
      <h3 style="margin-top: 0;">Your Beta Access Includes:</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li>Full platform access to all features</li>
        <li>Founding Member badge on your profile forever</li>
        <li><strong>3 invite codes</strong> to share with friends</li>
        <li>Direct line to the team for feedback</li>
        <li>Early access to new features</li>
      </ul>
    </div>

    <h2 style="color: #111; font-size: 20px;">Get Started in 3 Steps:</h2>

    <div class="step">
      <div class="step-number">1</div>
      <div>
        <strong>Build Your Bag</strong><br>
        Add your current golf equipment and showcase your setup
      </div>
    </div>

    <div class="step">
      <div class="step-number">2</div>
      <div>
        <strong>Explore & Connect</strong><br>
        Discover equipment setups from other players
      </div>
    </div>

    <div class="step">
      <div class="step-number">3</div>
      <div>
        <strong>Share & Earn</strong><br>
        Post your gear photos and earn rewards
      </div>
    </div>

    <div style="text-align: center; margin: 40px 0;">
      <a href="https://teed.club/my-bag" class="cta-button">Start Building Your Bag →</a>
    </div>

    <p><strong>Pro tip:</strong> Complete your bag setup in the next 24 hours to earn the "Early Bird" badge!</p>

    <p>We're thrilled to have you as part of our founding community. Your feedback and participation will directly influence how Teed.club evolves.</p>

    <p>Welcome aboard!<br>
    The Teed.club Team</p>

    <div class="footer">
      <p>Need help? Reply to this email or visit our <a href="https://teed.club/help" style="color: #10B981;">Help Center</a></p>
      <p>© 2024 Teed.club - Your golf bag IS your social profile</p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Welcome to the Founders' Beta! 🎉

Hey ${data.displayName},

Congratulations! You've been approved for Teed.club beta access. You're now part of an exclusive group of founding members who will shape the future of golf equipment sharing.

Your Beta Access Includes:
• Full platform access to all features
• Founding Member badge on your profile forever
• 3 invite codes to share with friends
• Direct line to the team for feedback
• Early access to new features

Get Started:
1. Build Your Bag - Add your current golf equipment
2. Explore & Connect - Discover setups from other players
3. Share & Earn - Post your gear photos and earn rewards

Start Building Your Bag: https://teed.club/my-bag

Pro tip: Complete your bag setup in the next 24 hours to earn the "Early Bird" badge!

Welcome aboard!
The Teed.club Team
    `;

    return { html, text };
  },

  /**
   * Invite Pack Email (when user receives invite codes)
   */
  invitePack: (data: InvitePackData) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Teed.club Invite Codes</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #10B981;
      text-decoration: none;
    }
    .invite-code {
      background: linear-gradient(135deg, #f0fdf4, #dcfce7);
      border: 2px solid #10B981;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }
    .code {
      font-family: 'Courier New', monospace;
      font-size: 24px;
      font-weight: bold;
      color: #059669;
      letter-spacing: 2px;
    }
    .share-button {
      display: inline-block;
      background: #10B981;
      color: white;
      padding: 10px 20px;
      border-radius: 6px;
      text-decoration: none;
      font-size: 14px;
      margin-top: 10px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="https://teed.club" class="logo">⛳ Teed.club</a>
      <h1 style="color: #111; font-size: 28px;">Your Exclusive Invite Codes</h1>
    </div>

    <p>Hey ${data.displayName},</p>

    <p>As a Founding Member, you have <strong>3 exclusive invite codes</strong> to share with your golf buddies. Each code grants instant beta access - no waitlist!</p>

    ${data.inviteCodes.map((code, i) => `
    <div class="invite-code">
      <div style="font-size: 14px; color: #666; margin-bottom: 10px;">Invite Code #${i + 1}</div>
      <div class="code">${code}</div>
      <a href="https://teed.club/waitlist?code=${code}" class="share-button">Share This Code</a>
    </div>
    `).join('')}

    <h3 style="color: #111;">How to Share:</h3>
    <ol>
      <li>Send the code directly to a friend</li>
      <li>They enter it on the waitlist page for instant approval</li>
      <li>Or share the direct link above</li>
    </ol>

    <p style="background: #fef3c7; padding: 15px; border-radius: 8px;">
      <strong>⚡ Limited time:</strong> These codes expire in 30 days. Share them with golfers who will love Teed.club!
    </p>

    <p>Choose wisely - your invites help build our community!</p>

    <p>Cheers,<br>
    The Teed.club Team</p>

    <div class="footer">
      <p>© 2024 Teed.club - Your golf bag IS your social profile</p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Your Exclusive Invite Codes

Hey ${data.displayName},

As a Founding Member, you have 3 exclusive invite codes to share with your golf buddies. Each code grants instant beta access - no waitlist!

Your Invite Codes:
${data.inviteCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

How to Share:
1. Send the code directly to a friend
2. They enter it on the waitlist page for instant approval
3. Or share this link: https://teed.club/waitlist?code=CODE

Limited time: These codes expire in 30 days. Share them with golfers who will love Teed.club!

Cheers,
The Teed.club Team
    `;

    return { html, text };
  }
};

/**
 * Send waitlist pending email
 */
export async function sendWaitlistPendingEmail(data: WaitlistEmailData): Promise<boolean> {
  const { html, text } = EmailTemplates.waitlistPending(data);
  return sendEmail({
    to: data.email,
    subject: "You're on the Teed.club Founders' List 🏌️",
    html,
    text
  });
}

/**
 * Send waitlist approved email
 */
export async function sendWaitlistApprovedEmail(data: WaitlistEmailData): Promise<boolean> {
  const { html, text } = EmailTemplates.waitlistApproved(data);
  return sendEmail({
    to: data.email,
    subject: "🎉 Welcome to Teed.club Beta - Start Building Your Bag!",
    html,
    text
  });
}

/**
 * Send invite pack email
 */
export async function sendInvitePackEmail(data: InvitePackData): Promise<boolean> {
  const { html, text } = EmailTemplates.invitePack(data);
  return sendEmail({
    to: data.email,
    subject: "Your Teed.club Invite Codes Are Here ⛳",
    html,
    text
  });
}