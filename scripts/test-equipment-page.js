import puppeteer from 'puppeteer';

async function testEquipmentPage() {
  console.log('🧪 Testing Equipment Page\n');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser for debugging
    devtools: true   // Open dev tools
  });
  
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', msg.text());
    } else if (msg.text().includes('Equipment data')) {
      console.log('📦', msg.text());
    }
  });
  
  // Navigate to equipment page
  console.log('Navigating to equipment page...');
  await page.goto('http://localhost:3333/equipment?category=driver', { 
    waitUntil: 'networkidle2' 
  });
  
  // Wait for equipment to load
  await page.waitForTimeout(3000);
  
  // Check for images
  const images = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img[src*="equipment-images"], img[src*="supabase"]');
    return Array.from(imgs).map(img => ({
      src: img.src.substring(0, 100),
      displayed: img.offsetParent !== null
    }));
  });
  
  console.log(`\nFound ${images.length} equipment images:`);
  images.forEach(img => {
    console.log(`  ${img.displayed ? '✅' : '❌'} ${img.src}...`);
  });
  
  // Check for equipment cards
  const cards = await page.evaluate(() => {
    const cards = document.querySelectorAll('[class*="equipment"], [class*="Equipment"]');
    return cards.length;
  });
  
  console.log(`\nFound ${cards} equipment-related elements`);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/equipment-page.png', fullPage: true });
  console.log('\n📸 Screenshot saved to /tmp/equipment-page.png');
  
  console.log('\nKeep browser open for manual inspection...');
  // Keep browser open for inspection
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  await browser.close();
}

testEquipmentPage().catch(console.error);