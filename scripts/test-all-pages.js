import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAllPages() {
  console.log('🚀 Starting comprehensive page testing...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set viewport
  await page.setViewport({ width: 1280, height: 720 });
  
  // Listen for console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    // Filter out normal debug messages
    if (type === 'error' || text.includes('Error') || text.includes('TypeError')) {
      console.log(`❌ Console ${type}: ${text}`);
    }
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.log(`❌ Page error: ${error.message}`);
  });
  
  // Listen for request failures
  page.on('requestfailed', request => {
    if (!request.url().includes('supabase') && !request.url().includes('vercel')) {
      console.log(`❌ Request failed: ${request.url()}`);
    }
  });
  
  const pagesToTest = [
    { path: '/', name: 'Home/Feed' },
    { path: '/equipment', name: 'Equipment Browser' },
    { path: '/my-bag', name: 'My Bag' },
    { path: '/bags-browser', name: 'Bags Browser' },
    { path: '/forum', name: 'Forum' },
    { path: '/waitlist', name: 'Waitlist' },
    { path: '/patch-notes', name: 'Patch Notes' }
  ];
  
  const results = [];
  
  for (const pageInfo of pagesToTest) {
    console.log(`\n📄 Testing ${pageInfo.name} (${pageInfo.path})...`);
    
    try {
      const startTime = Date.now();
      
      // Navigate to the page
      const response = await page.goto(`http://localhost:3333${pageInfo.path}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      const loadTime = Date.now() - startTime;
      
      // Check response status
      const status = response.status();
      if (status >= 400) {
        throw new Error(`HTTP ${status}`);
      }
      
      // Wait a bit for any async errors to surface
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check for error boundaries
      const hasErrorBoundary = await page.evaluate(() => {
        const errorElements = document.querySelectorAll('[data-error-boundary], .error-boundary, h1');
        for (const el of errorElements) {
          if (el.textContent && (
            el.textContent.includes('Something went wrong') ||
            el.textContent.includes('Error') ||
            el.textContent.includes('Oops')
          )) {
            return true;
          }
        }
        return false;
      });
      
      if (hasErrorBoundary) {
        throw new Error('Error boundary triggered');
      }
      
      // Check for main content
      const hasContent = await page.evaluate(() => {
        return document.body.children.length > 0;
      });
      
      if (!hasContent) {
        throw new Error('Page has no content');
      }
      
      // Take a screenshot for visual verification
      await page.screenshot({
        path: `scripts/screenshots/${pageInfo.path.replace(/\//g, '_') || 'home'}.png`
      });
      
      results.push({
        page: pageInfo.name,
        path: pageInfo.path,
        status: '✅ Success',
        loadTime: `${loadTime}ms`,
        error: null
      });
      
      console.log(`  ✅ ${pageInfo.name} loaded successfully (${loadTime}ms)`);
      
    } catch (error) {
      results.push({
        page: pageInfo.name,
        path: pageInfo.path,
        status: '❌ Failed',
        loadTime: 'N/A',
        error: error.message
      });
      
      console.log(`  ❌ ${pageInfo.name} failed: ${error.message}`);
      
      // Take error screenshot
      await page.screenshot({
        path: `scripts/screenshots/error_${pageInfo.path.replace(/\//g, '_') || 'home'}.png`
      });
    }
  }
  
  // Test authenticated pages
  console.log('\n🔐 Testing authenticated user flow...');
  
  try {
    // Go to My Bag page (should redirect to waitlist if not authenticated)
    await page.goto('http://localhost:3333/my-bag', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Check if we're on waitlist or my-bag
    const currentUrl = page.url();
    if (currentUrl.includes('waitlist')) {
      console.log('  ℹ️  Redirected to waitlist (not authenticated)');
    } else {
      console.log('  ✅ My Bag page accessible (authenticated)');
      
      // Check for the specific error we fixed
      const hasEquipmentError = await page.evaluate(() => {
        const errorText = document.body.textContent || '';
        return errorText.includes("can't access property") || 
               errorText.includes("item.equipment is null");
      });
      
      if (hasEquipmentError) {
        console.log('  ❌ Equipment null error still present!');
      } else {
        console.log('  ✅ No equipment null errors detected');
      }
    }
  } catch (error) {
    console.log(`  ❌ Auth flow test failed: ${error.message}`);
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  console.table(results);
  
  const successCount = results.filter(r => r.status.includes('✅')).length;
  const failCount = results.filter(r => r.status.includes('❌')).length;
  
  console.log(`\n✅ Passed: ${successCount}/${results.length}`);
  console.log(`❌ Failed: ${failCount}/${results.length}`);
  
  if (failCount > 0) {
    console.log('\n⚠️  Some pages have errors. Check screenshots in scripts/screenshots/');
  } else {
    console.log('\n🎉 All pages loaded successfully!');
  }
  
  await browser.close();
  
  return failCount === 0;
}

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Run the tests
testAllPages()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });