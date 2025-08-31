import puppeteer from 'puppeteer';

async function debugPages() {
  console.log('🔍 Debugging pages...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    devtools: true
  });
  
  const page = await browser.newPage();
  
  // Collect all console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
    console.log(`Console ${msg.type()}: ${text}`);
  });
  
  console.log('Testing /my-bag page...\n');
  await page.goto('http://localhost:3333/my-bag', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check bag items count
  const bagItemsCount = await page.evaluate(() => {
    const cards = document.querySelectorAll('[data-testid="bag-item"], .bag-item, .equipment-card');
    return cards.length;
  });
  
  console.log(`\n✅ Bag items visible on page: ${bagItemsCount}`);
  
  console.log('\n\nTesting /equipment page...\n');
  await page.goto('http://localhost:3333/equipment', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check equipment items count
  const equipmentCount = await page.evaluate(() => {
    const cards = document.querySelectorAll('[data-testid="equipment-card"], .equipment-card, article');
    return cards.length;
  });
  
  console.log(`\n✅ Equipment items visible on page: ${equipmentCount}`);
  
  // Keep browser open for manual inspection
  console.log('\n\n🔍 Browser remains open for inspection. Press Ctrl+C to close.');
}

debugPages().catch(console.error);