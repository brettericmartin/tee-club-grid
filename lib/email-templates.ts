/**
 * Email Template Manager
 * Loads and renders email templates with data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  sendEmail, 
  generateReferralLink, 
  formatQueuePosition, 
  estimateWaitTime,
  type EmailResult 
} from './email';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load copy configuration
const copyPath = path.join(__dirname, '../copy/waitlist.json');
const emailCopy = JSON.parse(fs.readFileSync(copyPath, 'utf-8')).email;

// Template cache
const templateCache = new Map<string, string>();

/**
 * Load an email template from disk
 */
function loadTemplate(templateName: string, format: 'html' | 'txt' = 'html'): string {
  const cacheKey = `${templateName}.${format}`;
  
  if (templateCache.has(cacheKey)) {
    return templateCache.get(cacheKey)!;
  }
  
  const templatePath = path.join(__dirname, '../emails/templates', `${templateName}.${format}`);
  const template = fs.readFileSync(templatePath, 'utf-8');
  
  // Cache in production
  if (process.env.NODE_ENV === 'production') {
    templateCache.set(cacheKey, template);
  }
  
  return template;
}

/**
 * Simple template renderer (replaces {{variable}} with values)
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  let rendered = template;
  
  // Handle simple variables
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, String(value || ''));
  });
  
  // Handle conditionals {{#if condition}}...{{/if}}
  rendered = rendered.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
    return data[condition] ? content : '';
  });
  
  // Handle loops {{#each array}}...{{/each}}
  rendered = rendered.replace(/{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g, (match, arrayName, content) => {
    const array = data[arrayName];
    if (!Array.isArray(array)) return '';
    
    return array.map((item, index) => {
      let itemContent = content;
      // Replace {{this}} with the item value
      itemContent = itemContent.replace(/{{this}}/g, String(item));
      // Replace {{@index}} with the index
      itemContent = itemContent.replace(/{{@index}}/g, String(index + 1));
      // Replace item properties
      if (typeof item === 'object') {
        Object.entries(item).forEach(([key, value]) => {
          const regex = new RegExp(`{{this.${key}}}`, 'g');
          itemContent = itemContent.replace(regex, String(value || ''));
        });
      }
      return itemContent;
    }).join('');
  });
  
  return rendered;
}

/**
 * Send confirmation email after waitlist submission
 */
export async function sendConfirmationEmail(data: {
  email: string;
  displayName: string;
  position: number;
  score?: number;
  referralCode: string;
  waitTime?: string;
}): Promise<EmailResult> {
  const baseUrl = process.env.VITE_PUBLIC_URL || 'https://teed.club';
  const referralLink = generateReferralLink(data.referralCode);
  const formattedPosition = formatQueuePosition(data.position);
  const waitTime = data.waitTime || estimateWaitTime(data.position);
  
  const templateData = {
    // Copy
    heading: emailCopy.headings.confirmation,
    introText: emailCopy.body.confirmationIntro.replace('{name}', data.displayName),
    referralExplanation: emailCopy.body.referralExplanation,
    footerText: emailCopy.footer.copyright,
    unsubscribeText: emailCopy.footer.unsubscribe,
    
    // Data
    displayName: data.displayName,
    position: data.position,
    formattedPosition,
    waitTime,
    score: data.score,
    referralCode: data.referralCode,
    referralLink,
    
    // URLs
    baseUrl,
    statusUrl: `${baseUrl}/waitlist/status`,
    unsubscribeUrl: `${baseUrl}/unsubscribe`,
    twitterUrl: emailCopy.footer.social.twitter,
    instagramUrl: emailCopy.footer.social.instagram,
    redditUrl: emailCopy.footer.social.reddit,
    
    // Social sharing
    tweetText: encodeURIComponent(`I just joined the @teedclub waitlist! Join me and let's showcase our golf bags together 🏌️`),
    
    // Tips
    tips: emailCopy.tips.moveUpFaster
  };
  
  const htmlTemplate = loadTemplate('confirmation', 'html');
  const textTemplate = loadTemplate('confirmation', 'txt');
  
  const html = renderTemplate(htmlTemplate, templateData);
  const text = renderTemplate(textTemplate, templateData);
  
  const subject = emailCopy.subjects.confirmation.replace('{position}', String(data.position));
  
  return sendEmail({
    to: data.email,
    subject,
    html,
    text,
    tags: [
      { name: 'type', value: 'confirmation' },
      { name: 'position', value: String(data.position) }
    ]
  });
}

/**
 * Send movement notification when user moves up
 */
