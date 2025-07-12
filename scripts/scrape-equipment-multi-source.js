import puppeteer from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Category mapping
const CATEGORY_MAP = {
  'driver': 'driver',
  'drivers': 'driver',
  'fairway': 'fairway_wood',
  'fairway-woods': 'fairway_wood',
  'hybrid': 'hybrid',
  'hybrids': 'hybrid',
  'iron': 'iron',
  'irons': 'iron',
  'iron-sets': 'iron',
  'wedge': 'wedge',
  'wedges': 'wedge',
  'putter': 'putter',
  'putters': 'putter',
  'ball': 'balls',
  'balls': 'balls',
  'golf-balls': 'balls',
  'bag': 'bags',
  'bags': 'bags',
  'golf-bags': 'bags',
  'glove': 'gloves',
  'gloves': 'gloves',
  'rangefinder': 'rangefinders',
  'gps': 'gps_devices'
};

// Scrape TaylorMade directly for their latest products
async function scrapeTaylorMade() {
  console.log('\n🏌️ Scraping TaylorMade...');
  const equipment = [];
  
  const categories = [
    { url: 'https://www.taylormadegolf.com/drivers/', category: 'driver' },
    { url: 'https://www.taylormadegolf.com/fairways/', category: 'fairway_wood' },
    { url: 'https://www.taylormadegolf.com/hybrids-rescues/', category: 'hybrid' },
    { url: 'https://www.taylormadegolf.com/iron-sets/', category: 'iron' },
    { url: 'https://www.taylormadegolf.com/wedges/', category: 'wedge' },
    { url: 'https://www.taylormadegolf.com/putters/', category: 'putter' },
    { url: 'https://www.taylormadegolf.com/golf-balls/', category: 'balls' }
  ];

  for (const cat of categories) {
    try {
      console.log(`  Fetching ${cat.category} from ${cat.url}`);
      const response = await axios.get(cat.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      $('.product-tile').each((i, el) => {
        const $el = $(el);
        const name = $el.find('.product-name').text().trim();
        const price = $el.find('.product-price').text().trim();
        const imageUrl = $el.find('.product-image img').attr('src');
        
        if (name && price) {
          const msrp = parseFloat(price.replace(/[^0-9.]/g, '')) || 0;
          
          equipment.push({
            brand: 'TaylorMade',
            model: name.replace('TaylorMade', '').trim(),
            category: cat.category,
            msrp: msrp,
            image_url: imageUrl?.startsWith('http') ? imageUrl : `https://www.taylormadegolf.com${imageUrl}`,
            specs: {},
            description: $el.find('.product-description').text().trim() || null,
            source: 'TaylorMade Official'
          });
        }
      });
      
      // Small delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`  Error scraping ${cat.category}:`, error.message);
    }
  }
  
  return equipment;
}

// Scrape Callaway
async function scrapeCallaway() {
  console.log('\n🏌️ Scraping Callaway...');
  const equipment = [];
  
  const categories = [
    { url: 'https://www.callawaygolf.com/drivers/', category: 'driver' },
    { url: 'https://www.callawaygolf.com/fairway-woods/', category: 'fairway_wood' },
    { url: 'https://www.callawaygolf.com/hybrids/', category: 'hybrid' },
    { url: 'https://www.callawaygolf.com/iron-sets/', category: 'iron' },
    { url: 'https://www.callawaygolf.com/wedges/', category: 'wedge' },
    { url: 'https://www.callawaygolf.com/putters/', category: 'putter' },
    { url: 'https://www.callawaygolf.com/golf-balls/', category: 'balls' }
  ];

  for (const cat of categories) {
    try {
      console.log(`  Fetching ${cat.category} from ${cat.url}`);
      const response = await axios.get(cat.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      $('.product-item').each((i, el) => {
        const $el = $(el);
        const name = $el.find('.product-name').text().trim();
        const price = $el.find('.product-price').text().trim();
        const imageUrl = $el.find('.product-image img').attr('src');
        
        if (name && price) {
          const msrp = parseFloat(price.replace(/[^0-9.]/g, '')) || 0;
          
          equipment.push({
            brand: 'Callaway',
            model: name.replace('Callaway', '').trim(),
            category: cat.category,
            msrp: msrp,
            image_url: imageUrl?.startsWith('http') ? imageUrl : `https://www.callawaygolf.com${imageUrl}`,
            specs: {},
            description: $el.find('.product-description').text().trim() || null,
            source: 'Callaway Official'
          });
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`  Error scraping ${cat.category}:`, error.message);
    }
  }
  
  return equipment;
}

// Scrape Golf Galaxy for a wide variety
async function scrapeGolfGalaxy() {
  console.log('\n🏌️ Scraping Golf Galaxy with Puppeteer...');
  const equipment = [];
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    const categories = [
      { url: 'https://www.golfgalaxy.com/c/golf-drivers', category: 'driver' },
      { url: 'https://www.golfgalaxy.com/c/golf-fairway-woods', category: 'fairway_wood' },
      { url: 'https://www.golfgalaxy.com/c/golf-wedges', category: 'wedge' },
      { url: 'https://www.golfgalaxy.com/c/golf-putters', category: 'putter' }
    ];
    
    for (const cat of categories) {
      console.log(`  Fetching ${cat.category} from Golf Galaxy`);
      
      try {
        await page.goto(cat.url, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('.product-card', { timeout: 10000 });
        
        const products = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('.product-card')).map(card => {
            const brand = card.querySelector('.product-card-brand')?.textContent?.trim();
            const title = card.querySelector('.product-card-title')?.textContent?.trim();
            const price = card.querySelector('.product-price-value')?.textContent?.trim();
            const img = card.querySelector('.product-card-image img')?.src;
            
            return { brand, title, price, img };
          });
        });
        
        products.forEach(p => {
          if (p.brand && p.title && p.price) {
            const msrp = parseFloat(p.price.replace(/[^0-9.]/g, '')) || 0;
            
            equipment.push({
              brand: p.brand,
              model: p.title,
              category: cat.category,
              msrp: msrp,
              image_url: p.img || null,
              specs: {},
              description: null,
              source: 'Golf Galaxy'
            });
          }
        });
        
        // Be respectful with delays
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`  Error scraping ${cat.category}:`, error.message);
      }
    }
    
  } finally {
    await browser.close();
  }
  
  return equipment;
}

