import puppeteer from 'puppeteer';

async function testFeed() {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('error') || text.includes('Error')) {
        console.log('❌ ERROR:', text);
      } else if (text.includes('feed') || text.includes('Feed')) {
        console.log('📋 FEED LOG:', text);
      }
    });
    
    // Check the feed
    console.log('\n=== CHECKING FEED ===\n');
    await page.goto('http://localhost:3333/feed', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    
    // Check if there are any feed posts
    const feedPosts = await page.evaluate(() => {
      const posts = document.querySelectorAll('[class*="preserve-3d"], .glass-card, .card');
      return {
        postCount: posts.length,
        hasContent: document.body.innerText.includes('New Equipment') || 
                   document.body.innerText.includes('Equipment Photo') ||
                   document.body.innerText.includes('ago'),
        bodyText: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('Feed posts found:', feedPosts.postCount);
    console.log('Has feed content:', feedPosts.hasContent);
    console.log('Page content preview:', feedPosts.bodyText);
    
    // Take screenshot
    await page.screenshot({ path: 'scripts/feed-current-state.png' });
    console.log('\nScreenshot saved to scripts/feed-current-state.png');
    
    // Check for errors in network requests
    const failedRequests = [];
    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure()
      });
    });
    
    // Reload to capture any network errors
    await page.reload({ waitUntil: 'networkidle2' });
    
    if (failedRequests.length > 0) {
      console.log('\n❌ Failed network requests:');
      failedRequests.forEach(req => console.log(`  - ${req.url}: ${req.failure}`));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testFeed();