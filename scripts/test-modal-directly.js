#!/usr/bin/env node
import puppeteer from 'puppeteer';

async function testModalDirectly() {
  console.log('🧪 Direct Modal Test\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 800 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Log all console messages
    page.on('console', msg => {
      console.log(`[${msg.type()}]`, msg.text());
    });
    
    // Log page errors
    page.on('pageerror', error => {
      console.log('❌ Page Error:', error.message);
    });
    
    // First, go to bags browser to see what's there
    console.log('1️⃣ Going to bags browser...');
    await page.goto('http://localhost:3334/bags-browser', { 
      waitUntil: 'networkidle2'
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get all links on the page
    const links = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a'));
      return allLinks.map(link => ({
        href: link.href,
        text: link.textContent?.trim()
      }));
    });
    
    console.log('\n📋 Found links:');
    links.forEach(link => {
      if (link.href.includes('/bags/')) {
        console.log(`  ✅ Bag link: ${link.href} - "${link.text}"`);
      }
    });
    
    // Find the first bag link
    const bagLink = links.find(l => l.href.includes('/bags/'));
    
    if (bagLink) {
      console.log(`\n2️⃣ Navigating to bag: ${bagLink.href}`);
      await page.goto(bagLink.href, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Now find clickable equipment elements
      console.log('\n3️⃣ Looking for clickable equipment...');
      
      // Get all clickable elements with equipment info
      const clickableElements = await page.evaluate(() => {
        const elements = [];
        
        // Find all elements with onclick handlers or role="button"
        document.querySelectorAll('[onclick], [role="button"], button, a').forEach(el => {
          const text = el.textContent || '';
          const img = el.querySelector('img');
          if (img || text.match(/Callaway|TaylorMade|Titleist|Ping|Scotty|Odyssey/i)) {
            const rect = el.getBoundingClientRect();
            elements.push({
              tag: el.tagName,
              text: text.substring(0, 50),
              hasImg: !!img,
              imgAlt: img?.alt,
              visible: rect.width > 0 && rect.height > 0,
              selector: el.className
            });
          }
        });
        
        return elements;
      });
      
      console.log(`Found ${clickableElements.length} potential equipment elements:`);
      clickableElements.slice(0, 5).forEach((el, i) => {
        console.log(`  ${i+1}. ${el.tag} - ${el.text || el.imgAlt || 'No text'} (visible: ${el.visible})`);
      });
      
      // Try to click the first visible equipment element
      if (clickableElements.length > 0) {
        console.log('\n4️⃣ Attempting to click equipment...');
        
        // Click using evaluate to handle any element
        const clicked = await page.evaluate(() => {
          const elements = document.querySelectorAll('[onclick], [role="button"], button');
          for (const el of elements) {
            const text = el.textContent || '';
            const img = el.querySelector('img');
            if (img || text.match(/Callaway|TaylorMade|Titleist|Ping|Scotty|Odyssey/i)) {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                el.click();
                return true;
              }
            }
          }
          return false;
        });
        
        if (clicked) {
          console.log('✅ Clicked on equipment!');
          
          // Wait for modal
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check for modal
          const modalExists = await page.evaluate(() => {
            return !!document.querySelector('[role="dialog"]');
          });
          
          if (modalExists) {
            console.log('\n✅ MODAL APPEARED!');
            
            // Analyze modal
            const modalInfo = await page.evaluate(() => {
              const modal = document.querySelector('[role="dialog"]');
              if (!modal) return null;
              
              // Count X buttons
              const xButtons = modal.querySelectorAll('button svg.lucide-x').length;
              
              // Check images
              const images = Array.from(modal.querySelectorAll('img')).map(img => ({
                src: img.src,
                alt: img.alt,
                displayed: img.offsetWidth > 0 && img.offsetHeight > 0
              }));
              
              // Get title
              const title = modal.querySelector('h2')?.textContent || 'No title';
              
              // Check for "No photo" text
              const hasNoPhoto = modal.textContent?.includes('No photo available') || false;
              
              return { xButtons, images, title, hasNoPhoto };
            });
            
            console.log('\n📊 Modal Analysis:');
            console.log(`  Title: "${modalInfo.title}"`);
            console.log(`  X buttons: ${modalInfo.xButtons} ${modalInfo.xButtons === 1 ? '✅' : '❌ Should be 1!'}`);
            console.log(`  Images: ${modalInfo.images.length}`);
            modalInfo.images.forEach((img, i) => {
              console.log(`    ${i+1}. ${img.displayed ? '✅' : '❌'} ${img.alt || 'No alt'}`);
            });
            console.log(`  "No photo" message: ${modalInfo.hasNoPhoto ? '❌ Yes' : '✅ No'}`);
            
          } else {
            console.log('❌ Modal did not appear');
          }
        } else {
          console.log('❌ Could not click any equipment');
        }
      }
    } else {
      console.log('❌ No bag links found');
    }
    
    // Keep browser open for inspection
    console.log('\n⏸️ Keeping browser open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testModalDirectly();