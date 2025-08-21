# Email & Analytics Setup Guide

## 📊 Analytics Events

The following analytics events are automatically tracked:

### Waitlist Events
- `waitlist_view` - When someone views the waitlist page
- `waitlist_submit` - When a waitlist form is submitted
- `waitlist_approved` - When an application is approved
- `waitlist_pending` - When an application is pending
- `invite_redeemed` - When an invite code is redeemed
- `beta_summary_view` - When the beta capacity summary is viewed

### Event Properties
Each event includes relevant properties like:
- Score, role, location for submissions
- Success/failure status for redemptions
- Capacity metrics for beta summary
- Timestamps for all events

### Analytics Platforms Supported
- **Vercel Analytics** (automatically included)
- **Google Analytics 4** (add gtag to index.html)
- **PostHog** (uncomment in src/utils/analytics.ts)

## 📧 Email Templates

Three email templates are implemented:

### 1. Waitlist Pending Email
- Subject: "You're on the Teed.club Founders' List 🏌️"
- Sent when user joins waitlist
- Includes application score and tips to move up

### 2. Waitlist Approved Email  
- Subject: "🎉 Welcome to Teed.club Beta - Start Building Your Bag!"
- Sent when application is approved
- Includes onboarding steps and beta benefits

### 3. Invite Pack Email
- Subject: "Your Teed.club Invite Codes Are Here ⛳"
- Sent when user receives invite codes
- Contains 3 exclusive invite codes to share

## 🔧 Email Service Integration

### Quick Setup with Popular Services

#### Option 1: Resend (Recommended for simplicity)
```bash
npm install resend
```

```typescript
// In src/services/emailService.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(data: EmailData): Promise<boolean> {
  try {
    await resend.emails.send({
      from: 'Teed.club <hello@teed.club>',
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text
    });
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}
```

#### Option 2: SendGrid
```bash
npm install @sendgrid/mail
```

```typescript
// In src/services/emailService.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(data: EmailData): Promise<boolean> {
  try {
    await sgMail.send({
      from: 'hello@teed.club',
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text
    });
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}
```

#### Option 3: AWS SES
```bash
npm install @aws-sdk/client-ses
```

```typescript
// In src/services/emailService.ts
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const client = new SESClient({ 
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function sendEmail(data: EmailData): Promise<boolean> {
  try {
    await client.send(new SendEmailCommand({
      Source: 'hello@teed.club',
      Destination: { ToAddresses: [data.to] },
      Message: {
        Subject: { Data: data.subject },
        Body: {
          Html: { Data: data.html },
          Text: { Data: data.text }
        }
      }
    }));
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}
```

## 📝 Environment Variables

Add to your `.env` file:

```env
# Email Service (choose one)
RESEND_API_KEY=re_xxxxxxxxxxxxx
# OR
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
# OR
AWS_ACCESS_KEY_ID=xxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxx
AWS_REGION=us-east-1

# Email Settings
FROM_EMAIL=hello@teed.club
REPLY_TO_EMAIL=support@teed.club
```

## 🧪 Testing Email Templates

Preview the email templates locally:

```bash
node scripts/test-email-templates.js
```

This will generate HTML files in `email-previews/` directory that you can open in your browser.

## 📈 Analytics Setup

### Google Analytics 4
1. Get your GA4 Measurement ID (G-XXXXXXXXXX)
2. Add to your index.html:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### PostHog
1. Install PostHog:
```bash
npm install posthog-js
```

2. Update `src/utils/analytics.ts`:
```typescript
import posthog from 'posthog-js';

// Initialize (add to your app initialization)
posthog.init('YOUR_API_KEY', {
  api_host: 'https://app.posthog.com'
});

// In trackEvent function, uncomment:
if (typeof posthog !== 'undefined') {
  posthog.capture(eventName, properties);
}
```

## 🚀 Current Implementation Status

✅ **Implemented:**
- All analytics events tracking
- Email templates (HTML + text versions)
- Stub email sending function
- Integration with waitlist submission flow
- Integration with approval flow
- Automatic invite code generation and distribution

⏳ **Requires Setup:**
- Choose and configure email service
- Add environment variables
- Test email delivery
- Optional: Add GA4 or PostHog

## 📊 Analytics Dashboard Ideas

Track these key metrics:
- Waitlist conversion rate (views → submissions)
- Approval rate by score
- Invite code redemption rate
- Geographic distribution
- Role distribution
- Average application score
- Time to approval

## 🔒 Security Notes

- Email addresses are hashed in analytics for privacy
- Never log sensitive information
- Use environment variables for API keys
- Implement rate limiting for email sending
- Consider email verification for waitlist submissions