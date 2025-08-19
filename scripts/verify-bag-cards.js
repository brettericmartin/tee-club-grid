import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://yihmnhzocmfeghmevtyh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpaG1uaHpvY21mZWdobWV2dHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0MzUyNDcsImV4cCI6MjA0NjAxMTI0N30.vr-w12LiOvRJZe_2s0GQjNJwxXz6xMKEqRMpZXJRG5s';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyBagCards() {
  console.log('\n=== VERIFYING BAG CARD CONSISTENCY ===\n');
  
  // First, get a sample bag from the database
  const { data: bags } = await supabase
    .from('user_bags')
    .select(`
      id,
      name,
      bag_equipment (
        id,
        custom_photo_url,
        equipment:equipment (
          id,
          brand,
          model,
          image_url,
          equipment_photos (
            photo_url
          )
        )
      )
    `)
    .limit(1);
  
  if (!bags || bags.length === 0) {
    console.log('No bags found in database');
    return;
  }
  
  const sampleBag = bags[0];
  console.log(`Testing with bag: ${sampleBag.name} (ID: ${sampleBag.id})`);
  console.log(`Equipment count: ${sampleBag.bag_equipment?.length || 0}`);
  
  // Check what photos are available
  sampleBag.bag_equipment?.forEach((item, index) => {
    console.log(`\nEquipment ${index + 1}: ${item.equipment?.brand} ${item.equipment?.model}`);
    console.log(`  - Custom photo: ${item.custom_photo_url ? 'YES' : 'NO'}`);
    console.log(`  - Equipment photos: ${item.equipment?.equipment_photos?.length || 0} photos`);
    console.log(`  - Default image: ${item.equipment?.image_url ? 'YES' : 'NO'}`);
    
    if (item.equipment?.equipment_photos?.length > 0) {
      console.log(`  - First community photo: ${item.equipment.equipment_photos[0].photo_url.substring(0, 50)}...`);
    }
    if (item.equipment?.image_url) {
      const isUnsplash = item.equipment.image_url.includes('unsplash');
      console.log(`  - Default is Unsplash: ${isUnsplash ? '❌ YES (OLD AI IMAGE)' : '✅ NO'}`);
    }
  });
  
  // Now test in browser
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('equipment') || text.includes('photo')) {
        console.log('Browser:', text);
      }
    });
    
    console.log('\n=== CHECKING BAGS BROWSER ===');
    await page.goto('http://localhost:3333/bags-browser', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    
    // Get images from bags browser
    const bagBrowserImages = await page.evaluate(() => {
      const firstCard = document.querySelector('.grid > div');
      if (!firstCard) return [];
      
      const images = Array.from(firstCard.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt
      }));
      
      return images;
    });
    
    console.log(`Bags browser images: ${bagBrowserImages.length}`);
    bagBrowserImages.forEach((img, i) => {
      const isUnsplash = img.src.includes('unsplash');
      console.log(`  ${i + 1}. ${isUnsplash ? '❌ UNSPLASH' : '✅ OK'}: ${img.src.substring(0, 60)}...`);
    });
    
    console.log('\n=== CHECKING FEED FLIP CARD ===');
    await page.goto('http://localhost:3333/feed', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    
    // Try to find and click a flip button
    const flipped = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const button of buttons) {
        if (button.querySelector('svg.rotate-ccw') || 
            button.innerHTML.includes('RotateCcw')) {
          button.click();
          return true;
        }
      }
      return false;
    });
    
    if (flipped) {
      await new Promise(r => setTimeout(r, 1500)); // Wait for flip
      
      // Get images from flipped card
      const feedImages = await page.evaluate(() => {
        // Find the flipped container
        const divs = Array.from(document.querySelectorAll('div'));
        for (const div of divs) {
          const style = window.getComputedStyle(div);
          if (style.transform && style.transform.includes('rotateY(180deg)')) {
            const images = Array.from(div.querySelectorAll('img')).map(img => ({
              src: img.src,
              alt: img.alt
            }));
            return images;
          }
        }
        return [];
      });
      
      console.log(`Feed flip card images: ${feedImages.length}`);
      feedImages.forEach((img, i) => {
        const isUnsplash = img.src.includes('unsplash');
        console.log(`  ${i + 1}. ${isUnsplash ? '❌ UNSPLASH' : '✅ OK'}: ${img.src.substring(0, 60)}...`);
      });
      
      // Compare
      console.log('\n=== COMPARISON ===');
      const bagUnsplashCount = bagBrowserImages.filter(img => img.src.includes('unsplash')).length;
      const feedUnsplashCount = feedImages.filter(img => img.src.includes('unsplash')).length;
      
      console.log(`Bags browser Unsplash images: ${bagUnsplashCount}`);
      console.log(`Feed flip Unsplash images: ${feedUnsplashCount}`);
      
      if (bagUnsplashCount === 0 && feedUnsplashCount === 0) {
        console.log('✅ SUCCESS: No Unsplash images in either card!');
      } else {
        console.log('❌ PROBLEM: Still using old Unsplash images');
      }
    } else {
      console.log('No flip button found in feed');
    }
    
  } finally {
    await browser.close();
  }
}

verifyBagCards().catch(console.error);