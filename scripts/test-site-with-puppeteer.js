import puppeteer from 'puppeteer';

async function testSite() {
  console.log('🚀 Launching Puppeteer browser...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Listen for console messages
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        console.error('❌ Browser Console Error:', text);
      } else if (text.includes('error') || text.includes('Error')) {
        console.error('⚠️ Browser Console Warning:', text);
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      console.error('💥 Page Error:', error.message);
    });
    
    // Listen for request failures
    page.on('requestfailed', request => {
      console.error('🔴 Request Failed:', request.url(), '-', request.failure().errorText);
    });
    
    console.log('📍 Navigating to http://localhost:3333/my-bag...');
    
    // Try to navigate to the page
    try {
      const response = await page.goto('http://localhost:3333/my-bag', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      console.log('📊 Response status:', response.status());
      
      // Check if there's an error message on the page
      const errorElements = await page.$$eval('[class*="error"], [class*="Error"]', elements => 
        elements.map(el => ({
          text: el.textContent,
          className: el.className
        }))
      );
      
      if (errorElements.length > 0) {
        console.error('🚨 Error elements found on page:');
        errorElements.forEach(err => {
          console.error(`  - ${err.className}: ${err.text}`);
        });
      }
      
      // Try to click on "Add Equipment" button if it exists
      console.log('🔍 Looking for Add Equipment button...');
      
      try {
        // Wait for the button to appear
        await page.waitForSelector('button:has-text("Add Equipment"), button:has-text("Add equipment")', {
          timeout: 5000
        });
        
        console.log('✅ Found Add Equipment button');
        
        // Click the button
        await page.click('button:has-text("Add Equipment"), button:has-text("Add equipment")');
        
        console.log('👆 Clicked Add Equipment button');
        
        // Wait a bit to see if dialog opens
        await page.waitForTimeout(2000);
        
        // Check if dialog opened
        const dialogPresent = await page.$('[role="dialog"]');
        if (dialogPresent) {
          console.log('✅ Equipment selector dialog opened successfully');
        } else {
          console.log('⚠️ Dialog did not open');
        }
        
      } catch (error) {
        console.log('⚠️ Add Equipment button not found or not clickable:', error.message);
      }
      
      // Take a screenshot
      console.log('📸 Taking screenshot...');
      await page.screenshot({ 
        path: '/home/brettm/development/tee-club-grid/scripts/puppeteer-test.png',
        fullPage: true 
      });
      console.log('📸 Screenshot saved to scripts/puppeteer-test.png');
      
      // Get the page title
      const title = await page.title();
      console.log('📄 Page title:', title);
      
      // Check for React errors
      const reactErrors = await page.evaluate(() => {
        const errorBoundary = document.querySelector('[class*="ErrorBoundary"]');
        return errorBoundary ? errorBoundary.textContent : null;
      });
      
      if (reactErrors) {
        console.error('🚨 React ErrorBoundary caught an error:', reactErrors);
      }
      
      console.log('✅ Page loaded successfully');
      
    } catch (navigationError) {
      console.error('❌ Navigation failed:', navigationError.message);
      
      // Take a screenshot of the error state
      await page.screenshot({ 
        path: '/home/brettm/development/tee-club-grid/scripts/puppeteer-error.png',
        fullPage: true 
      });
      console.log('📸 Error screenshot saved to scripts/puppeteer-error.png');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

// Run the test
testSite().catch(console.error);