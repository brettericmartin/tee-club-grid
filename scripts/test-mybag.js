import puppeteer from 'puppeteer';

async function testMyBagPage() {
  let browser;
  
  try {
    console.log('Starting Puppeteer test for /my-bag page...');
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Enable console logging
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        console.error('❌ Browser error:', text);
        // Check for critical errors
        if (text.includes('Suspense is not defined') || text.includes('Cannot read properties')) {
          console.error('CRITICAL ERROR DETECTED!');
        }
      } else if (text.includes('[MyBag]') || text.includes('Error')) {
        console.log('Browser log:', text);
      }
    });
    
    // Handle page errors
    page.on('pageerror', error => {
      console.error('❌ Page error:', error.message);
    });
    
    // Navigate to the application
    let baseUrl = 'http://localhost:3333';
    console.log('Navigating to my-bag page...');
    
    try {
      await page.goto(`${baseUrl}/my-bag`, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
    } catch (error) {
      console.log('Port 3333 not available, trying 3334...');
      baseUrl = 'http://localhost:3334';
      await page.goto(`${baseUrl}/my-bag`, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
    }
    
    console.log('Page loaded, waiting for content...');
    
    // Wait a bit for React to render
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check for error boundaries
    const hasErrorBoundary = await page.evaluate(() => {
      const errorElement = document.querySelector('.error-boundary');
      const errorText = document.body.textContent;
      return errorText.includes('Something went wrong') || 
             errorText.includes('Unable to Load Page') ||
             errorText.includes('Suspense is not defined') ||
             !!errorElement;
    });
    
    if (hasErrorBoundary) {
      console.error('❌ ERROR BOUNDARY TRIGGERED!');
      const errorDetails = await page.evaluate(() => document.body.textContent);
      console.error('Error details:', errorDetails.substring(0, 500));
      
      // Take screenshot
      await page.screenshot({ path: 'mybag-error.png', fullPage: true });
      console.log('Error screenshot saved as mybag-error.png');
      
      process.exit(1);
    }
    
    // Check for dynamic import errors
    const hasDynamicImportError = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      return bodyText.includes('Failed to fetch dynamically imported module') ||
             bodyText.includes('Dynamic import error');
    });
    
    if (hasDynamicImportError) {
      console.error('❌ DYNAMIC IMPORT ERROR DETECTED!');
      process.exit(1);
    }
    
    // Check for auth/login modal (expected)
    const hasLoginModal = await page.evaluate(() => {
      return !!document.querySelector('[role="dialog"]') || 
             document.body.textContent.includes('Sign in') ||
             document.body.textContent.includes('Sign In');
    });
    
    if (hasLoginModal) {
      console.log('✅ Login modal detected (expected for unauthenticated user)');
    }
    
    // Check if main content is present
    const hasContent = await page.evaluate(() => {
      return document.body.textContent.includes('bag') ||
             document.body.textContent.includes('Bag') ||
             document.querySelector('[data-testid*="bag"]') !== null;
    });
    
    if (hasContent) {
      console.log('✅ Page content detected');
    }
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'mybag-test.png', fullPage: true });
    console.log('Screenshot saved as mybag-test.png');
    
    // Check memory usage
    const metrics = await page.metrics();
    console.log('\nMemory metrics:');
    console.log('- JS Heap Used:', Math.round(metrics.JSHeapUsedSize / 1024 / 1024), 'MB');
    console.log('- JS Heap Total:', Math.round(metrics.JSHeapTotalSize / 1024 / 1024), 'MB');
    
    // Final verdict
    if (!hasErrorBoundary && !hasDynamicImportError) {
      console.log('\n✅ TEST PASSED - No critical errors detected');
    } else {
      console.error('\n❌ TEST FAILED - Critical errors found');
      process.exit(1);
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
testMyBagPage().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});