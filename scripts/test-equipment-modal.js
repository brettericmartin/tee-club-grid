#!/usr/bin/env node
import puppeteer from 'puppeteer';

async function testEquipmentModal() {
  console.log('🧪 Testing Equipment Modal Functionality\n');
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: false, // Set to true for CI/automated testing
      defaultViewport: { width: 1280, height: 800 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error') {
        console.log('❌ Browser Console Error:', msg.text());
      } else if (type === 'warning') {
        console.log('⚠️ Browser Console Warning:', msg.text());
      }
    });
    
    // Catch page errors
    page.on('pageerror', error => {
      console.log('❌ Page Error:', error.message);
    });
    
    // Navigate to the bags browser page
    console.log('📍 Navigating to bags browser...');
    await page.goto('http://localhost:3334/bags-browser', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for the page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if the page loaded correctly
    const pageTitle = await page.title();
    console.log(`📄 Page title: ${pageTitle}`);
    
    // Take a screenshot of the initial state
    await page.screenshot({ 
      path: 'test-screenshots/bags-browser-initial.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved: bags-browser-initial.png');
    
    // Wait for bag cards to load
    console.log('⏳ Waiting for bag cards to load...');
    try {
      await page.waitForSelector('.bag-card', { timeout: 10000 });
      console.log('✅ Bag cards loaded');
    } catch (error) {
      console.log('❌ No bag cards found, checking for alternative selectors...');
      
      // Try alternative selectors
      const selectors = [
        '[data-testid="bag-card"]',
        '.card',
        'article',
        'div[class*="bag"]'
      ];
      
      let found = false;
      for (const selector of selectors) {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.log('❌ Could not find any bag-related elements');
        
        // Get page content for debugging
        const bodyText = await page.evaluate(() => document.body.innerText);
        console.log('Page content:', bodyText.substring(0, 500));
      }
    }
    
    // Try to find and click on an equipment item
    console.log('\n🔍 Looking for equipment items...');
    
    // Various selectors for equipment items
    const equipmentSelectors = [
      '[data-testid="equipment-item"]',
      '.equipment-item',
      'button[class*="equipment"]',
      'div[class*="equipment"]',
      '[role="button"]'
    ];
    
    let equipmentClicked = false;
    for (const selector of equipmentSelectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} potential equipment items with selector: ${selector}`);
        
        // Click the first one
        try {
          await elements[0].click();
          console.log('✅ Clicked on equipment item');
          equipmentClicked = true;
          break;
        } catch (error) {
          console.log(`⚠️ Could not click element with selector ${selector}`);
        }
      }
    }
    
    if (equipmentClicked) {
      // Wait for modal to appear
      console.log('⏳ Waiting for modal to appear...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for modal
      const modalSelectors = [
        '[role="dialog"]',
        '.dialog',
        '[data-testid="equipment-modal"]',
        'div[class*="modal"]'
      ];
      
      let modalFound = false;
      for (const selector of modalSelectors) {
        const modal = await page.$(selector);
        if (modal) {
          console.log(`✅ Modal found with selector: ${selector}`);
          modalFound = true;
          
          // Take screenshot of modal
          await page.screenshot({ 
            path: 'test-screenshots/equipment-modal.png',
            fullPage: false 
          });
          console.log('📸 Screenshot saved: equipment-modal.png');
          
          // Check for double X buttons
          const closeButtons = await page.$$('button svg.lucide-x');
          console.log(`\n🔍 Found ${closeButtons.length} X close buttons`);
          if (closeButtons.length > 1) {
            console.log('⚠️ WARNING: Multiple close buttons detected!');
          }
          
          // Check for image in modal
          const modalImages = await page.$eval(selector, el => {
            const images = el.querySelectorAll('img');
            return Array.from(images).map(img => ({
              src: img.src,
              alt: img.alt,
              displayed: img.offsetWidth > 0 && img.offsetHeight > 0
            }));
          });
          
          console.log('\n📷 Images in modal:');
          modalImages.forEach((img, index) => {
            console.log(`  ${index + 1}. ${img.alt || 'No alt text'}`);
            console.log(`     src: ${img.src}`);
            console.log(`     displayed: ${img.displayed ? 'Yes ✅' : 'No ❌'}`);
          });
          
          // Check for "No photo available" text
          const noPhotoText = await page.$eval(selector, el => {
            return el.textContent?.includes('No photo available');
          });
          
          if (noPhotoText) {
            console.log('\n❌ "No photo available" text found in modal');
          }
          
          break;
        }
      }
      
      if (!modalFound) {
        console.log('❌ Modal did not appear');
      }
    } else {
      console.log('❌ Could not click on any equipment item');
    }
    
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      console.log('\n🔚 Closing browser...');
      await browser.close();
    }
  }
}

// Create screenshots directory if it doesn't exist
import fs from 'fs';
import path from 'path';

const screenshotsDir = path.join(process.cwd(), 'test-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

testEquipmentModal();