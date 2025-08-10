#!/usr/bin/env node

import puppeteer from 'puppeteer';

async function testDynamicImports() {
  console.log('🧪 Testing Dynamic Imports on localhost:3333\n');
  console.log('=' .repeat(60));
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Collect console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    // Navigate to the site
    console.log('📍 Navigating to http://localhost:3333...');
    await page.goto('http://localhost:3333', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Check if page loaded
    const title = await page.title();
    console.log(`✅ Page loaded with title: "${title}"`);
    
    // Navigate to My Bag page (where dynamic imports are used)
    console.log('\n📍 Navigating to My Bag page...');
    await page.goto('http://localhost:3333/my-bag', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait a bit for lazy components to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check for dynamic import errors
    console.log('\n📊 Checking for errors...');
    if (errors.length === 0) {
      console.log('✅ No errors detected!');
    } else {
      console.log(`❌ Found ${errors.length} errors:`);
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    // Check if lazy-loaded components are present
    console.log('\n🔍 Checking for lazy-loaded components...');
    
    // Check for equipment selector (should be lazy loaded)
    const hasEquipmentSelector = await page.evaluate(() => {
      return document.querySelector('[data-testid="equipment-selector"]') !== null ||
             document.querySelector('.equipment-selector') !== null ||
             document.body.textContent.includes('Add Equipment') ||
             document.body.textContent.includes('equipment');
    });
    
    if (hasEquipmentSelector) {
      console.log('✅ Equipment-related components loaded');
    } else {
      console.log('⚠️  Equipment components may not have loaded');
    }
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: '/tmp/dynamic-import-test.png' });
    console.log('\n📸 Screenshot saved to /tmp/dynamic-import-test.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✨ Test complete!\n');
}

testDynamicImports().catch(console.error);