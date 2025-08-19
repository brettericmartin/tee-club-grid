import puppeteer from 'puppeteer';

async function compareCards() {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  try {
    const page = await browser.newPage();
    
    // First, go to bags browser and capture a bag card
    console.log('Navigating to bags browser...');
    await page.goto('http://localhost:3333/bags-browser', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000)); // Wait for page to load
    
    // Take screenshot of first bag card in browser
    const bagCard = await page.$('.grid > div');
    if (bagCard) {
      await bagCard.screenshot({ path: 'scripts/bag-browser-card.png' });
      console.log('Captured bag browser card');
    } else {
      console.log('No bag card found in browser');
    }
    
    // Now go to feed
    console.log('Navigating to feed...');
    await page.goto('http://localhost:3333/feed', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000)); // Wait for page to load
    
    // Look for any rotate button (using Lucide icon class)
    const flipButtons = await page.$$('button');
    let foundFlip = false;
    
    for (const button of flipButtons) {
      const hasRotateIcon = await button.evaluate(el => {
        const svg = el.querySelector('svg');
        return svg && (svg.classList.contains('rotate-ccw') || 
                      el.innerHTML.includes('RotateCcw'));
      });
      
      if (hasRotateIcon) {
        console.log('Found flip button, clicking...');
        await button.click();
        await new Promise(r => setTimeout(r, 1500)); // Wait for flip animation
        foundFlip = true;
        break;
      }
    }
    
    if (foundFlip) {
      // Take screenshot of the entire flipped area
      const flippedElements = await page.$$('[style*="transform"]');
      for (const element of flippedElements) {
        const isFlipped = await element.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.transform && style.transform.includes('rotateY(180deg)');
        });
        
        if (isFlipped) {
          await element.screenshot({ path: 'scripts/feed-flipped-card.png' });
          console.log('Captured feed flipped card');
          break;
        }
      }
    } else {
      console.log('No flip button found in feed');
      // Take a screenshot of the whole feed for debugging
      await page.screenshot({ path: 'scripts/feed-page.png' });
      console.log('Captured full feed page for debugging');
    }
    
    console.log('\nScreenshots saved to:');
    console.log('- scripts/bag-browser-card.png');
    console.log('- scripts/feed-flipped-card.png (if flip was successful)');
    console.log('- scripts/feed-page.png (if no flip button found)');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

compareCards();