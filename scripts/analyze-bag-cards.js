import puppeteer from 'puppeteer';

async function analyzeBagCards() {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log('PAGE LOG:', msg.text());
      }
    });
    
    // First, analyze bags browser
    console.log('\n=== ANALYZING BAGS BROWSER ===\n');
    await page.goto('http://localhost:3333/bags-browser', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    
    // Get the first bag card's data
    const bagBrowserData = await page.evaluate(() => {
      const firstCard = document.querySelector('.grid > div');
      if (!firstCard) return null;
      
      // Get all images in the card
      const images = Array.from(firstCard.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        loaded: img.complete
      }));
      
      // Get text content
      const textContent = firstCard.innerText;
      
      // Check for specific classes
      const hasGroupClass = firstCard.classList.contains('group');
      const classes = Array.from(firstCard.classList);
      
      return {
        images,
        textContent,
        classes,
        hasGroupClass,
        innerHTML: firstCard.innerHTML.substring(0, 500) // First 500 chars
      };
    });
    
    console.log('Bags Browser Card:');
    console.log('- Number of images:', bagBrowserData?.images?.length || 0);
    console.log('- Images:', bagBrowserData?.images?.map(img => img.src.substring(0, 100)));
    console.log('- Has group class:', bagBrowserData?.hasGroupClass);
    
    // Take screenshot
    const bagCard = await page.$('.grid > div');
    if (bagCard) {
      await bagCard.screenshot({ path: 'scripts/bag-browser-detailed.png' });
    }
    
    // Now analyze feed
    console.log('\n=== ANALYZING FEED ===\n');
    await page.goto('http://localhost:3333/feed', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    
    // Find and click a flip button
    const flipButton = await page.evaluate(() => {
      // Find all buttons and check for rotate icon
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const button of buttons) {
        if (button.innerHTML.includes('RotateCcw') || 
            button.querySelector('svg.rotate-ccw')) {
          button.click();
          return true;
        }
      }
      return false;
    });
    
    if (flipButton) {
      console.log('Clicked flip button, waiting for animation...');
      await new Promise(r => setTimeout(r, 2000));
      
      // Get the flipped card's data
      const feedFlippedData = await page.evaluate(() => {
        // Find the flipped container
        const flippedContainers = Array.from(document.querySelectorAll('div'));
        let flippedCard = null;
        
        for (const div of flippedContainers) {
          const style = window.getComputedStyle(div);
          if (style.transform && style.transform.includes('rotateY(180deg)')) {
            // This is the flipped container, find the card inside
            flippedCard = div.querySelector('.group') || div;
            break;
          }
        }
        
        if (!flippedCard) return null;
        
        // Get all images in the flipped card
        const images = Array.from(flippedCard.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          loaded: img.complete
        }));
        
        // Get text content
        const textContent = flippedCard.innerText;
        
        // Check for specific classes
        const hasGroupClass = flippedCard.classList.contains('group');
        const classes = Array.from(flippedCard.classList);
        
        return {
          images,
          textContent,
          classes,
          hasGroupClass,
          innerHTML: flippedCard.innerHTML.substring(0, 500)
        };
      });
      
      console.log('Feed Flipped Card:');
      console.log('- Number of images:', feedFlippedData?.images?.length || 0);
      console.log('- Images:', feedFlippedData?.images?.map(img => img.src.substring(0, 100)));
      console.log('- Has group class:', feedFlippedData?.hasGroupClass);
      
      // Take screenshot of flipped card
      const flippedElement = await page.evaluate(() => {
        const divs = Array.from(document.querySelectorAll('div'));
        for (const div of divs) {
          const style = window.getComputedStyle(div);
          if (style.transform && style.transform.includes('rotateY(180deg)')) {
            return div.getBoundingClientRect();
          }
        }
        return null;
      });
      
      if (flippedElement) {
        await page.screenshot({ 
          path: 'scripts/feed-flipped-detailed.png',
          clip: flippedElement
        });
      }
      
      // Compare the two
      console.log('\n=== COMPARISON ===\n');
      if (bagBrowserData && feedFlippedData) {
        console.log('Image count difference:', 
          bagBrowserData.images.length - feedFlippedData.images.length);
        
        // Check if images are different
        const bagImages = new Set(bagBrowserData.images.map(i => i.src));
        const feedImages = new Set(feedFlippedData.images.map(i => i.src));
        
        const onlyInBag = [...bagImages].filter(x => !feedImages.has(x));
        const onlyInFeed = [...feedImages].filter(x => !bagImages.has(x));
        
        if (onlyInBag.length > 0) {
          console.log('\nImages ONLY in bag browser:');
          onlyInBag.forEach(img => console.log('  -', img));
        }
        
        if (onlyInFeed.length > 0) {
          console.log('\nImages ONLY in feed:');
          onlyInFeed.forEach(img => console.log('  -', img));
        }
      }
    } else {
      console.log('No flip button found in feed');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

analyzeBagCards();