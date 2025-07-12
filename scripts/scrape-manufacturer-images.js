import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import https from 'https';
import { pipeline } from 'stream/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Equipment with manufacturer product pages
const manufacturerProducts = [
  {
    brand: 'TaylorMade',
    model: 'Qi10',
    category: 'driver',
    urls: [
      'https://www.taylormadegolf.com/Qi10-Driver/DW-TA095.html',
      'https://www.taylormadegolf.com/Qi10-Max-Driver/DW-TA096.html'
    ]
  },
  {
    brand: 'Titleist',
    model: 'Pro V1',
    category: 'balls',
    urls: [
      'https://www.titleist.com/golf-balls/pro-v1',
      'https://www.titleist.com/golf-balls/pro-v1x'
    ]
  },
  {
    brand: 'Callaway',
    model: 'Chrome Soft',
    category: 'balls',
    urls: [
      'https://www.callawaygolf.com/golf-balls/chrome-soft-2024-golf-balls/'
    ]
  },
  {
    brand: 'Ping',
    model: 'G430 Max',
    category: 'driver',
    urls: [
      'https://ping.com/en-us/clubs/drivers/g430'
    ]
  }
];

// Direct CDN URLs for common equipment (found through research)
const directImageUrls = {
  'TaylorMade Qi10': 'https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/default/images/2024/Qi10/Driver/Qi10_Driver_Hero.jpg?sw=600',
  'TaylorMade Qi10 Max': 'https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/default/images/2024/Qi10/Driver/Qi10_Max_Driver_Hero.jpg?sw=600',
  'Titleist Pro V1': 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dwb3a2c38e/PRO-V1-2023-PRODUCT-HERO.png?sw=600',
  'Titleist TSR3': 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dwa7f6c5a7/TSR3-DRIVER-HERO.png?sw=600',
  'Callaway Paradym Ai Smoke': 'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-CGI-ItemMaster/en_US/v1736573127765/products/drivers/2024/jv1033/jv1033-24-paradym-ai-smoke-driver___1.png?sw=600',
  'Scotty Cameron Special Select Newport 2': 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw1b9f4c43/SCOTTY-CAMERON-SPECIAL-SELECT-NEWPORT-2-PUTTER.png?sw=600',
  'Titleist Vokey SM10': 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw7a5c8e1a/SM10-WEDGE-HERO.png?sw=600',
  'TaylorMade TP5': 'https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/default/images/2024/TP5/TP5_24_Ball_Hero.jpg?sw=600',
  'Ping G430 Hybrid': 'https://pingmediastorage.blob.core.windows.net/ping-dam/2023/G430_Hybrid_Hero.jpg',
  'Callaway Chrome Soft': 'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-CGI-ItemMaster/en_US/v1736573127765/products/balls/2024/chrome-soft/chrome-soft-24-golf-balls___1.png?sw=600'
};

async function downloadDirectImage(url, filename) {
  return new Promise((resolve, reject) => {
    https.get(url, { 
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (response) => {
      if (response.statusCode === 200) {
        const file = createWriteStream(filename);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else {
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function scrapeManufacturerImages() {
  console.log('🔍 Starting manufacturer image scraping...\n');
  
  const imagesDir = path.join(path.dirname(__dirname), 'public', 'images', 'equipment');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const results = [];
  
  // First, try direct CDN URLs
  console.log('📥 Downloading from known CDN URLs...\n');
  
  for (const [productName, imageUrl] of Object.entries(directImageUrls)) {
    const filename = productName.toLowerCase().replace(/ /g, '-') + '.jpg';
    const filepath = path.join(imagesDir, filename);
    
    try {
      await downloadDirectImage(imageUrl, filepath);
      console.log(`✅ Downloaded: ${productName}`);
      results.push({
        product: productName,
        filename: filename,
        path: `/images/equipment/${filename}`,
        source: 'manufacturer_cdn'
      });
    } catch (error) {
      console.log(`❌ Failed to download ${productName}: ${error.message}`);
    }
  }
  
  // Try scraping with Puppeteer as backup
  console.log('\n🌐 Attempting to scrape manufacturer sites...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    for (const product of manufacturerProducts.slice(0, 2)) { // Test with first 2
      console.log(`\nScraping ${product.brand} ${product.model}...`);
      
      try {
        await page.goto(product.urls[0], { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        // Try different selectors based on manufacturer
        let imageUrl = null;
        
        if (product.brand === 'TaylorMade') {
          imageUrl = await page.$eval('img.primary-image, img[alt*="' + product.model + '"]', 
            el => el.src || el.dataset.src);
        } else if (product.brand === 'Titleist') {
          imageUrl = await page.$eval('img.product-image, img[class*="product"]',
            el => el.src || el.dataset.src);
        } else if (product.brand === 'Callaway') {
          imageUrl = await page.$eval('img[class*="product"], img[alt*="' + product.model + '"]',
            el => el.src || el.dataset.src);
        }
        
        if (imageUrl) {
          console.log(`Found image URL: ${imageUrl}`);
          // Download logic here if needed
        } else {
          console.log('No image found on page');
        }
        
      } catch (error) {
        console.log(`Error scraping ${product.brand}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Puppeteer error:', error);
  } finally {
    if (browser) await browser.close();
  }
  
  // Save results
  const resultsPath = path.join(path.dirname(__dirname), 'data', 'manufacturer-images.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  
  console.log(`\n✅ Downloaded ${results.length} manufacturer images`);
  console.log('📁 Results saved to data/manufacturer-images.json');
  
  return results;
}

// Run the scraper
scrapeManufacturerImages().catch(console.error);