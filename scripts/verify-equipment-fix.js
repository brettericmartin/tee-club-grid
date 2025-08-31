import puppeteer from 'puppeteer';

async function verifyEquipmentFix() {
  console.log('🔍 Verifying equipment null error fix...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Collect all errors
  const errors = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('equipment') && (text.includes('null') || text.includes('undefined'))) {
      errors.push(text);
    }
  });
  
  page.on('pageerror', error => {
    if (error.message.includes('equipment')) {
      errors.push(error.message);
    }
  });
  
  console.log('📄 Loading My Bag page...');
  
  try {
    await page.goto('http://localhost:3333/my-bag', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for potential errors
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check page content for error messages
    const pageHasError = await page.evaluate(() => {
      const bodyText = document.body.textContent || '';
      return bodyText.includes("can't access property") && 
             bodyText.includes("equipment");
    });
    
    // Check if error boundary was triggered
    const hasErrorBoundary = await page.evaluate(() => {
      const h1s = document.querySelectorAll('h1');
      for (const h1 of h1s) {
        if (h1.textContent && (
          h1.textContent.includes('Something went wrong') ||
          h1.textContent.includes('Oops')
        )) {
          return true;
        }
      }
      return false;
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION RESULTS');
    console.log('='.repeat(60));
    
    if (errors.length > 0) {
      console.log('❌ Equipment-related errors detected:');
      errors.forEach(err => console.log(`   - ${err}`));
    } else {
      console.log('✅ No equipment null errors in console');
    }
    
    if (pageHasError) {
      console.log('❌ Page shows equipment error message');
    } else {
      console.log('✅ Page content has no equipment errors');
    }
    
    if (hasErrorBoundary) {
      console.log('❌ Error boundary was triggered');
    } else {
      console.log('✅ No error boundary triggered');
    }
    
    // Final verdict
    const success = errors.length === 0 && !pageHasError && !hasErrorBoundary;
    
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('🎉 SUCCESS: Equipment null error has been fixed!');
    } else {
      console.log('⚠️  WARNING: Some issues remain');
    }
    console.log('='.repeat(60));
    
    await browser.close();
    return success;
    
  } catch (error) {
    console.error('❌ Failed to load page:', error.message);
    await browser.close();
    return false;
  }
}

verifyEquipmentFix()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });