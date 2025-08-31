import puppeteer from 'puppeteer';

async function quickCheck() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Check equipment page
  console.log('Checking /equipment page...');
  await page.goto('http://localhost:3333/equipment', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const equipmentCount = await page.evaluate(() => {
    const articles = document.querySelectorAll('article');
    const cards = document.querySelectorAll('[class*="card"]');
    return { articles: articles.length, cards: cards.length };
  });
  
  console.log(`  Equipment items: ${equipmentCount.articles} articles, ${equipmentCount.cards} cards`);
  
  // Check my-bag page  
  console.log('\nChecking /my-bag page...');
  await page.goto('http://localhost:3333/my-bag', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const bagStats = await page.evaluate(() => {
    const statsText = document.body.textContent || '';
    const itemsMatch = statsText.match(/(\d+)\s*Items/);
    const valueMatch = statsText.match(/\$(\d+)/);
    return {
      items: itemsMatch ? itemsMatch[1] : '0',
      value: valueMatch ? valueMatch[1] : '0'
    };
  });
  
  console.log(`  Bag stats: ${bagStats.items} items, $${bagStats.value} value`);
  
  await browser.close();
  
  console.log('\n✅ Pages are loading successfully!');
}

quickCheck().catch(console.error);