import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const APP_URL = process.env.VITE_APP_URL || 'http://localhost:5173';

async function debugVideoFeedCrash() {
  console.log('🔍 Debugging Video Feed Crash with Puppeteer\n');
  console.log('='.repeat(50));
  
  let browser;
  
  try {
    // Launch browser with debugging options
    browser = await puppeteer.launch({
      headless: false, // Run in headful mode to see what's happening
      devtools: true,  // Open DevTools automatically
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
      slowMo: 100 // Slow down operations to observe
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error') {
        console.log('❌ Console Error:', msg.text());
        msg.args().forEach(async (arg) => {
          const val = await arg.jsonValue();
          if (val && val.stack) {
            console.log('   Stack:', val.stack);
          }
        });
      } else if (type === 'warning') {
        console.log('⚠️  Console Warning:', msg.text());
      } else {
        console.log('📝 Console:', msg.text());
      }
    });
    
    // Listen for page errors
    page.on('error', error => {
      console.log('❌ Page Error:', error.message);
      console.log('   Stack:', error.stack);
    });
    
    // Listen for page crashes
    page.on('pageerror', error => {
      console.log('💥 Page Crash:', error.message);
      console.log('   Stack:', error.stack);
    });
    
    // Listen for request failures
    page.on('requestfailed', request => {
      console.log('❌ Request Failed:', request.url());
      console.log('   Failure:', request.failure().errorText);
    });
    
    // Listen for uncaught exceptions
    await page.evaluateOnNewDocument(() => {
      window.addEventListener('error', (e) => {
        console.error('Uncaught error:', e.message, e.filename, e.lineno, e.colno, e.error);
      });
      
      window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
      });
    });
    
    console.log(`\n📱 Navigating to ${APP_URL}...`);
    
    try {
      await page.goto(APP_URL, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      console.log('✅ Page loaded successfully');
    } catch (error) {
      console.log('❌ Error loading page:', error.message);
    }
    
    // Wait a bit to see if there are any initial errors
    await page.waitForTimeout(2000);
    
    // Check if the feed is visible
    console.log('\n🔍 Checking for feed...');
    
    try {
      // Try to find the feed
      const feedExists = await page.evaluate(() => {
        // Check for various feed-related elements
        const feedSelectors = [
          '[data-testid="feed"]',
          '.feed-container',
          '[class*="feed"]',
          'main',
          '#root'
        ];
        
        for (const selector of feedSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            console.log(`Found element: ${selector}`);
            return true;
          }
        }
        return false;
      });
      
      if (feedExists) {
        console.log('✅ Feed container found');
      } else {
        console.log('⚠️  No feed container found');
      }
      
      // Check for video posts specifically
      console.log('\n🎬 Checking for video posts...');
      
      const videoPostInfo = await page.evaluate(() => {
        // Look for video-related elements
        const videoElements = document.querySelectorAll('[class*="video"], iframe, video');
        const feedPosts = document.querySelectorAll('[class*="feed-item"], [class*="FeedItem"], [class*="post"]');
        
        return {
          videoElementsCount: videoElements.length,
          feedPostsCount: feedPosts.length,
          hasIframe: !!document.querySelector('iframe'),
          hasVideoTag: !!document.querySelector('video'),
          bodyHTML: document.body.innerHTML.substring(0, 500)
        };
      });
      
      console.log('📊 Page Analysis:');
      console.log(`   Feed posts found: ${videoPostInfo.feedPostsCount}`);
      console.log(`   Video elements found: ${videoPostInfo.videoElementsCount}`);
      console.log(`   Has iframe: ${videoPostInfo.hasIframe}`);
      console.log(`   Has video tag: ${videoPostInfo.hasVideoTag}`);
      
      if (videoPostInfo.feedPostsCount === 0) {
        console.log('\n⚠️  No feed posts found. Checking page structure...');
        console.log('   First 500 chars of body:', videoPostInfo.bodyHTML);
      }
      
      // Check for React errors
      console.log('\n⚙️  Checking for React errors...');
      
      const reactErrors = await page.evaluate(() => {
        const errorBoundary = document.querySelector('[class*="error"], [class*="Error"]');
        const reactRoot = document.getElementById('root');
        
        return {
          hasErrorBoundary: !!errorBoundary,
          errorBoundaryText: errorBoundary?.textContent || null,
          reactRootExists: !!reactRoot,
          reactRootEmpty: reactRoot ? reactRoot.children.length === 0 : null,
          reactRootHTML: reactRoot ? reactRoot.innerHTML.substring(0, 200) : null
        };
      });
      
      console.log('   React root exists:', reactErrors.reactRootExists);
      console.log('   React root empty:', reactErrors.reactRootEmpty);
      console.log('   Has error boundary:', reactErrors.hasErrorBoundary);
      if (reactErrors.errorBoundaryText) {
        console.log('   Error text:', reactErrors.errorBoundaryText);
      }
      if (reactErrors.reactRootHTML) {
        console.log('   Root HTML preview:', reactErrors.reactRootHTML);
      }
      
      // Try navigating to feed directly
      console.log('\n🔄 Attempting to navigate to /feed...');
      
      await page.goto(`${APP_URL}/feed`, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      await page.waitForTimeout(2000);
      
      // Check for errors after navigation
      const feedPageStatus = await page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          hasContent: document.body.children.length > 0,
          errors: window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.rendererInterfaces?.size || 0
        };
      });
      
      console.log('\n📍 Feed Page Status:');
      console.log('   URL:', feedPageStatus.url);
      console.log('   Title:', feedPageStatus.title);
      console.log('   Has content:', feedPageStatus.hasContent);
      
      // Take a screenshot for debugging
      console.log('\n📸 Taking screenshot...');
      await page.screenshot({ 
        path: 'debug-feed-crash.png',
        fullPage: true 
      });
      console.log('   Screenshot saved as: debug-feed-crash.png');
      
      // Check network tab for failed requests
      console.log('\n🌐 Checking for network issues...');
      
      const failedRequests = [];
      page.on('requestfailed', request => {
        failedRequests.push({
          url: request.url(),
          error: request.failure().errorText
        });
      });
      
      // Reload to capture any failed requests
      await page.reload({ waitUntil: 'networkidle2' });
      
      if (failedRequests.length > 0) {
        console.log('❌ Failed requests:');
        failedRequests.forEach(req => {
          console.log(`   ${req.url}: ${req.error}`);
        });
      } else {
        console.log('✅ No failed network requests');
      }
      
      // Keep browser open for manual inspection
      console.log('\n' + '='.repeat(50));
      console.log('🔍 Browser will stay open for manual inspection.');
      console.log('   Check the DevTools console for errors.');
      console.log('   Press Ctrl+C to close.');
      
      // Wait indefinitely
      await new Promise(() => {});
      
    } catch (error) {
      console.error('❌ Error during debugging:', error);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    if (browser) {
      // Browser will be closed when script is terminated
    }
  }
}

debugVideoFeedCrash().catch(console.error);