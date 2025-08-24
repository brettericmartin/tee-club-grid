import puppeteer from 'puppeteer';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
  });

  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  try {
    console.log('Navigating to localhost:3333...');
    await page.goto('http://localhost:3333', { waitUntil: 'networkidle2' });
    
    // Wait for the page to load
    await delay(2000);
    
    // Navigate to My Bag page
    console.log('Navigating to My Bag...');
    await page.goto('http://localhost:3333/my-bag', { waitUntil: 'networkidle2' });
    await delay(2000);
    
    // Click on the first equipment item to open the modal
    console.log('Looking for equipment items...');
    
    // Try multiple selectors for equipment items
    const selectors = [
      'button[class*="equipment"]',
      'div[class*="equipment-tile"]',
      'div[class*="bag-equipment"]',
      '[role="button"]'
    ];
    
    let equipmentItems = [];
    for (const selector of selectors) {
      equipmentItems = await page.$$(selector);
      if (equipmentItems.length > 0) {
        console.log(`Found ${equipmentItems.length} items with selector: ${selector}`);
        break;
      }
    }
    
    if (equipmentItems.length > 0) {
      console.log(`Clicking the first equipment item...`);
      await equipmentItems[0].click();
      
      // Wait for modal to open
      await delay(2000);
      
      // Click on Photos tab using exact text match
      console.log('Looking for Photos tab...');
      const photosTab = await page.evaluateHandle(() => {
        const tabs = Array.from(document.querySelectorAll('[role="tab"], button'));
        return tabs.find(tab => tab.textContent.includes('Photos'));
      });
      
      if (photosTab && photosTab.asElement()) {
        await photosTab.asElement().click();
        console.log('Clicked on Photos tab');
        await delay(2000);
      } else {
        console.log('Photos tab not found');
      }
      
      // Analyze the photos in the modal
      console.log('\n=== ANALYZING PHOTOS IN MODAL ===');
      
      const photoData = await page.evaluate(() => {
        const photos = [];
        const imgElements = document.querySelectorAll('img');
        
        imgElements.forEach((img, index) => {
          // Skip very small images (likely icons)
          if (img.width < 50 && img.height < 50) return;
          
          const src = img.src || img.getAttribute('src');
          const alt = img.alt || img.getAttribute('alt');
          const naturalWidth = img.naturalWidth;
          const naturalHeight = img.naturalHeight;
          const complete = img.complete;
          const className = img.className;
          const parent = img.parentElement;
          const parentClass = parent ? parent.className : '';
          
          // Check if image failed to load
          const failedToLoad = complete && (naturalWidth === 0 || naturalHeight === 0);
          
          // Identify potential placeholder or error images
          const isPotentialPlaceholder = 
            (src && (
              src.includes('placeholder') ||
              src.includes('default') ||
              src.includes('no-image') ||
              src.includes('fallback') ||
              src.includes('data:image')
            )) ||
            src === '' ||
            src === 'null' ||
            src === 'undefined' ||
            !src;
          
          photos.push({
            index,
            src,
            alt,
            naturalWidth,
            naturalHeight,
            complete,
            failedToLoad,
            isPotentialPlaceholder,
            className,
            parentClass,
            displayWidth: img.offsetWidth,
            displayHeight: img.offsetHeight,
            isVisible: img.offsetWidth > 0 && img.offsetHeight > 0
          });
        });
        
        return photos;
      });
      
      console.log('\n=== PHOTO ANALYSIS RESULTS ===');
      console.log(`Total images found: ${photoData.length}`);
      
      const problematicPhotos = photoData.filter(p => 
        p.failedToLoad || 
        p.isPotentialPlaceholder || 
        !p.src || 
        p.src === 'null' || 
        p.src === 'undefined'
      );
      
      if (problematicPhotos.length > 0) {
        console.log(`\nPROBLEMATIC PHOTOS (${problematicPhotos.length}):`);
        problematicPhotos.forEach(photo => {
          console.log(`  - Index ${photo.index}:`);
          console.log(`    URL: ${photo.src}`);
          console.log(`    Alt: ${photo.alt}`);
          console.log(`    Failed to load: ${photo.failedToLoad}`);
          console.log(`    Is placeholder: ${photo.isPotentialPlaceholder}`);
          console.log(`    Natural size: ${photo.naturalWidth}x${photo.naturalHeight}`);
          console.log(`    Display size: ${photo.displayWidth}x${photo.displayHeight}`);
          console.log(`    Class: ${photo.className}`);
          console.log(`    Parent class: ${photo.parentClass}`);
        });
      }
      
      const validPhotos = photoData.filter(p => 
        !p.failedToLoad && 
        !p.isPotentialPlaceholder && 
        p.src && 
        p.src !== 'null' && 
        p.src !== 'undefined' &&
        p.isVisible
      );
      
      console.log(`\nVALID PHOTOS (${validPhotos.length}):`);
      validPhotos.forEach(photo => {
        console.log(`  - ${photo.src.substring(0, 100)}...`);
      });
      
      // Check for specific patterns in URLs
      console.log('\n=== URL PATTERN ANALYSIS ===');
      const urlPatterns = {
        supabase: photoData.filter(p => p.src && p.src.includes('supabase')),
        cloudinary: photoData.filter(p => p.src && p.src.includes('cloudinary')),
        dataUri: photoData.filter(p => p.src && p.src.startsWith('data:')),
        relative: photoData.filter(p => p.src && p.src.startsWith('/')),
        empty: photoData.filter(p => !p.src || p.src === ''),
        nullOrUndefined: photoData.filter(p => p.src === 'null' || p.src === 'undefined')
      };
      
      Object.entries(urlPatterns).forEach(([pattern, photos]) => {
        if (photos.length > 0) {
          console.log(`${pattern}: ${photos.length} photos`);
        }
      });
      
    } else {
      console.log('No equipment items found on the page');
    }
    
    // Keep browser open for 30 seconds for observation
    console.log('\n=== Browser will close in 30 seconds ===');
    await delay(30000);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
