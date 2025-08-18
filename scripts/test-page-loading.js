import puppeteer from 'puppeteer';

async function testPageLoading() {
  console.log('🚀 Starting Puppeteer test...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable request interception to monitor network
    await page.setRequestInterception(true);
    const requests = [];
    const failedRequests = [];
    
    page.on('request', (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
      request.continue();
    });
    
    page.on('requestfailed', (request) => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure()
      });
    });
    
    page.on('response', (response) => {
      if (response.status() >= 400) {
        console.log(`❌ HTTP ${response.status()}: ${response.url()}`);
      }
    });
    
    // Listen for console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔴 Console Error:', msg.text());
      } else if (msg.type() === 'warning') {
        console.log('🟡 Console Warning:', msg.text());
      }
    });
    
    // Test Feed Page
    console.log('\n📄 Testing Feed Page...');
    await page.goto('http://localhost:3333/feed', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait a bit for any async content
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check for feed posts
    const feedPosts = await page.evaluate(() => {
      const posts = document.querySelectorAll('[class*="feed"]');
      return {
        count: posts.length,
        hasContent: document.body.textContent.includes('feed') || document.body.textContent.includes('post'),
        bodyText: document.body.textContent.substring(0, 500)
      };
    });
    
    console.log('Feed posts found:', feedPosts.count);
    console.log('Has feed content:', feedPosts.hasContent);
    if (feedPosts.count === 0) {
      console.log('Page content preview:', feedPosts.bodyText);
    }
    
    // Check Supabase requests
    const supabaseRequests = requests.filter(r => r.url.includes('supabase'));
    console.log('\n🔍 Supabase API calls:');
    supabaseRequests.forEach(req => {
      if (req.url.includes('/rest/v1/')) {
        const endpoint = req.url.split('/rest/v1/')[1].split('?')[0];
        console.log(`  - ${req.method} ${endpoint}`);
      }
    });
    
    // Test Equipment Page
    console.log('\n📄 Testing Equipment Page...');
    requests.length = 0; // Clear requests
    
    await page.goto('http://localhost:3333/equipment', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const equipmentItems = await page.evaluate(() => {
      const items = document.querySelectorAll('[class*="equipment"], [class*="card"]');
      return {
        count: items.length,
        hasContent: document.body.textContent.includes('equipment') || document.body.textContent.includes('Equipment'),
        bodyText: document.body.textContent.substring(0, 500)
      };
    });
    
    console.log('Equipment items found:', equipmentItems.count);
    console.log('Has equipment content:', equipmentItems.hasContent);
    if (equipmentItems.count === 0) {
      console.log('Page content preview:', equipmentItems.bodyText);
    }
    
    // Check Supabase requests for equipment
    const equipmentSupabaseRequests = requests.filter(r => r.url.includes('supabase'));
    console.log('\n🔍 Equipment Supabase API calls:');
    equipmentSupabaseRequests.forEach(req => {
      if (req.url.includes('/rest/v1/')) {
        const endpoint = req.url.split('/rest/v1/')[1].split('?')[0];
        console.log(`  - ${req.method} ${endpoint}`);
      }
    });
    
    // Check for failed requests
    if (failedRequests.length > 0) {
      console.log('\n❌ Failed requests:');
      failedRequests.forEach(req => {
        console.log(`  - ${req.url}: ${req.failure.errorText}`);
      });
    }
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

testPageLoading();