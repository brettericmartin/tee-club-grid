/**
 * Test email templates
 * Run with: node scripts/test-email-templates.js
 * 
 * This script demonstrates the email templates without actually sending them.
 * In production, you would integrate with your preferred email service.
 */

import { EmailTemplates } from '../src/services/emailService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test data
const testUser = {
  email: 'golfer@example.com',
  displayName: 'Tiger Woods',
  score: 8,
  position: 42,
  inviteCode: 'GOLF2024'
};

const testInviteCodes = ['ABC1-2345', 'DEF6-7890', 'GHI3-4567'];

console.log('🎨 Generating email templates...\n');

// 1. Waitlist Pending Email
console.log('1️⃣ Generating Waitlist Pending Email...');
const pendingEmail = EmailTemplates.waitlistPending(testUser);
const pendingPath = path.join(__dirname, '../email-previews/waitlist-pending.html');
fs.mkdirSync(path.dirname(pendingPath), { recursive: true });
fs.writeFileSync(pendingPath, pendingEmail.html);
console.log(`   ✅ Saved to: email-previews/waitlist-pending.html`);
console.log(`   Subject: You're on the Teed.club Founders' List 🏌️\n`);

// 2. Waitlist Approved Email
console.log('2️⃣ Generating Waitlist Approved Email...');
const approvedEmail = EmailTemplates.waitlistApproved(testUser);
const approvedPath = path.join(__dirname, '../email-previews/waitlist-approved.html');
fs.writeFileSync(approvedPath, approvedEmail.html);
console.log(`   ✅ Saved to: email-previews/waitlist-approved.html`);
console.log(`   Subject: 🎉 Welcome to Teed.club Beta - Start Building Your Bag!\n`);

// 3. Invite Pack Email
console.log('3️⃣ Generating Invite Pack Email...');
const inviteEmail = EmailTemplates.invitePack({
  email: testUser.email,
  displayName: testUser.displayName,
  inviteCodes: testInviteCodes
});
const invitePath = path.join(__dirname, '../email-previews/invite-pack.html');
fs.writeFileSync(invitePath, inviteEmail.html);
console.log(`   ✅ Saved to: email-previews/invite-pack.html`);
console.log(`   Subject: Your Teed.club Invite Codes Are Here ⛳\n`);

console.log('📧 Email templates generated successfully!');
console.log('📂 Open the HTML files in email-previews/ to preview them.');

// Integration instructions
console.log('\n' + '='.repeat(60));
console.log('📬 EMAIL SERVICE INTEGRATION GUIDE');
console.log('='.repeat(60));
console.log(`
To integrate with your preferred email service, update the sendEmail 
function in src/services/emailService.ts:

1. SendGrid:
   npm install @sendgrid/mail
   
   const sgMail = require('@sendgrid/mail');
   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
   await sgMail.send(data);

2. Resend:
   npm install resend
   
   import { Resend } from 'resend';
   const resend = new Resend(process.env.RESEND_API_KEY);
   await resend.emails.send(data);

3. AWS SES:
   npm install @aws-sdk/client-ses
   
   import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
   const client = new SESClient({ region: "us-east-1" });
   await client.send(new SendEmailCommand(params));

4. Postmark:
   npm install postmark
   
   const postmark = require("postmark");
   const client = new postmark.ServerClient(process.env.POSTMARK_KEY);
   await client.sendEmail(data);

Environment variables needed:
- Email service API key
- From email address (e.g., hello@teed.club)
- Reply-to address (optional)
`);

console.log('✨ Done!');