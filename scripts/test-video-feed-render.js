import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const APP_URL = 'http://localhost:3334';  // Using the correct port

async function testVideoFeedRender() {
  console.log('🎬 Testing Video Feed Rendering\n');
  console.log('='.repeat(50));
  
  let browser;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',  // Use new headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Collect console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Collect page errors
    page.on('pageerror', error => {
      errors.push(`Page error: ${error.message}`);
    });
    
    console.log(`\n1️⃣ Loading ${APP_URL}/feed...`);
    
    try {
      const response = await page.goto(`${APP_URL}/feed`, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      console.log(`   Status: ${response.status()}`);
      
      if (response.status() !== 200) {
        console.log('❌ Page did not load successfully');
        return;
      }
      
      console.log('✅ Feed page loaded');
      
    } catch (error) {
      console.log('❌ Failed to load feed:', error.message);
      return;
    }
    
    // Wait for feed to render
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check for React app
    console.log('\n2️⃣ Checking React app status...');
    
    const appStatus = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        hasRoot: !!root,
        rootEmpty: root ? root.children.length === 0 : null,
        hasContent: root ? root.innerHTML.length > 100 : false
      };
    });
    
    console.log(`   React root exists: ${appStatus.hasRoot}`);
    console.log(`   Has content: ${appStatus.hasContent}`);
    
    if (!appStatus.hasContent) {
      console.log('❌ React app did not render content');
      console.log('\n🔍 Errors found:');
      errors.forEach(err => console.log(`   - ${err}`));
      return;
    }
    
    // Check for feed posts
    console.log('\n3️⃣ Looking for feed posts...');
    
    const feedInfo = await page.evaluate(() => {
      // Try multiple selectors
      const postSelectors = [
        '[class*="FeedItem"]',
        '[class*="feed-item"]',
        '[class*="post"]',
        '[class*="card"]',
        'article',
        '[role="article"]'
      ];
      
      let posts = [];
      for (const selector of postSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          posts = Array.from(elements);
          break;
        }
      }
      
      // Check for video-specific elements
      const videoElements = document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"], video');
      
      // Check for any error messages
      const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
      const errorTexts = Array.from(errorElements).map(el => el.textContent).filter(t => t && t.length > 0);
      
      return {
        postCount: posts.length,
        videoCount: videoElements.length,
        hasErrors: errorElements.length > 0,
        errorMessages: errorTexts,
        pageTitle: document.title,
        bodyClasses: document.body.className
      };
    });
    
    console.log(`   Feed posts found: ${feedInfo.postCount}`);
    console.log(`   Video elements found: ${feedInfo.videoCount}`);
    
    if (feedInfo.hasErrors) {
      console.log('\n⚠️  Error messages on page:');
      feedInfo.errorMessages.forEach(msg => console.log(`   - ${msg}`));
    }
    
    // Check specifically for video posts
    console.log('\n4️⃣ Checking for video feed posts...');
    
    const videoPostInfo = await page.evaluate(() => {
      // Look for elements that might indicate video posts
      const possibleVideoIndicators = [
        'iframe',
        '[class*="VideoEmbed"]',
        '[class*="video-embed"]',
        '[data-type="bag_video"]',
        '[class*="bag_video"]'
      ];
      
      const videoPostElements = [];
      for (const selector of possibleVideoIndicators) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          videoPostElements.push({
            selector,
            count: elements.length,
            sample: elements[0]?.outerHTML?.substring(0, 200)
          });
        }
      }
      
      // Check if flip buttons exist
      const flipButtons = document.querySelectorAll('[aria-label="Toggle view"], [class*="flip"], button img[src*="golf-bag"]');
      
      return {
        indicators: videoPostElements,
        hasFlipButtons: flipButtons.length > 0,
        flipButtonCount: flipButtons.length
      };
    });
    
    if (videoPostInfo.indicators.length > 0) {
      console.log('✅ Found video post indicators:');
      videoPostInfo.indicators.forEach(ind => {
        console.log(`   - ${ind.selector}: ${ind.count} elements`);
      });
    } else {
      console.log('⚠️  No video post indicators found');
    }
    
    if (videoPostInfo.hasFlipButtons) {
      console.log(`✅ Found ${videoPostInfo.flipButtonCount} flip buttons`);
    }
    
    // Take a screenshot
    console.log('\n5️⃣ Taking screenshot...');
    await page.screenshot({ 
      path: 'video-feed-test.png',
      fullPage: true 
    });
    console.log('   Screenshot saved as: video-feed-test.png');
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY:\n');
    
    if (errors.length === 0 && feedInfo.postCount > 0) {
      console.log('✅ Feed is rendering without errors');
      console.log(`✅ Found ${feedInfo.postCount} feed posts`);
      
      if (videoPostInfo.indicators.length > 0) {
        console.log('✅ Video posts appear to be rendering');
      } else {
        console.log('⚠️  No video posts detected (may not exist in feed)');
      }
      
      if (videoPostInfo.hasFlipButtons) {
        console.log('✅ Flip functionality appears to be present');
      }
    } else {
      console.log('❌ Issues detected:');
      if (errors.length > 0) {
        console.log(`   - ${errors.length} console errors`);
      }
      if (feedInfo.postCount === 0) {
        console.log('   - No feed posts found');
      }
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testVideoFeedRender().catch(console.error);