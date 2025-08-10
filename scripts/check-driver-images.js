import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDriverImages() {
  console.log('🏌️ Checking Driver Images Status\n');
  console.log('=' .repeat(60) + '\n');
  
  // Get all drivers
  const { data: allDrivers, error } = await supabase
    .from('equipment')
    .select('id, brand, model, image_url')
    .eq('category', 'driver')
    .order('brand');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  let placeholderCount = 0;
  let realImageCount = 0;
  let noImageCount = 0;
  
  const driversWithRealImages = [];
  const driversNeedingImages = [];
  
  allDrivers.forEach(driver => {
    if (!driver.image_url) {
      noImageCount++;
      driversNeedingImages.push(driver);
    } else if (driver.image_url.includes('placehold')) {
      placeholderCount++;
      driversNeedingImages.push(driver);
    } else {
      realImageCount++;
      driversWithRealImages.push(driver);
    }
  });
  
  console.log('📊 Summary:');
  console.log(`  Total drivers: ${allDrivers.length}`);
  console.log(`  ✅ Real images: ${realImageCount}`);
  console.log(`  ⚠️  Placeholders: ${placeholderCount}`);
  console.log(`  ❌ No image: ${noImageCount}`);
  console.log(`  📈 Success rate: ${Math.round((realImageCount / allDrivers.length) * 100)}%\n`);
  
  if (driversWithRealImages.length > 0) {
    console.log('✅ Drivers with real images:');
    driversWithRealImages.slice(0, 10).forEach(d => {
      console.log(`  - ${d.brand} ${d.model}`);
      console.log(`    ${d.image_url.substring(0, 100)}...`);
    });
  }
  
  if (driversNeedingImages.length > 0) {
    console.log('\n❌ Top drivers needing images:');
    driversNeedingImages.slice(0, 10).forEach(d => {
      const status = d.image_url ? '[PLACEHOLDER]' : '[NO IMAGE]';
      console.log(`  - ${d.brand} ${d.model} ${status}`);
    });
  }
  
  // Check storage bucket
  console.log('\n📦 Checking storage bucket...');
  const { data: files, error: storageError } = await supabase.storage
    .from('equipment-images')
    .list('', { limit: 100 });
  
  if (!storageError && files) {
    console.log(`  Files in storage: ${files.length}`);
    
    // Group by folder
    const folders = {};
    files.forEach(file => {
      if (file.name.includes('/')) {
        const folder = file.name.split('/')[0];
        folders[folder] = (folders[folder] || 0) + 1;
      }
    });
    
    console.log('  Files by brand:');
    Object.entries(folders).forEach(([folder, count]) => {
      console.log(`    ${folder}: ${count} files`);
    });
  }
}

checkDriverImages().catch(console.error);