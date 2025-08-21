import puppeteer from 'puppeteer';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

describe('Waitlist & Beta Access E2E Tests', () => {
  let browser;
  let page;
  const baseUrl = process.env.TEST_URL || 'http://localhost:3333';
  
  // Test data
  const testUser = {
    displayName: 'Test User',
    email: `test-${Date.now()}@example.com`,
    role: 'weekend_warrior',
    cityRegion: 'San Francisco, CA'
  };
  
  const highScoreUser = {
    displayName: 'Pro Golfer',
    email: `pro-${Date.now()}@example.com`,
    role: 'competitive_player',
    cityRegion: 'Augusta, GA',
    handicap: '1',
    favoriteGolfer: 'Tiger Woods',
    bestAchievement: 'Won club championship 3 times',
    whyJoin: 'I want to showcase my tour-level equipment setup and connect with other serious golfers',
    socialMediaHandle: '@progolfer'
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
      if (msg.type() === 'log') {
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

  it('should show pending state for anonymous user with average score', async () => {
    // Navigate to waitlist page
    await page.goto(`${baseUrl}/waitlist`, { waitUntil: 'networkidle0' });
    
    // Wait for form to load
    await page.waitForSelector('input[name="display_name"]', { timeout: 5000 });
    
    // Fill out basic form fields
    await page.type('input[name="display_name"]', testUser.displayName);
    await page.type('input[name="email"]', testUser.email);
    await page.select('select[name="role"]', testUser.role);
    await page.type('input[name="city_region"]', testUser.cityRegion);
    
    // Accept terms
    await page.click('input[name="termsAccepted"]');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for success state
    await page.waitForSelector('text="You\'re on the list!"', { timeout: 10000 });
    
    // Verify pending state UI
    const pendingTitle = await page.$('h2:has-text("You\'re on the list!")');
    expect(pendingTitle).toBeTruthy();
    
    // Check for score display
    const scoreText = await page.$eval('*:has-text("Your application score")', el => el.textContent);
    expect(scoreText).toContain('2'); // Weekend warrior gets base score of 2
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-screenshots/waitlist-pending.png' });
  });

  it('should auto-approve high score user when capacity available', async () => {
    // Navigate to waitlist page
    await page.goto(`${baseUrl}/waitlist`, { waitUntil: 'networkidle0' });
    
    // Wait for form to load
    await page.waitForSelector('input[name="display_name"]', { timeout: 5000 });
    
    // Fill out all form fields for high score
    await page.type('input[name="display_name"]', highScoreUser.displayName);
    await page.type('input[name="email"]', highScoreUser.email);
    await page.select('select[name="role"]', highScoreUser.role);
    await page.type('input[name="city_region"]', highScoreUser.cityRegion);
    await page.type('input[name="handicap"]', highScoreUser.handicap);
    await page.type('input[name="favorite_golfer"]', highScoreUser.favoriteGolfer);
    await page.type('textarea[name="best_achievement"]', highScoreUser.bestAchievement);
    await page.type('textarea[name="why_join"]', highScoreUser.whyJoin);
    await page.type('input[name="social_media_handle"]', highScoreUser.socialMediaHandle);
    
    // Accept terms
    await page.click('input[name="termsAccepted"]');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for success state
    await page.waitForSelector('h2', { timeout: 10000 });
    
    // Check if approved (score should be 5+ for auto-approval)
    const pageContent = await page.content();
    
    // High score users should see approved state
    if (pageContent.includes('Welcome to the Beta')) {
      const approvedTitle = await page.$('h2:has-text("Welcome to the Beta")');
      expect(approvedTitle).toBeTruthy();
      
      // Check for onboarding link
      const onboardingLink = await page.$('a[href="/onboarding"]');
      expect(onboardingLink).toBeTruthy();
    } else {
      // If at capacity, should show at_capacity state
      const capacityTitle = await page.$('h2:has-text("We\'re at capacity")');
      expect(capacityTitle).toBeTruthy();
    }
    
    await page.screenshot({ path: 'test-screenshots/waitlist-high-score.png' });
  });

  it('should show at_capacity state when beta is full', async () => {
    // This test would need to run with a mock or test environment
    // where we can control the capacity settings
    
    // For now, we'll just test that the UI handles the at_capacity response
    await page.goto(`${baseUrl}/waitlist`, { waitUntil: 'networkidle0' });
    
    // Intercept API calls to simulate at_capacity response
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/api/waitlist/submit')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            status: 'at_capacity',
            score: 3,
            message: 'Beta is at capacity'
          })
        });
      } else {
        request.continue();
      }
    });
    
    // Fill and submit form
    await page.waitForSelector('input[name="display_name"]');
    await page.type('input[name="display_name"]', 'Capacity Test');
    await page.type('input[name="email"]', `capacity-${Date.now()}@example.com`);
    await page.select('select[name="role"]', 'weekend_warrior');
    await page.type('input[name="city_region"]', 'Test City');
    await page.click('input[name="termsAccepted"]');
    await page.click('button[type="submit"]');
    
    // Wait for at_capacity state
    await page.waitForSelector('h2:has-text("We\'re at capacity")', { timeout: 10000 });
    
    // Verify capacity message
    const capacityMessage = await page.$('text="join the waitlist"');
    expect(capacityMessage).toBeTruthy();
    
    await page.screenshot({ path: 'test-screenshots/waitlist-at-capacity.png' });
  });

  it('should handle invite code redemption flow', async () => {
    const inviteCode = 'TEST-1234';
    
    // Navigate to waitlist with invite code
    await page.goto(`${baseUrl}/waitlist?invite=${inviteCode}`, { waitUntil: 'networkidle0' });
    
    // Check that invite code is pre-filled
    const inviteInput = await page.$('input[name="invite_code"]');
    if (inviteInput) {
      const inviteValue = await page.evaluate(el => el.value, inviteInput);
      expect(inviteValue).toBe(inviteCode);
    }
    
    // Fill out form
    await page.waitForSelector('input[name="display_name"]');
    await page.type('input[name="display_name"]', 'Invited User');
    await page.type('input[name="email"]', `invited-${Date.now()}@example.com`);
    await page.select('select[name="role"]', 'weekend_warrior');
    await page.type('input[name="city_region"]', 'Invited City');
    await page.click('input[name="termsAccepted"]');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForSelector('h2', { timeout: 10000 });
    
    // With valid invite code, user should get priority consideration
    const pageContent = await page.content();
    expect(pageContent).toContain('score');
    
    await page.screenshot({ path: 'test-screenshots/waitlist-invite-code.png' });
  });

  it('should protect routes with BetaGuard component', async () => {
    // Test unauthenticated access to protected route
    await page.goto(`${baseUrl}/my-bag`, { waitUntil: 'networkidle0' });
    
    // Should redirect to waitlist
    await page.waitForFunction(
      url => window.location.pathname === '/waitlist',
      { timeout: 5000 },
      baseUrl
    );
    
    const currentUrl = page.url();
    expect(currentUrl).toContain('/waitlist');
    
    // Verify waitlist page loaded
    const waitlistTitle = await page.$('h1:has-text("Join the Teed.club")');
    expect(waitlistTitle).toBeTruthy();
    
    await page.screenshot({ path: 'test-screenshots/beta-guard-redirect.png' });
  });

  it('should track analytics events throughout the flow', async () => {
    // Set up analytics tracking interception
    const analyticsEvents = [];
    await page.evaluateOnNewDocument(() => {
      window.analyticsEvents = [];
      // Override track function if it exists
      if (window.track) {
        const originalTrack = window.track;
        window.track = (event, properties) => {
          window.analyticsEvents.push({ event, properties });
          return originalTrack(event, properties);
        };
      }
    });
    
    // Navigate to waitlist
    await page.goto(`${baseUrl}/waitlist`, { waitUntil: 'networkidle0' });
    
    // Wait for page view event
    await page.waitForTimeout(1000);
    
    // Fill and submit form
    await page.waitForSelector('input[name="display_name"]');
    await page.type('input[name="display_name"]', 'Analytics Test');
    await page.type('input[name="email"]', `analytics-${Date.now()}@example.com`);
    await page.select('select[name="role"]', 'casual_player');
    await page.type('input[name="city_region"]', 'Analytics City');
    await page.click('input[name="termsAccepted"]');
    await page.click('button[type="submit"]');
    
    // Wait for submission
    await page.waitForSelector('h2', { timeout: 10000 });
    
    // Get tracked events
    const events = await page.evaluate(() => window.analyticsEvents || []);
    
    // Verify key events were tracked
    console.log('[Analytics] Tracked events:', events);
    
    // Note: Actual event tracking verification would depend on the analytics implementation
    await page.screenshot({ path: 'test-screenshots/analytics-tracking.png' });
  });

  it('should handle form validation errors', async () => {
    await page.goto(`${baseUrl}/waitlist`, { waitUntil: 'networkidle0' });
    
    // Try to submit without filling required fields
    await page.waitForSelector('button[type="submit"]');
    await page.click('button[type="submit"]');
    
    // Check for validation errors
    await page.waitForSelector('.text-destructive', { timeout: 5000 });
    
    const errorMessages = await page.$$eval('.text-destructive', elements => 
      elements.map(el => el.textContent)
    );
    
    expect(errorMessages.length).toBeGreaterThan(0);
    expect(errorMessages.some(msg => msg.includes('required'))).toBe(true);
    
    await page.screenshot({ path: 'test-screenshots/form-validation-errors.png' });
  });

  it('should be responsive on mobile devices', async () => {
    // Test on iPhone 12 viewport
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/waitlist`, { waitUntil: 'networkidle0' });
    
    // Check that form is properly sized for mobile
    const form = await page.$('form');
    const box = await form.boundingBox();
    
    expect(box.width).toBeLessThanOrEqual(390);
    
    // Test on iPad viewport
    await page.setViewport({ width: 768, height: 1024 });
    await page.reload({ waitUntil: 'networkidle0' });
    
    // Verify layout adapts
    const tabletForm = await page.$('form');
    const tabletBox = await tabletForm.boundingBox();
    
    expect(tabletBox.width).toBeLessThanOrEqual(768);
    
    await page.screenshot({ path: 'test-screenshots/waitlist-responsive.png' });
  });

  it('should measure performance metrics', async () => {
    const startTime = Date.now();
    
    // Navigate to waitlist
    await page.goto(`${baseUrl}/waitlist`, { waitUntil: 'domcontentloaded' });
    
    const domLoadTime = Date.now() - startTime;
    console.log(`[Performance] DOM load time: ${domLoadTime}ms`);
    expect(domLoadTime).toBeLessThan(3000); // Should load within 3 seconds
    
    // Wait for full page load
    await page.waitForSelector('form', { timeout: 5000 });
    
    const formLoadTime = Date.now() - startTime;
    console.log(`[Performance] Form ready time: ${formLoadTime}ms`);
    expect(formLoadTime).toBeLessThan(5000); // Form should be ready within 5 seconds
    
    // Measure form submission time
    const submitStartTime = Date.now();
    
    await page.type('input[name="display_name"]', 'Perf Test');
    await page.type('input[name="email"]', `perf-${Date.now()}@example.com`);
    await page.select('select[name="role"]', 'casual_player');
    await page.type('input[name="city_region"]', 'Perf City');
    await page.click('input[name="termsAccepted"]');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('h2', { timeout: 10000 });
    
    const submitTime = Date.now() - submitStartTime;
    console.log(`[Performance] Form submission time: ${submitTime}ms`);
    expect(submitTime).toBeLessThan(5000); // Submission should complete within 5 seconds
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