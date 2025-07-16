import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Add stealth plugin
puppeteer.use(StealthPlugin());

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simpler approach - use Google Images directly
async function findEquipmentWithoutPhotos(limit = 10) {
  console.log('🔍 Finding equipment without photos...');
  
  const { data, error } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .or('image_url.is.null,image_url.eq.""')
    .order('popularity_score', { ascending: false })
    .limit(limit);
    
  if (error) {
    console.error('Error:', error);
    return [];
  }
  
  console.log(`Found ${data.length} equipment items without photos\n`);
  return data;
}

async function searchGoogleImages(browser, equipment) {
  const page = await browser.newPage();
  
  try {
    // Build search query
    const searchQuery = `${equipment.brand} ${equipment.model} golf ${equipment.category} product`;
    const googleUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery)}`;
    
    console.log(`  🔍 Searching Google Images...`);
    
    // Navigate to Google Images
    await page.goto(googleUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Wait for images to load
    await page.waitForSelector('img[data-src]', { timeout: 5000 });
    
    // Get first few image URLs
    const imageUrls = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[data-src]');
      return Array.from(imgs)
        .slice(1, 4) // Skip first (usually Google logo), get next 3
        .map(img => img.dataset.src || img.src)
        .filter(url => url && url.startsWith('http'));
    });
    
    if (imageUrls.length > 0) {
      console.log(`  📸 Found ${imageUrls.length} images`);
      
      // Try to capture the first valid image
      for (const imageUrl of imageUrls) {
        try {
          // Navigate to image URL
          await page.goto(imageUrl, { waitUntil: 'networkidle2', timeout: 10000 });
          
          // Take screenshot
          const screenshot = await page.screenshot({
            type: 'png',
            fullPage: false
          });
          
          // Process image
          const processed = await sharp(screenshot)
            .resize(800, 800, {
              fit: 'inside',
              withoutEnlargement: true,
              background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .png({ quality: 90 })
            .toBuffer();
            
          // Upload to Supabase
          const fileName = `${equipment.brand.toLowerCase().replace(/\s+/g, '-')}/${equipment.model.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('equipment-images')
            .upload(fileName, processed, {
              contentType: 'image/png',
              upsert: true
            });
            
          if (!uploadError) {
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('equipment-images')
              .getPublicUrl(fileName);
              
            // Update equipment record
            await supabase
              .from('equipment')
              .update({ image_url: publicUrl })
              .eq('id', equipment.id);
              
            console.log(`  ✅ Successfully saved image`);
            return true;
          }
        } catch (err) {
          // Try next image
          continue;
        }
      }
    }
    
    console.log(`  ❌ No suitable images found`);
    return false;
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return false;
  } finally {
    await page.close();
  }
}

async function collectScreenshots(limit = 10) {
  console.log('🚀 Starting Simple Screenshot Collection\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
  
  try {
    const equipment = await findEquipmentWithoutPhotos(limit);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < equipment.length; i++) {
      const item = equipment[i];
      console.log(`[${i + 1}/${equipment.length}] ${item.brand} ${item.model}`);
      
      const success = await searchGoogleImages(browser, item);
      
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Rate limiting
      if (i < equipment.length - 1) {
        console.log(`  ⏳ Waiting 2s...\n`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
  }
}

// Run it
const limit = parseInt(process.argv[2]) || 10;
await collectScreenshots(limit);