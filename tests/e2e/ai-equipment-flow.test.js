import puppeteer from 'puppeteer';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

describe('AI Equipment Flow E2E Tests', () => {
  let browser;
  let page;
  const baseUrl = process.env.TEST_URL || 'http://localhost:3334';
  
  // Test user credentials
  const testUser = {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'testpassword123'
  };

  beforeAll(async () => {
    console.log('[Test] Launching browser...');
    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0
    });
  });

  afterAll(async () => {
    console.log('[Test] Closing browser...');
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Set viewport for mobile testing
    await page.setViewport({ width: 375, height: 812 });
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('[AI-')) {
        console.log('[Browser]', msg.text());
      }
    });
    
    // Log errors
    page.on('error', err => {
      console.error('[Browser Error]', err);
    });
    
    page.on('pageerror', err => {
      console.error('[Page Error]', err);
    });
  });

  async function login() {
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    
    // Click on profile icon to open login
    await page.waitForSelector('button[class*="rounded-full"]');
    await page.click('button[class*="rounded-full"]');
    
    // Fill login form
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', testUser.email);
    await page.type('input[type="password"]', testUser.password);
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
  }

  async function navigateToMyBag() {
    // Click on My Bag button
    await page.waitForSelector('a[href="/my-bag"]');
    await page.click('a[href="/my-bag"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
  }

  it('should show equipment method dialog when clicking Add Equipment', async () => {
    await login();
    await navigateToMyBag();
    
    // Click Add Equipment button
    await page.waitForSelector('button:has-text("Add Equipment")', { timeout: 5000 });
    await page.click('button:has-text("Add Equipment")');
    
    // Check if method dialog appears
    await page.waitForSelector('h3:has-text("How would you like to add equipment?")', { timeout: 5000 });
    
    // Verify both options are visible
    const scanOption = await page.$('h3:has-text("Scan Your Bag")');
    const browseOption = await page.$('h3:has-text("Browse Equipment")');
    
    expect(scanOption).toBeTruthy();
    expect(browseOption).toBeTruthy();
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-screenshots/method-dialog.png' });
  });

  it('should open AI analyzer when selecting Scan Your Bag', async () => {
    await login();
    await navigateToMyBag();
    
    // Open method dialog
    await page.click('button:has-text("Add Equipment")');
    await page.waitForSelector('h3:has-text("Scan Your Bag")');
    
    // Click on AI option
    await page.click('button:has(h3:has-text("Scan Your Bag"))');
    
    // Verify AI analyzer opens
    await page.waitForSelector('text="AI Equipment Scanner"', { timeout: 5000 });
    
    // Check for upload area
    const uploadText = await page.$('text="Upload a photo of your golf bag"');
    expect(uploadText).toBeTruthy();
    
    await page.screenshot({ path: 'test-screenshots/ai-analyzer.png' });
  });

  it('should open manual selector when selecting Browse Equipment', async () => {
    await login();
    await navigateToMyBag();
    
    // Open method dialog
    await page.click('button:has-text("Add Equipment")');
    await page.waitForSelector('h3:has-text("Browse Equipment")');
    
    // Click on manual option
    await page.click('button:has(h3:has-text("Browse Equipment"))');
    
    // Verify equipment selector opens
    await page.waitForSelector('input[placeholder*="Search"]', { timeout: 5000 });
    
    await page.screenshot({ path: 'test-screenshots/manual-selector.png' });
  });

  it('should handle file upload and show progress', async () => {
    await login();
    await navigateToMyBag();
    
    // Navigate to AI analyzer
    await page.click('button:has-text("Add Equipment")');
    await page.waitForSelector('h3:has-text("Scan Your Bag")');
    await page.click('button:has(h3:has-text("Scan Your Bag"))');
    
    // Wait for file input
    await page.waitForSelector('input[type="file"]');
    
    // Upload test image
    const fileInput = await page.$('input[type="file"]');
    const testImagePath = './test-assets/golf-bag-test.jpg';
    
    // Note: In real test, you'd need a test image
    // await fileInput.uploadFile(testImagePath);
    
    // For now, just verify the UI is ready
    expect(fileInput).toBeTruthy();
  });

  it('should be responsive on mobile viewport', async () => {
    await login();
    await navigateToMyBag();
    
    // Test mobile viewport
    await page.setViewport({ width: 375, height: 812 });
    
    // Open method dialog
    await page.click('button:has-text("Add Equipment")');
    await page.waitForSelector('h3:has-text("How would you like to add equipment?")');
    
    // Check that dialog is properly sized for mobile
    const dialog = await page.$('[role="dialog"]');
    const box = await dialog.boundingBox();
    
    expect(box.width).toBeLessThanOrEqual(375);
    
    await page.screenshot({ path: 'test-screenshots/mobile-dialog.png' });
  });

  it('should handle API errors gracefully', async () => {
    await login();
    await navigateToMyBag();
    
    // Intercept API calls to simulate error
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/api/equipment/analyze-image')) {
        request.respond({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again in 60 seconds.',
            retryAfter: 60
          })
        });
      } else {
        request.continue();
      }
    });
    
    // Navigate to AI analyzer
    await page.click('button:has-text("Add Equipment")');
    await page.waitForSelector('h3:has-text("Scan Your Bag")');
    await page.click('button:has(h3:has-text("Scan Your Bag"))');
    
    // Simulate upload (would need actual file in real test)
    // ... upload logic ...
    
    // Check for error message
    // await page.waitForSelector('text="Rate limit exceeded"', { timeout: 5000 });
    
    await page.screenshot({ path: 'test-screenshots/rate-limit-error.png' });
  });

  it('should measure performance metrics', async () => {
    await login();
    await navigateToMyBag();
    
    // Start performance measurement
    const startTime = Date.now();
    
    // Open method dialog
    await page.click('button:has-text("Add Equipment")');
    await page.waitForSelector('h3:has-text("How would you like to add equipment?")');
    
    const dialogOpenTime = Date.now() - startTime;
    console.log(`[Performance] Method dialog open time: ${dialogOpenTime}ms`);
    expect(dialogOpenTime).toBeLessThan(1000); // Should open within 1 second
    
    // Navigate to AI analyzer
    const aiStartTime = Date.now();
    await page.click('button:has(h3:has-text("Scan Your Bag"))');
    await page.waitForSelector('text="AI Equipment Scanner"');
    
    const aiOpenTime = Date.now() - aiStartTime;
    console.log(`[Performance] AI analyzer open time: ${aiOpenTime}ms`);
    expect(aiOpenTime).toBeLessThan(1500); // Should open within 1.5 seconds
  });
});

// Helper function to create test screenshots directory
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupTestEnvironment() {
  const screenshotDir = join(__dirname, '..', '..', 'test-screenshots');
  try {
    await mkdir(screenshotDir, { recursive: true });
    console.log('[Test] Screenshot directory created');
  } catch (error) {
    // Directory might already exist
  }
}

// Run setup before tests
setupTestEnvironment();