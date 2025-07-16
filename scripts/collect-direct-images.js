import axios from 'axios';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Known image URL patterns for different brands
const IMAGE_PATTERNS = {
  'TaylorMade': [
    'https://www.taylormadegolf.com/dw/image/v2/AAMP_PRD/on/demandware.static/-/Sites-TMaG-Library/default/${MODEL}_default.jpg',
    'https://taylormadegolf.com/dw/image/v2/AAMP_PRD/on/demandware.static/-/Sites-TMaG-Library/default/${MODEL}_hero.jpg',
  ],
  'Callaway': [
    'https://www.callawaygolf.com/dw/image/v2/AACI_PRD/on/demandware.static/-/Sites-callawaygolf-Library/default/${MODEL}_default.jpg',
    'https://cdn.callawaygolf.com/assets/images/products/${MODEL}_default.jpg',
  ],
  'Titleist': [
    'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-Library/default/${MODEL}_default.jpg',
    'https://cdn.titleist.com/assets/images/products/${MODEL}_default.jpg',
  ],
  'Ping': [
    'https://pingmediastorage.azureedge.net/images/products/${MODEL}_default.jpg',
    'https://ping.com/media/products/${MODEL}_default.jpg',
  ],
  'Cobra': [
    'https://www.cobragolf.com/dw/image/v2/AAXH_PRD/on/demandware.static/-/Sites-cpg-catalog/default/${MODEL}_default.jpg',
  ],
  'Mizuno': [
    'https://cdn.mizuno.com/assets/images/products/${MODEL}_default.jpg',
  ]
};

// Fallback to known golf equipment image CDNs
const FALLBACK_URLS = [
  'https://cdn.2ndswing.com/images/1200/${BRAND}-${MODEL}.jpg',
  'https://s3.golfgalaxy.com/is/image/dks/${BRAND}-${MODEL}',
  'https://images.golfdigest.com/golf-equipment/${BRAND}-${MODEL}.jpg'
];

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

function generateImageUrls(equipment) {
  const urls = [];
  
  // Normalize model name for URLs
  const modelNormalized = equipment.model
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
    
  const brandNormalized = equipment.brand
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Brand-specific patterns
  if (IMAGE_PATTERNS[equipment.brand]) {
    IMAGE_PATTERNS[equipment.brand].forEach(pattern => {
      urls.push(pattern.replace('${MODEL}', modelNormalized));
    });
  }
  
  // Fallback patterns
  FALLBACK_URLS.forEach(pattern => {
    urls.push(
      pattern
        .replace('${BRAND}', brandNormalized)
        .replace('${MODEL}', modelNormalized)
    );
  });
  
  // Additional specific URLs based on category
  if (equipment.category === 'driver') {
    urls.push(`https://www.golfwrx.com/wp-content/uploads/${brandNormalized}-${modelNormalized}-driver.jpg`);
  }
  
  return urls;
}

async function downloadAndProcessImage(url) {
  try {
    console.log(`  🔗 Trying: ${url}`);
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // Check if it's actually an image
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('Not an image');
    }
    
    // Process with sharp
    const processed = await sharp(Buffer.from(response.data))
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({ quality: 90 })
      .toBuffer();
      
    console.log(`  ✅ Downloaded and processed image`);
    return processed;
    
  } catch (error) {
    return null;
  }
}

async function uploadToSupabase(imageBuffer, equipment) {
  try {
    const fileName = `${equipment.brand.toLowerCase().replace(/\s+/g, '-')}/${equipment.model.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    
    const { data, error } = await supabase.storage
      .from('equipment-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });
      
    if (error) throw error;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('equipment-images')
      .getPublicUrl(fileName);
      
    // Update equipment record
    await supabase
      .from('equipment')
      .update({ image_url: publicUrl })
      .eq('id', equipment.id);
      
    console.log(`  ✅ Uploaded to Supabase`);
    return true;
    
  } catch (error) {
    console.error(`  ❌ Upload error: ${error.message}`);
    return false;
  }
}

async function processEquipment(equipment) {
  console.log(`\n📸 Processing: ${equipment.brand} ${equipment.model}`);
  
  const imageUrls = generateImageUrls(equipment);
  console.log(`  Generated ${imageUrls.length} potential URLs`);
  
  // Try each URL
  for (const url of imageUrls) {
    const imageBuffer = await downloadAndProcessImage(url);
    
    if (imageBuffer) {
      const success = await uploadToSupabase(imageBuffer, equipment);
      if (success) {
        return true;
      }
    }
  }
  
  console.log(`  ❌ No valid images found`);
  return false;
}

async function collectDirectImages(limit = 10) {
  console.log('🚀 Starting Direct Image Collection\n');
  
  const equipment = await findEquipmentWithoutPhotos(limit);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const item of equipment) {
    const success = await processEquipment(item);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Small delay between items
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Summary:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
}

// Run it
const limit = parseInt(process.argv[2]) || 10;
await collectDirectImages(limit);