#!/usr/bin/env node

/**
 * Test script to verify equipment selector form persistence
 * This script checks that the form state is properly saved to sessionStorage
 */

import puppeteer from 'puppeteer';

async function testEquipmentPersistence() {
  console.log('🧪 Testing Equipment Selector Form Persistence...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    defaultViewport: { width: 1280, height: 800 }
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to the app
    console.log('1. Navigating to My Bag page...');
    await page.goto('http://localhost:3333/my-bag', { waitUntil: 'networkidle2' });
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="add-equipment-button"], button:has-text("Add Equipment"), button:has(.w-4.h-4)', { timeout: 10000 });
    
    console.log('2. Opening equipment selector modal...');
    // Click add equipment button
    await page.click('[data-testid="add-equipment-button"], button:has-text("Add Equipment"), button:has(.w-4.h-4)');
    
    // Wait for method dialog
    await page.waitForSelector('button:has-text("Browse Equipment")', { timeout: 5000 });
    
    console.log('3. Selecting manual method...');
    await page.click('button:has-text("Browse Equipment")');
    
    // Wait for equipment selector to open
    await page.waitForSelector('.glass-card', { timeout: 5000 });
    
    console.log('4. Selecting a category...');
    // Select a category (e.g., Driver)
    const categoryExists = await page.evaluate(() => {
      const cards = document.querySelectorAll('.glass-card');
      for (const card of cards) {
        if (card.textContent?.includes('Driver')) {
          card.click();
          return true;
        }
      }
      return false;
    });
    
    if (categoryExists) {
      console.log('   ✅ Selected Driver category');
      
      // Wait a moment for brands to load
      await page.waitForTimeout(1000);
      
      console.log('5. Checking sessionStorage for persisted data...');
      const hasPersistedData = await page.evaluate(() => {
        const keys = Object.keys(sessionStorage);
        const persistenceKey = keys.find(key => key.includes('equipment-selector-form'));
        if (persistenceKey) {
          const data = sessionStorage.getItem(persistenceKey);
          console.log('Persisted data:', data);
          return !!data;
        }
        return false;
      });
      
      if (hasPersistedData) {
        console.log('   ✅ Form data is being persisted to sessionStorage');
        
        console.log('6. Closing modal to test persistence...');
        // Close the modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
        console.log('7. Reopening modal to check if state is restored...');
        // Reopen the modal
        await page.click('[data-testid="add-equipment-button"], button:has-text("Add Equipment"), button:has(.w-4.h-4)');
        await page.waitForSelector('button:has-text("Browse Equipment")', { timeout: 5000 });
        await page.click('button:has-text("Browse Equipment")');
        
        // Check if we're still on the brand selection step (not back at category)
        const stillOnBrands = await page.evaluate(() => {
          const title = document.querySelector('.text-2xl')?.textContent;
          return title?.includes('Brand');
        });
        
        if (stillOnBrands) {
          console.log('   ✅ Form state was successfully restored!');
          console.log('\n✨ Equipment persistence is working correctly!');
        } else {
          console.log('   ⚠️ Form was reset instead of restored');
        }
        
        // Check for saved indicator
        const hasSavedIndicator = await page.evaluate(() => {
          return !!document.querySelector('span:has-text("Draft Saved"), .bg-green-500\\/20:has-text("Draft Saved")');
        });
        
        if (hasSavedIndicator) {
          console.log('   ✅ "Draft Saved" indicator is visible');
        }
        
      } else {
        console.log('   ❌ No persisted data found in sessionStorage');
      }
    } else {
      console.log('   ❌ Could not find Driver category');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    console.log('\nClosing browser...');
    await browser.close();
  }
}

// Run the test
testEquipmentPersistence().catch(console.error);