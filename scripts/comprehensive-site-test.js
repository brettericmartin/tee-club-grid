import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Test configuration
const BASE_URL = 'http://localhost:3334';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword123';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test results tracking
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper function to log test results
function logTest(name, status, details = '') {
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  const color = status === 'pass' ? colors.green : status === 'fail' ? colors.red : colors.yellow;
  
  console.log(`${color}${icon} ${name}${colors.reset} ${details}`);
  
  if (status === 'pass') {
    testResults.passed.push(name);
  } else if (status === 'fail') {
    testResults.failed.push({ name, details });
  } else {
    testResults.warnings.push({ name, details });
  }
}

// Helper function to wait and check for elements
async function waitForElement(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

// Helper function to safely click elements
async function safeClick(page, selector, name) {
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    await page.click(selector);
    return true;
  } catch (error) {
    logTest(`Click ${name}`, 'fail', `Could not find or click: ${selector}`);
    return false;
  }
}

// Main test function
async function runComprehensiveTests() {
  console.log(`${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════════╗
║         COMPREHENSIVE SITE TEST - TEED.CLUB               ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const browser = await puppeteer.launch({
    headless: false, // Set to true for automated testing
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();
  
  // Set up console message logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      testResults.warnings.push({ 
        name: 'Console Error', 
        details: msg.text() 
      });
    }
  });

  // Set up network error logging
  page.on('pageerror', error => {
    testResults.warnings.push({ 
      name: 'Page Error', 
      details: error.message 
    });
  });

  try {
    // ====================================================================
    // TEST 1: LANDING PAGE
    // ====================================================================
    console.log(`\n${colors.bright}📄 Testing Landing Page${colors.reset}`);
    console.log('─'.repeat(40));
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    
    // Check main landing page elements
    const hasHero = await waitForElement(page, '[data-testid="hero-section"], .hero-section, main');
    logTest('Landing page loads', hasHero ? 'pass' : 'fail');
    
    // Check navigation
    const hasNav = await waitForElement(page, 'nav, header');
    logTest('Navigation bar present', hasNav ? 'pass' : 'fail');
    
    // Check Get Started button
    const hasGetStarted = await waitForElement(page, 'button, a') && await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a')).some(el => el.textContent?.includes('Get Started'));
    });
    logTest('Get Started button present', hasGetStarted ? 'pass' : 'fail');
    
    // Check equipment grid
    const hasEquipmentGrid = await waitForElement(page, '[data-testid="equipment-grid"], .gear-grid, [class*="equipment"], [class*="gear"]');
    logTest('Equipment grid displayed', hasEquipmentGrid ? 'pass' : 'fail');

    // ====================================================================
    // TEST 2: AUTHENTICATION FLOW
    // ====================================================================
    console.log(`\n${colors.bright}🔐 Testing Authentication${colors.reset}`);
    console.log('─'.repeat(40));
    
    // Try to navigate to login
    const loginButton = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button, a'));
      const signInEl = elements.find(el => 
        el.textContent?.toLowerCase().includes('sign in') || 
        el.textContent?.toLowerCase().includes('login')
      );
      if (signInEl) {
        signInEl.click();
        return true;
      }
      return false;
    });
    const loginClicked = loginButton;
    logTest('Sign In button found', loginClicked ? 'pass' : 'fail');
    
    if (loginClicked) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if we're on auth page
      const hasAuthForm = await waitForElement(page, 'input[type="email"], input[name="email"]');
      logTest('Auth form displayed', hasAuthForm ? 'pass' : 'fail');
      
      if (hasAuthForm) {
        // Try to fill in credentials
        try {
          await page.type('input[type="email"], input[name="email"]', TEST_EMAIL);
          await page.type('input[type="password"], input[name="password"]', TEST_PASSWORD);
          logTest('Auth form fillable', 'pass');
        } catch {
          logTest('Auth form fillable', 'fail', 'Could not fill form fields');
        }
      }
    }

    // ====================================================================
    // TEST 3: EQUIPMENT BROWSING
    // ====================================================================
    console.log(`\n${colors.bright}🏌️ Testing Equipment Browsing${colors.reset}`);
    console.log('─'.repeat(40));
    
    // Navigate to equipment page
    await page.goto(`${BASE_URL}/equipment`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if equipment loads
    const hasEquipmentCards = await waitForElement(page, '[data-testid="equipment-card"], [class*="equipment-card"], .equipment-item');
    logTest('Equipment cards load', hasEquipmentCards ? 'pass' : 'fail');
    
    // Check category filters
    const hasCategoryFilters = await waitForElement(page, '[data-testid="category-filter"], button') && 
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(b => b.textContent?.includes('Driver') || b.textContent?.includes('Irons'));
      });
    logTest('Category filters present', hasCategoryFilters ? 'pass' : 'fail');
    
    // Test search functionality
    const hasSearch = await waitForElement(page, 'input[type="search"], input[placeholder*="Search"]');
    logTest('Search bar present', hasSearch ? 'pass' : 'fail');
    
    if (hasSearch) {
      try {
        await page.type('input[type="search"], input[placeholder*="Search"]', 'Titleist');
        await new Promise(resolve => setTimeout(resolve, 1000));
        logTest('Search input works', 'pass');
      } catch {
        logTest('Search input works', 'fail');
      }
    }

    // ====================================================================
    // TEST 4: BAG MANAGEMENT
    // ====================================================================
    console.log(`\n${colors.bright}🎒 Testing Bag Management${colors.reset}`);
    console.log('─'.repeat(40));
    
    // Navigate to bags page
    await page.goto(`${BASE_URL}/bags`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if public bags load
    const hasBagCards = await waitForElement(page, '[data-testid="bag-card"], [class*="bag-card"], .bag-item');
    logTest('Public bags displayed', hasBagCards ? 'pass' : 'fail');
    
    // Check bag filters
    const hasBagFilters = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent?.includes('Following') || b.textContent?.includes('Trending'));
    });
    logTest('Bag filters present', hasBagFilters ? 'pass' : 'fail');

    // ====================================================================
    // TEST 5: MY BAG PAGE (Authenticated Features)
    // ====================================================================
    console.log(`\n${colors.bright}👤 Testing My Bag Features${colors.reset}`);
    console.log('─'.repeat(40));
    
    // Try to navigate to My Bag
    await page.goto(`${BASE_URL}/my-bag`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if redirected to auth or shows bag
    const currentUrl = page.url();
    if (currentUrl.includes('auth') || currentUrl.includes('login')) {
      logTest('My Bag requires auth', 'pass', 'Correctly redirects to auth');
    } else {
      // Check for bag management features
      const hasAddEquipment = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(b => b.textContent?.includes('Add Equipment') || b.textContent?.includes('Add Club'));
      });
      logTest('Add Equipment button', hasAddEquipment ? 'pass' : 'warning', 'May require auth');
      
      const hasEditBag = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(b => b.textContent?.includes('Edit') || b.textContent?.includes('Customize'));
      });
      logTest('Edit Bag button', hasEditBag ? 'pass' : 'warning', 'May require auth');
    }

    // ====================================================================
    // TEST 6: FEED FUNCTIONALITY
    // ====================================================================
    console.log(`\n${colors.bright}📰 Testing Feed${colors.reset}`);
    console.log('─'.repeat(40));
    
    // Navigate to feed
    await page.goto(`${BASE_URL}/feed`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if feed posts load
    const hasFeedPosts = await waitForElement(page, '[data-testid="feed-post"], [class*="feed-post"], .feed-item');
    logTest('Feed posts displayed', hasFeedPosts ? 'pass' : 'fail');
    
    // Check for like/tee buttons
    const hasTeeButtons = await waitForElement(page, 'button[aria-label*="tee"], button[aria-label*="like"], .tee-button');
    logTest('Tee buttons present', hasTeeButtons ? 'pass' : 'fail');
    
    // Check for create post button
    const hasCreatePost = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent?.includes('Create Post') || b.textContent?.includes('Share'));
    });
    logTest('Create post option', hasCreatePost ? 'pass' : 'warning', 'May require auth');

    // ====================================================================
    // TEST 7: RESPONSIVE DESIGN
    // ====================================================================
    console.log(`\n${colors.bright}📱 Testing Responsive Design${colors.reset}`);
    console.log('─'.repeat(40));
    
    // Test mobile viewport
    await page.setViewport({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check mobile menu
    const hasMobileMenu = await waitForElement(page, 'button[aria-label*="menu"], .mobile-menu-toggle, .hamburger');
    logTest('Mobile menu button', hasMobileMenu ? 'pass' : 'fail');
    
    // Reset viewport
    await page.setViewport({ width: 1280, height: 800 });

    // ====================================================================
    // TEST 8: ERROR HANDLING
    // ====================================================================
    console.log(`\n${colors.bright}⚠️ Testing Error Handling${colors.reset}`);
    console.log('─'.repeat(40));
    
    // Test 404 page
    await page.goto(`${BASE_URL}/nonexistent-page-12345`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const has404 = await page.evaluate(() => {
      const bodyText = document.body.textContent?.toLowerCase() || '';
      return bodyText.includes('404') || bodyText.includes('not found');
    });
    logTest('404 page handling', has404 ? 'pass' : 'warning', 'Should show 404 page');

    // ====================================================================
    // TEST 9: NAVIGATION LINKS
    // ====================================================================
    console.log(`\n${colors.bright}🔗 Testing Navigation Links${colors.reset}`);
    console.log('─'.repeat(40));
    
    await page.goto(BASE_URL);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test main nav links
    const navLinks = [
      { text: 'Equipment', name: 'Equipment link' },
      { text: 'Bags', name: 'Bags link' },
      { text: 'Feed', name: 'Feed link' },
      { text: 'My Bag', name: 'My Bag link' }
    ];
    
    for (const link of navLinks) {
      const hasLink = await page.evaluate((text) => {
        return Array.from(document.querySelectorAll('a, button')).some(el => 
          el.textContent?.toLowerCase().includes(text.toLowerCase())
        );
      }, link.text);
      logTest(link.name, hasLink ? 'pass' : 'fail');
    }

    // ====================================================================
    // TEST 10: PERFORMANCE CHECKS
    // ====================================================================
    console.log(`\n${colors.bright}⚡ Testing Performance${colors.reset}`);
    console.log('─'.repeat(40));
    
    // Measure page load time
    const startTime = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    const loadTime = Date.now() - startTime;
    
    logTest('Page load time', loadTime < 3000 ? 'pass' : 'warning', `${loadTime}ms`);
    
    // Check for lazy loading
    const hasLazyImages = await page.evaluate(() => {
      const images = document.querySelectorAll('img[loading="lazy"]');
      return images.length > 0;
    });
    logTest('Lazy loading implemented', hasLazyImages ? 'pass' : 'warning');

  } catch (error) {
    console.error(`${colors.red}Test execution error:${colors.reset}`, error);
    testResults.failed.push({ name: 'Test Execution', details: error.message });
  } finally {
    await browser.close();
  }

  // ====================================================================
  // SUMMARY REPORT
  // ====================================================================
  console.log(`\n${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════════╗
║                      TEST SUMMARY                          ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  console.log(`${colors.green}✅ Passed: ${testResults.passed.length}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${testResults.failed.length}${colors.reset}`);
  console.log(`${colors.yellow}⚠️ Warnings: ${testResults.warnings.length}${colors.reset}`);

  if (testResults.failed.length > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    testResults.failed.forEach(test => {
      console.log(`  • ${test.name}: ${test.details}`);
    });
  }

  if (testResults.warnings.length > 0) {
    console.log(`\n${colors.yellow}Warnings:${colors.reset}`);
    testResults.warnings.forEach(warning => {
      console.log(`  • ${warning.name}: ${warning.details}`);
    });
  }

  // Calculate success rate
  const total = testResults.passed.length + testResults.failed.length;
  const successRate = total > 0 ? (testResults.passed.length / total * 100).toFixed(1) : 0;
  
  console.log(`\n${colors.bright}Success Rate: ${successRate}%${colors.reset}`);
  
  // Exit with appropriate code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Run the tests
runComprehensiveTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});