export async function sendMovementEmail(data: {
  email: string;
  displayName: string;
  oldPosition: number;
  newPosition: number;
  referredName?: string;
  totalReferrals: number;
  referralCode: string;
}): Promise<EmailResult> {
  const baseUrl = process.env.VITE_PUBLIC_URL || 'https://teed.club';
  const spotsGained = data.oldPosition - data.newPosition;
  const spotsToGo = data.newPosition - 1;
  const progressPercentage = Math.min(100, Math.round((1 - data.newPosition / data.oldPosition) * 100));
  const newWaitTime = estimateWaitTime(data.newPosition);
  const estimatedDays = Math.ceil(data.newPosition / 10);
  
  const templateData = {
    displayName: data.displayName,
    celebrationMessage: data.referredName 
      ? emailCopy.body.movementCelebration.replace('{referredName}', data.referredName)
      : 'Great news! You\'ve moved up in the waitlist queue.',
    oldPosition: data.oldPosition,
    newPosition: data.newPosition,
    spotsGained,
    spotsToGo,
    currentPosition: data.newPosition,
    totalReferrals: data.totalReferrals,
    progressPercentage,
    newWaitTime,
    estimatedDays,
    referralLink: generateReferralLink(data.referralCode),
    
    // URLs
    dashboardUrl: `${baseUrl}/waitlist/status`,
    shareUrl: `${baseUrl}/share`,
    leaderboardUrl: `${baseUrl}/waitlist#leaderboard`,
    helpUrl: `${baseUrl}/help`,
    unsubscribeUrl: `${baseUrl}/unsubscribe`,
    
    // Milestone check
    milestone: data.totalReferrals % 5 === 0 ? {
      milestoneTitle: `${data.totalReferrals} Referrals Milestone!`,
      milestoneDescription: data.totalReferrals >= 10 
        ? 'You\'re a Teed.club Champion! Keep it up!'
        : 'You\'re on fire! Every referral gets you closer.'
    } : null,
    
    footerText: emailCopy.footer.copyright
  };
  
  const htmlTemplate = loadTemplate('movement', 'html');
  const html = renderTemplate(htmlTemplate, templateData);
  
  const subject = emailCopy.subjects.movement
    .replace('{newPosition}', String(data.newPosition));
  
  return sendEmail({
    to: data.email,
    subject,
    html,
    tags: [
      { name: 'type', value: 'movement' },
      { name: 'spots_gained', value: String(spotsGained) }
    ]
  });
}

/**
 * Send approval email with onboarding
 */
export async function sendApprovalEmail(data: {
  email: string;
  displayName: string;
  inviteCodes?: string[];
}): Promise<EmailResult> {
  const baseUrl = process.env.VITE_PUBLIC_URL || 'https://teed.club';
  
  const templateData = {
    displayName: data.displayName,
    approvalMessage: emailCopy.body.approvalCongrats.replace('{name}', data.displayName),
    benefits: emailCopy.benefits.betaAccess,
    inviteCodes: data.inviteCodes,
    gettingStartedSteps: emailCopy.tips.getStarted,
    
    // URLs
    buildBagUrl: `${baseUrl}/my-bag`,
    exploreUrl: `${baseUrl}/bags-browser`,
    forumUrl: `${baseUrl}/forum`,
    profileUrl: `${baseUrl}/profile`,
    feedbackUrl: `${baseUrl}/feedback`,
    helpUrl: `${baseUrl}/help`,
    privacyUrl: `${baseUrl}/privacy`,
    unsubscribeUrl: `${baseUrl}/unsubscribe`,
    
    // Social
    twitterUrl: emailCopy.footer.social.twitter,
    instagramUrl: emailCopy.footer.social.instagram,
    discordUrl: 'https://discord.gg/teedclub',
    redditUrl: emailCopy.footer.social.reddit,
    
    footerText: emailCopy.footer.copyright
  };
  
  const htmlTemplate = loadTemplate('approval', 'html');
  const html = renderTemplate(htmlTemplate, templateData);
  
  return sendEmail({
    to: data.email,
    subject: emailCopy.subjects.approval,
    html,
    tags: [
      { name: 'type', value: 'approval' },
      { name: 'user', value: data.displayName }
    ]
  });
}

/**
 * Send weekly digest email
 */
export async function sendWeeklyDigest(data: {
  email: string;
  displayName: string;
  currentPosition: number;
  previousPosition: number;
  totalReferrals: number;
  referralCode: string;
  weeklyActivity?: Array<{ icon: string; title: string; description: string }>;
  topReferrers?: Array<{ rank: number; name: string; referrals: number }>;
  userRank?: number;
  approvedThisWeek: number;
  spotsRemaining: number;
}): Promise<EmailResult> {
  const baseUrl = process.env.VITE_PUBLIC_URL || 'https://teed.club';
  const weeklyChange = data.previousPosition - data.currentPosition;
  const movedUp = weeklyChange > 0;
  const movedDown = weeklyChange < 0;
  const noMovement = weeklyChange === 0;
  const estimatedDays = Math.ceil(data.currentPosition / 10);
  const progressPercentage = Math.max(0, Math.min(100, 100 - (data.currentPosition / 150 * 100)));
  
  const weekDate = new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  const templateData = {
    displayName: data.displayName,
    weekDate,
    currentPosition: data.currentPosition,
    weeklyChange: weeklyChange > 0 ? `+${weeklyChange}` : weeklyChange,
    totalReferrals: data.totalReferrals,
    estimatedDays,
    movedUp,
    movedDown,
    noMovement,
    spotsGained: Math.abs(weeklyChange),
    spotsLost: Math.abs(weeklyChange),
    weeklyActivity: data.weeklyActivity,
    topReferrers: data.topReferrers,
    userRank: data.userRank,
    userReferrals: data.totalReferrals,
    referralLink: generateReferralLink(data.referralCode),
    progressPercentage,
    approvedThisWeek: data.approvedThisWeek,
    spotsRemaining: data.spotsRemaining,
    
    // URLs
    dashboardUrl: `${baseUrl}/waitlist/status`,
    shareUrl: `${baseUrl}/share`,
    leaderboardUrl: `${baseUrl}/waitlist#leaderboard`,
    helpUrl: `${baseUrl}/help`,
    unsubscribeUrl: `${baseUrl}/unsubscribe`
  };
  
  const htmlTemplate = loadTemplate('weekly-digest', 'html');
  const html = renderTemplate(htmlTemplate, templateData);
  
  const subject = emailCopy.subjects.weeklyDigest.replace('{date}', weekDate);
  
  return sendEmail({
    to: data.email,
    subject,
    html,
    tags: [
      { name: 'type', value: 'weekly-digest' },
      { name: 'position', value: String(data.currentPosition) }
    ]
  });
}