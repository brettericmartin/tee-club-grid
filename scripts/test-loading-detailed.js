import puppeteer from 'puppeteer';

async function testDetailedLoading() {
  console.log('🚀 Starting detailed Puppeteer test...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser window
    devtools: true,  // Open devtools
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 100 // Slow down actions
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // Enable request interception
    await page.setRequestInterception(true);
    const apiCalls = [];
    const errors = [];
    
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('supabase') || url.includes('auth.teed.club')) {
        apiCalls.push({
          url: url,
          method: request.method(),
          headers: request.headers()
        });
      }
      request.continue();
    });
    
    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();
      
      if (url.includes('supabase') || url.includes('auth.teed.club')) {
        console.log(`${status === 200 ? '✅' : '❌'} API Response: ${status} - ${url.substring(0, 100)}...`);
        
        if (status >= 400) {
          errors.push({
            url: url,
            status: status,
            statusText: response.statusText()
          });
        }
      }
    });
    
    // Listen for console messages
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        console.log('🔴 Console Error:', text);
        errors.push({ type: 'console', message: text });
      } else if (type === 'warning') {
        console.log('🟡 Console Warning:', text);
      } else if (text.includes('feed') || text.includes('equipment')) {
        console.log('📝 Console Log:', text);
      }
    });
    
    page.on('pageerror', error => {
      console.log('💥 Page Error:', error.message);
      errors.push({ type: 'page', message: error.message });
    });
    
    // TEST FEED PAGE
    console.log('\n════════════════════════════════════════');
    console.log('📄 TESTING FEED PAGE');
    console.log('════════════════════════════════════════\n');
    
    await page.goto('http://localhost:3000/feed', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for content
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check for feed elements
    const feedData = await page.evaluate(() => {
      const feedCards = document.querySelectorAll('[class*="feed"], [class*="Feed"], article, [class*="card"]');
      const images = document.querySelectorAll('img[src*="supabase"], img[src*="equipment"], img[src*="photo"]');
      const buttons = document.querySelectorAll('button');
      const loadingElements = document.querySelectorAll('[class*="loading"], [class*="skeleton"], [class*="spinner"]');
      
      // Get all text content
      const bodyText = document.body.innerText;
      
      // Check for error messages
      const errorElements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent?.toLowerCase().includes('error') || 
        el.textContent?.toLowerCase().includes('failed')
      );
      
      return {
        feedCards: feedCards.length,
        images: images.length,
        buttons: buttons.length,
        loadingElements: loadingElements.length,
        hasContent: bodyText.length > 500,
        bodyLength: bodyText.length,
        errorMessages: errorElements.map(el => el.textContent?.substring(0, 100)),
        // Get specific content indicators
        hasFeedText: bodyText.includes('feed') || bodyText.includes('Feed'),
        hasPostText: bodyText.includes('post') || bodyText.includes('Post'),
        hasEquipmentText: bodyText.includes('equipment') || bodyText.includes('Equipment'),
        // Sample of actual text
        sampleText: bodyText.substring(0, 1000)
      };
    });
    
    console.log('\n📊 Feed Page Analysis:');
    console.log('  Feed cards found:', feedData.feedCards);
    console.log('  Images found:', feedData.images);
    console.log('  Buttons found:', feedData.buttons);
    console.log('  Loading elements:', feedData.loadingElements);
    console.log('  Page has content:', feedData.hasContent);
    console.log('  Total text length:', feedData.bodyLength);
    console.log('  Has "feed" text:', feedData.hasFeedText);
    console.log('  Has "post" text:', feedData.hasPostText);
    
    if (feedData.errorMessages.length > 0) {
      console.log('\n⚠️ Error messages found:');
      feedData.errorMessages.forEach(msg => console.log('  -', msg));
    }
    
    // Take screenshot
    await page.screenshot({ path: 'feed-page.png', fullPage: true });
    console.log('\n📸 Screenshot saved as feed-page.png');
    
    // TEST EQUIPMENT PAGE
    console.log('\n════════════════════════════════════════');
    console.log('📄 TESTING EQUIPMENT PAGE');
    console.log('════════════════════════════════════════\n');
    
    apiCalls.length = 0; // Clear API calls
    
    await page.goto('http://localhost:3000/equipment', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for content
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const equipmentData = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="card"], [class*="Card"], article');
      const images = document.querySelectorAll('img');
      const buttons = document.querySelectorAll('button');
      const loadingElements = document.querySelectorAll('[class*="loading"], [class*="skeleton"], [class*="spinner"]');
      
      const bodyText = document.body.innerText;
      
      return {
        cards: cards.length,
        images: images.length,
        buttons: buttons.length,
        loadingElements: loadingElements.length,
        hasContent: bodyText.length > 500,
        bodyLength: bodyText.length,
        // Check for equipment brands
        hasTaylorMade: bodyText.includes('TaylorMade'),
        hasCallaway: bodyText.includes('Callaway'),
        hasTitleist: bodyText.includes('Titleist'),
        sampleText: bodyText.substring(0, 1000)
      };
    });
    
    console.log('\n📊 Equipment Page Analysis:');
    console.log('  Cards found:', equipmentData.cards);
    console.log('  Images found:', equipmentData.images);
    console.log('  Buttons found:', equipmentData.buttons);
    console.log('  Loading elements:', equipmentData.loadingElements);
    console.log('  Page has content:', equipmentData.hasContent);
    console.log('  Total text length:', equipmentData.bodyLength);
    console.log('  Has TaylorMade:', equipmentData.hasTaylorMade);
    console.log('  Has Callaway:', equipmentData.hasCallaway);
    
    // Take screenshot
    await page.screenshot({ path: 'equipment-page.png', fullPage: true });
    console.log('\n📸 Screenshot saved as equipment-page.png');
    
    // SUMMARY
    console.log('\n════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('════════════════════════════════════════\n');
    
    console.log('Total API calls made:', apiCalls.length);
    console.log('Total errors:', errors.length);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(err => {
        if (err.url) {
          console.log(`  - ${err.status} ${err.statusText}: ${err.url.substring(0, 100)}...`);
        } else {
          console.log(`  - ${err.type}: ${err.message}`);
        }
      });
    }
    
    // Check network tab
    const performanceMetrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        loadComplete: perf.loadEventEnd - perf.loadEventStart,
        totalTime: perf.loadEventEnd - perf.fetchStart
      };
    });
    
    console.log('\n⏱️ Performance Metrics:');
    console.log('  DOM Content Loaded:', performanceMetrics.domContentLoaded, 'ms');
    console.log('  Load Complete:', performanceMetrics.loadComplete, 'ms');
    console.log('  Total Time:', performanceMetrics.totalTime, 'ms');
    
    console.log('\n✅ Test complete! Check feed-page.png and equipment-page.png for visual results.');
    console.log('Press Ctrl+C to close the browser...');
    
    // Keep browser open for inspection
    await new Promise(resolve => setTimeout(resolve, 60000));
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

testDetailedLoading();