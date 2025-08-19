#!/usr/bin/env node

import puppeteer from 'puppeteer';

async function testAppLoading() {
  console.log('🧪 Testing app loading with Puppeteer...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capture console logs
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.error('❌ Console Error:', text);
      } else if (text.includes('Error') || text.includes('error')) {
        console.error('⚠️  Error in console:', text);
      } else if (text.includes('[DEBUG]') || text.includes('[AuthContext]') || text.includes('[EnhancedAuth]') || text.includes('[TabFocusAuth]')) {
        console.log('🔍', text);
      }
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      console.error('❌ Page Error:', error.message);
    });
    
    // Capture request failures
    page.on('requestfailed', request => {
      console.error('❌ Request Failed:', request.url(), '-', request.failure().errorText);
    });
    
    console.log('📱 Navigating to http://localhost:3333...');
    
    try {
      await page.goto('http://localhost:3333', {
        waitUntil: 'networkidle2',
        timeout: 15000
      });
      console.log('✅ Page loaded successfully\n');
    } catch (error) {
      console.error('❌ Failed to load page:', error.message);
    }
    
    // Check if React root is present
    const hasRoot = await page.evaluate(() => {
      return document.getElementById('root') !== null;
    });
    console.log('🎯 Root element present:', hasRoot ? '✅ Yes' : '❌ No');
    
    // Check if React mounted
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML.substring(0, 200) : 'No root element';
    });
    console.log('📦 Root content:', rootContent ? 'Has content' : 'Empty');
    
    // Check for visible text
    const visibleText = await page.evaluate(() => {
      return document.body.innerText.substring(0, 200);
    });
    console.log('📝 Visible text:', visibleText || 'No visible text');
    
    // Check for auth tools
    const authTools = await page.evaluate(() => {
      return {
        tabFocusAuth: typeof window.tabFocusAuth !== 'undefined',
        authDebug: typeof window.authDebug !== 'undefined',
        supabase: typeof window.supabase !== 'undefined'
      };
    });
    console.log('\n🔐 Auth tools loaded:');
    console.log('  - tabFocusAuth:', authTools.tabFocusAuth ? '✅' : '❌');
    console.log('  - authDebug:', authTools.authDebug ? '✅' : '❌');
    
    // Check for errors in window
    const windowErrors = await page.evaluate(() => {
      return window.errorMessages || [];
    });
    if (windowErrors.length > 0) {
      console.error('\n❌ Window errors:', windowErrors);
    }
    
    // Take a screenshot
    await page.screenshot({ path: '/tmp/app-test-screenshot.png' });
    console.log('\n📸 Screenshot saved to /tmp/app-test-screenshot.png');
    
    // Get page title
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    // Check for specific elements
    const hasNavigation = await page.evaluate(() => {
      return document.querySelector('nav') !== null;
    });
    console.log('🧭 Navigation present:', hasNavigation ? '✅ Yes' : '❌ No');
    
    // Final verdict
    console.log('\n=================================');
    if (hasRoot && rootContent !== 'No root element' && rootContent.length > 10) {
      console.log('✅ APP IS LOADING SUCCESSFULLY');
    } else {
      console.log('❌ APP FAILED TO LOAD PROPERLY');
      console.log('Debug: Check /tmp/app-test-screenshot.png for visual');
    }
    console.log('=================================\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testAppLoading().catch(console.error);