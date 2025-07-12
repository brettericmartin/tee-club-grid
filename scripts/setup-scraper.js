import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPuppeteer() {
  console.log('🧪 Testing Puppeteer setup...\n');
  
  let browser;
  try {
    // Launch browser with visible window
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 800 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('✅ Browser launched successfully');
    
    // Create new page
    const page = await browser.newPage();
    console.log('✅ Page created');
    
    // Navigate to 2nd Swing
    console.log('📍 Navigating to 2nd Swing...');
    await page.goto('https://www.2ndswing.com/golf-clubs/drivers', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    console.log('✅ Page loaded');
    
    // Wait for products to load
    await page.waitForSelector('.product-card', { timeout: 10000 });
    console.log('✅ Products found on page');
    
    // Take screenshot
    const screenshotDir = path.join(path.dirname(__dirname), 'data');
    await fs.mkdir(screenshotDir, { recursive: true });
    
    const screenshotPath = path.join(screenshotDir, 'puppeteer-test.png');
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: false 
    });
    console.log(`📸 Screenshot saved to: ${screenshotPath}`);
    
    // Count products
    const productCount = await page.evaluate(() => {
      return document.querySelectorAll('.product-card').length;
    });
    console.log(`\n📊 Found ${productCount} products on the page`);
    
    // Test data extraction for first product
    const firstProduct = await page.evaluate(() => {
      const card = document.querySelector('.product-card');
      if (!card) return null;
      
      return {
        brand: card.querySelector('.product-brand')?.textContent?.trim(),
        model: card.querySelector('.product-model')?.textContent?.trim(),
        price: card.querySelector('.product-price')?.textContent?.trim(),
        image: card.querySelector('img')?.src
      };
    });
    
    if (firstProduct) {
      console.log('\n🎯 Sample product data:');
      console.log(JSON.stringify(firstProduct, null, 2));
    }
    
    console.log('\n✅ Puppeteer is working correctly!');
    console.log('You should see a browser window open.');
    console.log('Press Enter to close the browser...');
    
    // Wait for user input
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('Failed to launch')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Make sure you have Chrome/Chromium installed');
      console.log('2. On Linux, you might need: sudo apt-get install chromium-browser');
      console.log('3. Try running: npm rebuild puppeteer');
    }
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

testPuppeteer().catch(console.error);