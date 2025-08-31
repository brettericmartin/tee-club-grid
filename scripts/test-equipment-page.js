import puppeteer from 'puppeteer';

async function testEquipmentPage() {
  const browser = await puppeteer.launch({
    headless: false, // Show browser
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    devtools: true
  });
  
  const page = await browser.newPage();
  
  console.log('Opening equipment page...');
  await page.goto('http://localhost:3333/equipment', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check the showSavedOnly checkbox state
  const checkboxState = await page.evaluate(() => {
    const checkbox = document.querySelector('#saved-only');
    return {
      exists: !!checkbox,
      checked: checkbox ? checkbox.checked : null,
      ariaChecked: checkbox ? checkbox.getAttribute('aria-checked') : null
    };
  });
  
  console.log('ShowSavedOnly checkbox state:', checkboxState);
  
  // If checked, uncheck it
  if (checkboxState.checked || checkboxState.ariaChecked === 'true') {
    console.log('Unchecking showSavedOnly...');
    await page.click('label[for="saved-only"]');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Check equipment count again
  const equipmentCount = await page.evaluate(() => {
    const articles = document.querySelectorAll('article');
    const cards = document.querySelectorAll('[class*="card"]');
    const equipmentDivs = document.querySelectorAll('[data-testid*="equipment"]');
    return { 
      articles: articles.length, 
      cards: cards.length,
      equipmentDivs: equipmentDivs.length
    };
  });
  
  console.log('Equipment items after unchecking:', equipmentCount);
  
  // Get page text to see what's displayed
  const pageText = await page.evaluate(() => {
    const mainContent = document.querySelector('main');
    return mainContent ? mainContent.textContent?.substring(0, 500) : 'No main content';
  });
  
  console.log('\nPage content preview:');
  console.log(pageText);
  
  console.log('\nBrowser remains open for inspection. Press Ctrl+C to close.');
}

testEquipmentPage().catch(console.error);