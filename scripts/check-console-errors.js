import puppeteer from 'puppeteer';

async function checkConsoleErrors() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Equipment]') || msg.type() === 'error') {
      logs.push(`[${msg.type()}] ${text}`);
    }
  });
  
  console.log('Loading /equipment page and monitoring console...\n');
  
  await page.goto('http://localhost:3333/equipment', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('Console logs related to Equipment:');
  logs.forEach(log => console.log(log));
  
  // Try to get equipment count from the page
  const pageInfo = await page.evaluate(() => {
    const totalElement = document.querySelector('[class*="text-sm"][class*="text-gray"]');
    const totalText = totalElement ? totalElement.textContent : '';
    return {
      totalText,
      hasLoadingSpinner: !!document.querySelector('[class*="animate-spin"]'),
      hasNoResultsMessage: document.body.textContent?.includes('No equipment found')
    };
  });
  
  console.log('\nPage info:', pageInfo);
  
  await browser.close();
}

checkConsoleErrors().catch(console.error);