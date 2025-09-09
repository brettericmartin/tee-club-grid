#!/usr/bin/env node
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function testEquipmentModal() {
  console.log('🧪 Testing Equipment Modal Functionality V2\n');
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 800 },
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      devtools: true
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error') {
        console.log('❌ Browser Console Error:', msg.text());
        msg.args().forEach(async (arg) => {
          const val = await arg.jsonValue();
          if (val && val.stack) console.log('Stack:', val.stack);
        });
      }
    });
    
    // Catch page errors
    page.on('pageerror', error => {
      console.log('❌ Page Error:', error.message);
      console.log('Stack:', error.stack);
    });
    
    // Navigate to the bags browser page
    console.log('📍 Navigating to bags browser...');
    await page.goto('http://localhost:3334/bags-browser', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for the page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-screenshots/initial-page.png',
      fullPage: true 
    });
    console.log('📸 Screenshot: initial-page.png');
    
    // Look for "View Full Bag" buttons and click one
    console.log('\n🔍 Looking for bag links...');
    const bagLinks = await page.$$('a[href*="/bags/"]');
    
    if (bagLinks.length > 0) {
      console.log(`✅ Found ${bagLinks.length} bag links`);
      
      // Get the href of the first link
      const href = await bagLinks[0].evaluate(el => el.getAttribute('href'));
      console.log(`📍 Navigating to: ${href}`);
      
      // Navigate to the bag page
      await page.goto(`http://localhost:3334${href}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Take screenshot of bag page
      await page.screenshot({ 
        path: 'test-screenshots/bag-page.png',
        fullPage: true 
      });
      console.log('📸 Screenshot: bag-page.png');
      
      // Now look for equipment items to click
      console.log('\n🔍 Looking for equipment items on bag page...');
      
      // Try clicking on equipment images or cards
      const equipmentElements = await page.$$('img[alt*="Callaway"], img[alt*="TaylorMade"], img[alt*="Titleist"], img[alt*="Ping"]');
      
      if (equipmentElements.length > 0) {
        console.log(`✅ Found ${equipmentElements.length} equipment images`);
        
        // Get parent element that's clickable
        const clickableElement = await equipmentElements[0].evaluateHandle(el => {
          let parent = el.parentElement;
          while (parent && parent.tagName !== 'BUTTON' && !parent.onclick && !parent.hasAttribute('role')) {
            parent = parent.parentElement;
          }
          return parent || el;
        });
        
        // Click on the equipment
        await clickableElement.click();
        console.log('✅ Clicked on equipment item');
        
        // Wait for modal
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check for modal
        const modal = await page.$('[role="dialog"]');
        if (modal) {
          console.log('✅ Modal appeared!');
          
          // Take screenshot of modal
          await page.screenshot({ 
            path: 'test-screenshots/equipment-modal.png',
            fullPage: false 
          });
          console.log('📸 Screenshot: equipment-modal.png');
          
          // Check for issues
          console.log('\n🔍 Checking for issues...');
          
          // 1. Check for double X buttons
          const closeButtons = await page.$$('[role="dialog"] button svg.lucide-x');
          console.log(`  X buttons: ${closeButtons.length} ${closeButtons.length > 1 ? '❌ Multiple!' : '✅'}`);
          
          // 2. Check for images in modal
          const modalImages = await modal.$$eval('img', images => 
            images.map(img => ({
              src: img.src,
              alt: img.alt,
              naturalWidth: img.naturalWidth,
              displayed: img.offsetWidth > 0 && img.offsetHeight > 0,
              hasError: img.classList.contains('error')
            }))
          );
          
          console.log(`  Images: ${modalImages.length}`);
          modalImages.forEach((img, i) => {
            const status = img.displayed ? '✅' : '❌';
            console.log(`    ${i+1}. ${status} ${img.alt || 'No alt'} (${img.naturalWidth}px)`);
            if (!img.displayed) {
              console.log(`       src: ${img.src}`);
            }
          });
          
          // 3. Check for "No photo available" text
          const modalText = await modal.evaluate(el => el.textContent);
          if (modalText?.includes('No photo available')) {
            console.log('  ❌ "No photo available" message found');
          } else {
            console.log('  ✅ No "No photo available" message');
          }
          
          // 4. Check modal title
          const modalTitle = await modal.$eval('h2', el => el.textContent).catch(() => 'No title');
          console.log(`  Modal title: "${modalTitle}"`);
          
        } else {
          console.log('❌ Modal did not appear');
          
          // Check console for errors
          const errors = await page.evaluate(() => {
            const consoleErrors = [];
            // Get any error messages from the page
            const errorElements = document.querySelectorAll('.error, [class*="error"]');
            errorElements.forEach(el => {
              if (el.textContent) consoleErrors.push(el.textContent);
            });
            return consoleErrors;
          });
          
          if (errors.length > 0) {
            console.log('Page errors found:', errors);
          }
        }
      } else {
        console.log('❌ No equipment items found on bag page');
      }
    } else {
      console.log('❌ No bag links found');
    }
    
    console.log('\n✅ Test completed');
    
    // Keep browser open for 5 seconds to see result
    await new Promise(resolve => setTimeout(resolve, 5000));
    
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
const screenshotsDir = path.join(process.cwd(), 'test-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

testEquipmentModal();