import puppeteer from 'puppeteer';

async function verifyCards() {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('\n=== BAGS BROWSER ===');
    await page.goto('http://localhost:3333/bags-browser', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    
    const bagImages = await page.evaluate(() => {
      const card = document.querySelector('.grid > div');
      if (!card) return { count: 0, unsplash: 0, images: [] };
      
      const images = Array.from(card.querySelectorAll('img'));
      return {
        count: images.length,
        unsplash: images.filter(img => img.src.includes('unsplash')).length,
        images: images.slice(0, 3).map(img => img.src.substring(0, 80))
      };
    });
    
    console.log(`Total images: ${bagImages.count}`);
    console.log(`Unsplash images: ${bagImages.unsplash}`);
    console.log('Sample URLs:', bagImages.images);
    
    console.log('\n=== FEED FLIP CARD ===');
    await page.goto('http://localhost:3333/feed', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    
    // Click flip button
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.querySelector('.rotate-ccw') || btn.innerHTML.includes('Rotate')) {
          btn.click();
          return;
        }
      }
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const feedImages = await page.evaluate(() => {
      // Find flipped container
      const divs = document.querySelectorAll('div');
      for (const div of divs) {
        if (getComputedStyle(div).transform.includes('180')) {
          const images = Array.from(div.querySelectorAll('img'));
          return {
            count: images.length,
            unsplash: images.filter(img => img.src.includes('unsplash')).length,
            images: images.slice(0, 3).map(img => img.src.substring(0, 80))
          };
        }
      }
      return { count: 0, unsplash: 0, images: [] };
    });
    
    console.log(`Total images: ${feedImages.count}`);
    console.log(`Unsplash images: ${feedImages.unsplash}`);
    console.log('Sample URLs:', feedImages.images);
    
    console.log('\n=== RESULT ===');
    if (bagImages.unsplash === 0 && feedImages.unsplash === 0) {
      console.log('✅ SUCCESS: No Unsplash URLs found!');
    } else {
      console.log(`❌ FAIL: Bags has ${bagImages.unsplash} Unsplash, Feed has ${feedImages.unsplash} Unsplash`);
    }
    
  } finally {
    await browser.close();
  }
}

verifyCards().catch(console.error);