// Main function to coordinate all scrapers
async function scrapeAllSources() {
  console.log('🚀 Starting multi-source equipment scraping...\n');
  
  let allEquipment = [];
  
  // Run scrapers
  try {
    const taylorMadeData = await scrapeTaylorMade();
    console.log(`  ✅ Found ${taylorMadeData.length} items from TaylorMade`);
    allEquipment = [...allEquipment, ...taylorMadeData];
  } catch (error) {
    console.error('Error with TaylorMade scraper:', error.message);
  }
  
  try {
    const callawayData = await scrapeCallaway();
    console.log(`  ✅ Found ${callawayData.length} items from Callaway`);
    allEquipment = [...allEquipment, ...callawayData];
  } catch (error) {
    console.error('Error with Callaway scraper:', error.message);
  }
  
  try {
    const golfGalaxyData = await scrapeGolfGalaxy();
    console.log(`  ✅ Found ${golfGalaxyData.length} items from Golf Galaxy`);
    allEquipment = [...allEquipment, ...golfGalaxyData];
  } catch (error) {
    console.error('Error with Golf Galaxy scraper:', error.message);
  }
  
  // Remove duplicates based on brand + model
  const uniqueEquipment = Array.from(
    new Map(allEquipment.map(item => [`${item.brand}-${item.model}`, item])).values()
  );
  
  console.log(`\n📊 Total unique items: ${uniqueEquipment.length}`);
  
  // Insert into database
  if (uniqueEquipment.length > 0) {
    console.log('\n💾 Inserting into database...');
    
    const { data, error } = await supabase
      .from('equipment')
      .insert(uniqueEquipment)
      .select();
      
    if (error) {
      console.error('Error inserting equipment:', error);
    } else {
      console.log(`✅ Successfully inserted ${data.length} items!`);
      
      // Show some examples
      console.log('\n📷 Sample items with images:');
      data.filter(d => d.image_url).slice(0, 5).forEach(item => {
        console.log(`  - ${item.brand} ${item.model}: ${item.image_url}`);
      });
    }
  }
}

// Run the scraper
scrapeAllSources().catch(console.error);