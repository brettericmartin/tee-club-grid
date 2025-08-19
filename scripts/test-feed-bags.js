import puppeteer from 'puppeteer';

async function testFeedBags() {
  console.log('🚀 Launching Puppeteer browser...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Navigate to feed
    console.log('📍 Navigating to feed...');
    await page.goto('http://localhost:3333/feed', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for feed cards to load
    await page.waitForSelector('[class*="FeedCard"]', { timeout: 10000 }).catch(() => {
      console.log('No feed cards found, trying alternative selector...');
    });
    
    // Wait a bit for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Look for flip buttons on feed cards
    const flipButtons = await page.$$('[class*="RotateCcw"]');
    console.log(`Found ${flipButtons.length} flip buttons in feed`);
    
    if (flipButtons.length > 0) {
      console.log('🔄 Clicking first flip button to see bag...');
      await flipButtons[0].click();
      
      // Wait for flip animation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if bag card is visible
      const bagCard = await page.$('[class*="BagCard"]');
      if (bagCard) {
        console.log('✅ Bag card is visible after flip!');
        
        // Get equipment count and value
        const equipmentInfo = await page.evaluate(() => {
          const valueElements = Array.from(document.querySelectorAll('*')).filter(el => 
            el.textContent?.includes('$') && el.textContent?.includes('k')
          );
          const equipmentTiles = document.querySelectorAll('[class*="equipment"][class*="tile"], [class*="EquipmentTile"]');
          return {
            value: valueElements[0]?.textContent || 'No value found',
            equipmentCount: equipmentTiles.length
          };
        });
        
        console.log(`💰 Bag value: ${equipmentInfo.value}`);
        console.log(`🏌️ Equipment tiles: ${equipmentInfo.equipmentCount}`);
        
        // Take screenshot of flipped card
        await page.screenshot({ path: 'scripts/feed-bag-flipped.png' });
        console.log('📸 Screenshot saved to scripts/feed-bag-flipped.png');
      } else {
        console.log('⚠️ Bag card not visible after flip');
      }
    }
    
    // Now navigate to bags browser for comparison
    console.log('\n📍 Navigating to bags browser...');
    await page.goto('http://localhost:3333/bags-browser', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for bag cards
    await page.waitForSelector('[class*="BagCard"]', { timeout: 10000 }).catch(() => {
      console.log('No bag cards in browser');
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get info from first bag card
    const browserBagInfo = await page.evaluate(() => {
      const firstBagCard = document.querySelector('[class*="BagCard"]');
      if (!firstBagCard) return null;
      
      const valueElements = Array.from(firstBagCard.querySelectorAll('*')).filter(el => 
        el.textContent?.includes('$') && el.textContent?.includes('k')
      );
      const equipmentTiles = firstBagCard.querySelectorAll('[class*="equipment"][class*="tile"], [class*="EquipmentTile"]');
      
      return {
        value: valueElements[0]?.textContent || 'No value found',
        equipmentCount: equipmentTiles.length
      };
    });
    
    if (browserBagInfo) {
      console.log(`\n🎯 Bags Browser - Value: ${browserBagInfo.value}, Equipment: ${browserBagInfo.equipmentCount} tiles`);
    }
    
    // Take screenshot of bags browser
    await page.screenshot({ path: 'scripts/bags-browser.png' });
    console.log('📸 Screenshot saved to scripts/bags-browser.png');
    
    console.log('\n✅ Test complete! Check the screenshots to compare feed vs bags browser');
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  } finally {
    console.log('🔒 Closing browser in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
  }
}

testFeedBags().catch(console.error);