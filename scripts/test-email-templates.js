#!/usr/bin/env node

/**
 * Test email templates
 * Sends test emails or saves them as HTML files for preview
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  sendConfirmationEmail,
  sendMovementEmail,
  sendApprovalEmail,
  sendWeeklyDigest
} from '../lib/email-templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Test data
const testUser = {
  email: process.env.EMAIL_TEST_RECIPIENT || 'test@example.com',
  displayName: 'Tiger Woods',
  referralCode: 'TIGER2024'
};

/**
 * Test confirmation email
 */
async function testConfirmation() {
  console.log('\n🔔 Testing Confirmation Email...');
  
  const data = {
    ...testUser,
    position: 42,
    score: 8,
    waitTime: '3-5 days'
  };
  
  const result = await sendConfirmationEmail(data);
  
  if (result.success) {
    console.log('✅ Confirmation email sent successfully');
    console.log('   ID:', result.id);
  } else {
    console.error('❌ Failed to send confirmation email:', result.error);
  }
}

/**
 * Test movement notification
 */
async function testMovement() {
  console.log('\n🚀 Testing Movement Email...');
  
  const data = {
    ...testUser,
    oldPosition: 50,
    newPosition: 35,
    referredName: 'Phil Mickelson',
    totalReferrals: 5
  };
  
  const result = await sendMovementEmail(data);
  
  if (result.success) {
    console.log('✅ Movement email sent successfully');
    console.log('   ID:', result.id);
  } else {
    console.error('❌ Failed to send movement email:', result.error);
  }
}

/**
 * Test approval email
 */
async function testApproval() {
  console.log('\n🎉 Testing Approval Email...');
  
  const data = {
    ...testUser,
    inviteCodes: ['GOLF-ABCD', 'GOLF-EFGH', 'GOLF-IJKL']
  };
  
  const result = await sendApprovalEmail(data);
  
  if (result.success) {
    console.log('✅ Approval email sent successfully');
    console.log('   ID:', result.id);
  } else {
    console.error('❌ Failed to send approval email:', result.error);
  }
}

/**
 * Test weekly digest
 */
async function testWeeklyDigest() {
  console.log('\n📊 Testing Weekly Digest Email...');
  
  const data = {
    ...testUser,
    currentPosition: 25,
    previousPosition: 30,
    totalReferrals: 8,
    weeklyActivity: [
      { 
        icon: '👥', 
        title: '2 Successful Referrals', 
        description: 'John Daly and Brooks Koepka joined using your link' 
      },
      { 
        icon: '🚀', 
        title: 'Moved Up 5 Spots', 
        description: 'Your referrals helped you jump ahead!' 
      }
    ],
    topReferrers: [
      { rank: 1, name: 'Rory McIlroy', referrals: 15 },
      { rank: 2, name: 'Jordan Spieth', referrals: 12 },
      { rank: 3, name: 'Justin Thomas', referrals: 10 }
    ],
    userRank: 8,
    approvedThisWeek: 20,
    spotsRemaining: 75
  };
  
  const result = await sendWeeklyDigest(data);
  
  if (result.success) {
    console.log('✅ Weekly digest sent successfully');
    console.log('   ID:', result.id);
  } else {
    console.error('❌ Failed to send weekly digest:', result.error);
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('📧 Email Template Tester');
  console.log('========================');
  
  const args = process.argv.slice(2);
  const testType = args[0];
  
  if (!testType) {
    console.log('\nUsage: node test-email-templates.js <type>');
    console.log('\nTypes:');
    console.log('  confirmation - Test confirmation email');
    console.log('  movement     - Test movement notification');
    console.log('  approval     - Test approval email');
    console.log('  digest       - Test weekly digest');
    console.log('  all          - Test all templates');
    console.log('\nExample:');
    console.log('  node test-email-templates.js all');
    process.exit(1);
  }
  
  // Check if email is configured
  if (!process.env.RESEND_API_KEY) {
    console.log('\n⚠️  Warning: RESEND_API_KEY not configured');
    console.log('   Emails will be logged to console only');
  }
  
  console.log(`\nRecipient: ${testUser.email}`);
  console.log('');
  
  try {
    switch (testType) {
      case 'confirmation':
        await testConfirmation();
        break;
      case 'movement':
        await testMovement();
        break;
      case 'approval':
        await testApproval();
        break;
      case 'digest':
        await testWeeklyDigest();
        break;
      case 'all':
        await testConfirmation();
        await testMovement();
        await testApproval();
        await testWeeklyDigest();
        break;
      default:
        console.error('❌ Unknown test type:', testType);
        process.exit(1);
    }
    
    console.log('\n✅ All tests completed!');
    
    if (process.env.RESEND_API_KEY) {
      console.log('\n📬 Check your inbox at:', testUser.email);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);