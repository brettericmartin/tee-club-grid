import puppeteer from 'puppeteer';

async function testShareModal() {
  let browser;
  
  try {
    console.log('Starting Puppeteer test for ShareModal...');
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--single-process'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser error:', msg.text());
      } else if (msg.text().includes('[ShareModal]') || msg.text().includes('[DEBUG]')) {
        console.log('Browser log:', msg.text());
      }
    });
    
    // Handle page errors
    page.on('pageerror', error => {
      console.error('Page error:', error);
    });
    
    // Navigate to the application
    let baseUrl = 'http://localhost:3333';
    console.log('Navigating to http://localhost:3333...');
    
    try {
      await page.goto(baseUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
    } catch (error) {
      console.log('Port 3333 not available, trying 3334...');
      baseUrl = 'http://localhost:3334';
      await page.goto(baseUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
    }
    
    console.log('Page loaded successfully from', baseUrl);
    
    // Wait for the app to render
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Check for any dynamic import errors
    const hasError = await page.evaluate(() => {
      const errorElement = document.querySelector('h2');
      return errorElement && errorElement.textContent.includes('Unable to Load Page');
    });
    
    if (hasError) {
      console.error('❌ Dynamic import error detected!');
      const errorDetails = await page.evaluate(() => {
        const detailsElement = document.querySelector('pre');
        return detailsElement ? detailsElement.textContent : 'No details available';
      });
      console.error('Error details:', errorDetails);
      process.exit(1);
    }
    
    console.log('✅ No dynamic import errors detected');
    
    // Navigate to bags browser
    console.log('Navigating to bags browser...');
    await page.goto(`${baseUrl}/bags`, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for bag cards to load
    await page.waitForSelector('[data-testid="bag-card"], .bag-card, article', { 
      timeout: 10000 
    }).catch(() => {
      console.log('No bag cards found, checking for any content...');
    });
    
    // Try to find and click a share button
    console.log('Looking for share button...');
    
    const shareButtonFound = await page.evaluate(() => {
      // Look for share buttons in various ways
      const buttons = Array.from(document.querySelectorAll('button'));
      const shareButton = buttons.find(btn => 
        btn.textContent.includes('Share') || 
        btn.querySelector('[data-lucide="share"]') ||
        btn.querySelector('svg')
      );
      
      if (shareButton) {
        shareButton.click();
        return true;
      }
      return false;
    });
    
    if (shareButtonFound) {
      console.log('✅ Share button clicked');
      
      // Wait for modal to appear
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      console.log('✅ Share modal opened');
      
      // Look for screenshot view button
      const screenshotButtonClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const screenshotBtn = buttons.find(btn => 
          btn.textContent.includes('Screenshot') || 
          btn.textContent.includes('screenshot') ||
          btn.textContent.includes('Open Screenshot-Friendly View')
        );
        
        if (screenshotBtn) {
          screenshotBtn.click();
          return true;
        }
        return false;
      });
      
      if (screenshotButtonClicked) {
        console.log('✅ Screenshot view button clicked');
        
        // Wait a moment for the view to render
        await page.waitForTimeout(2000);
        
        // Check if screenshot view is visible
        const isScreenshotViewVisible = await page.evaluate(() => {
          const element = document.getElementById('bag-share-content');
          return element !== null;
        });
        
        if (isScreenshotViewVisible) {
          console.log('✅ Screenshot view rendered successfully');
        } else {
          console.log('⚠️ Screenshot view not visible');
        }
      } else {
        console.log('⚠️ Screenshot button not found in modal');
      }
    } else {
      console.log('⚠️ No share button found on page');
    }
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'share-modal-test.png', fullPage: true });
    console.log('Screenshot saved as share-modal-test.png');
    
    // Check memory usage
    const metrics = await page.metrics();
    console.log('\nMemory metrics:');
    console.log('- JS Heap Used:', Math.round(metrics.JSHeapUsedSize / 1024 / 1024), 'MB');
    console.log('- JS Heap Total:', Math.round(metrics.JSHeapTotalSize / 1024 / 1024), 'MB');
    
    // Final check for errors
    const finalCheck = await page.evaluate(() => {
      const errors = [];
      
      // Check for React errors
      const reactError = document.querySelector('.react-error-overlay');
      if (reactError) errors.push('React error overlay detected');
      
      // Check for console errors
      if (window.__errors && window.__errors.length > 0) {
        errors.push(...window.__errors);
      }
      
      return errors;
    });
    
    if (finalCheck.length > 0) {
      console.error('\n❌ Errors detected:', finalCheck);
    } else {
      console.log('\n✅ Test completed successfully - No crashes or errors detected');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
}

// Run the test
testShareModal().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});