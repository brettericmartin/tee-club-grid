#!/usr/bin/env node

import puppeteer from 'puppeteer';

async function testTabSwitchingWithAuth() {
  console.log('🧪 Testing tab switching with authentication...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      devtools: true
    });
    
    const page = await browser.newPage();
    
    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Error') || text.includes('error')) {
        console.error('❌ Console Error:', text);
      } else if (text.includes('[AuthContext]')) {
        console.log('🔍', text);
      }
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      console.error('❌ Page Error:', error.message);
    });
    
    console.log('📱 Navigating to http://localhost:3333...');
    await page.goto('http://localhost:3333', {
      waitUntil: 'networkidle2',
      timeout: 15000
    });
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Click sign in button
    console.log('🔑 Clicking sign in...');
    await page.click('button:has-text("Sign In")').catch(() => {
      console.log('   Looking for alternative sign in button...');
      return page.click('a[href*="sign-in"], button[aria-label*="sign in"]').catch(() => {
        console.log('   Trying navigation sign in...');
        return page.click('nav button:has-text("Sign In")');
      });
    }));
    
    // Wait for modal
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Enter credentials
    console.log('📝 Entering credentials...');
    await page.type('input[type="email"]', 'brettmartinplay@gmail.com');
    await page.type('input[type="password"]', 'Crimson11!');
    
    // Submit
    console.log('🚀 Submitting login...');
    await page.click('button[type="submit"]');
    
    // Wait for auth
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if logged in
    const isLoggedIn = await page.evaluate(() => {
      return document.body.innerText.includes('My Bag') || 
             document.body.innerText.includes('Sign Out');
    });
    
    console.log('✅ Login status:', isLoggedIn ? 'Logged in' : 'Not logged in');
    
    if (isLoggedIn) {
      console.log('\n🔄 Testing tab switching...');
      
      // Create a new tab
      console.log('📑 Opening new tab...');
      const newPage = await browser.newPage();
      await newPage.goto('https://google.com');
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Switch back to original tab
      console.log('🔙 Switching back to original tab...');
      await page.bringToFront();
      
      // Wait and check if still working
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to navigate to a protected page
      console.log('🧭 Navigating to My Bag...');
      await page.goto('http://localhost:3333/my-bag', {
        waitUntil: 'networkidle2',
        timeout: 15000
      });
      
      // Check if page loaded
      const pageContent = await page.evaluate(() => {
        return document.body.innerText.substring(0, 100);
      });
      
      console.log('📄 Page content after tab switch:', pageContent);
      
      // Check for errors
      const hasErrors = await page.evaluate(() => {
        return document.body.innerText.includes('Error') || 
               document.body.innerText.includes('failed');
      });
      
      console.log('\n=================================');
      if (!hasErrors && pageContent.length > 10) {
        console.log('✅ TAB SWITCHING WORKS CORRECTLY');
      } else {
        console.log('❌ TAB SWITCHING CAUSES ISSUES');
      }
      console.log('=================================\n');
    }
    
    // Keep browser open for manual inspection
    console.log('Browser will stay open for 10 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testTabSwitchingWithAuth().catch(console.error);