import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Helper function to search Google Images (simplified approach)
async function searchGoogleImages(query) {
  try {
    // We'll use a simpler approach - search for the product on manufacturer sites
    const searchQuery = encodeURIComponent(query);
    const results = [];
    
    // Try manufacturer direct URLs first
    if (query.includes('TaylorMade')) {
      results.push(`https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/default/${query.replace(/[^a-zA-Z0-9]/g, '')}_Hero.jpg`);
    }
    if (query.includes('Callaway')) {
      results.push(`https://www.callawaygolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-CG-Library/default/${query.replace(/[^a-zA-Z0-9]/g, '')}_Hero.jpg`);
    }
    if (query.includes('Titleist')) {
      results.push(`https://www.titleist.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-titleist-Library/default/${query.replace(/[^a-zA-Z0-9]/g, '')}_Hero.jpg`);
    }
    
    return results;
  } catch (error) {
    console.error('Error searching images:', error.message);
    return [];
  }
}

// Search PGA Tour Superstore
async function searchPGATourSuperstore(brand, model) {
  try {
    const searchQuery = encodeURIComponent(`${brand} ${model}`);
    const url = `https://www.pgatoursuperstore.com/search?q=${searchQuery}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const imageUrl = $('.product-tile-image img').first().attr('src');
    
    if (imageUrl && imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Search Golf Galaxy
async function searchGolfGalaxy(brand, model) {
  try {
    const searchQuery = encodeURIComponent(`${brand} ${model}`);
    const url = `https://www.golfgalaxy.com/search?searchTerm=${searchQuery}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 5000
    });
    
    const $ = cheerio.load(response.data);
    const imageUrl = $('.product-card img').first().attr('src');
    
    if (imageUrl) {
      return imageUrl.startsWith('http') ? imageUrl : `https:${imageUrl}`;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Search TGW (The Golf Warehouse)
async function searchTGW(brand, model) {
  try {
    const searchQuery = encodeURIComponent(`${brand} ${model}`);
    const url = `https://www.tgw.com/search?q=${searchQuery}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 5000
    });
    
    const $ = cheerio.load(response.data);
    const imageUrl = $('.product-image img').first().attr('src');
    
    if (imageUrl) {
      return imageUrl.startsWith('http') ? imageUrl : `https://www.tgw.com${imageUrl}`;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Direct manufacturer image URLs based on patterns
function getManufacturerImageUrl(brand, model, category) {
  const cleanModel = model.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
  
  const manufacturerPatterns = {
    'TaylorMade': [
      `https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/default/images/${cleanModel}-hero.jpg`,
      `https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/default/${cleanModel}_Hero.jpg`,
      `https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/${cleanModel}.jpg`
    ],
    'Callaway': [
      `https://www.callawaygolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-CG-Library/default/images/${cleanModel}-hero.jpg`,
      `https://www.callawaygolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-CGG-Master/default/${cleanModel}.jpg`
    ],
    'Titleist': [
      `https://www.titleist.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-titleist-Library/default/${cleanModel}_Hero.jpg`,
      `https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/${cleanModel}.jpg`
    ],
    'Ping': [
      `https://pingmediastage.azureedge.net/mediastorage/mediastorage/ping-na/medialibrary/clubs/${category}s/${cleanModel}/${cleanModel}-hero.jpg`,
      `https://ping.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-ping-master/default/${cleanModel}.jpg`
    ],
    'Mizuno': [
      `https://mizunogolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-MG-Library/default/${cleanModel}_Hero.jpg`,
      `https://www.mizunousa.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-mizuno-master/default/${cleanModel}.jpg`
    ],
    'Cleveland': [
      `https://www.clevelandgolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-CG-Library/default/${cleanModel}_Hero.jpg`,
      `https://www.clevelandgolf.com/images/products/${cleanModel}-hero.jpg`
    ],
    'Scotty Cameron': [
      `https://www.scottycameron.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-SC-Library/default/images/putters/${cleanModel}/${cleanModel}_hero.jpg`,
      `https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/scotty-cameron-${cleanModel}.jpg`
    ],
    'Odyssey': [
      `https://www.odysseygolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-OG-Library/default/${cleanModel}_Hero.jpg`,
      `https://www.callawaygolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-CGG-Master/default/odyssey-${cleanModel}.jpg`
    ],
    'Cobra': [
      `https://www.cobragolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-CG-Library/default/${cleanModel}_Hero.jpg`,
      `https://www.cobragolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-cobra-master/default/${cleanModel}.jpg`
    ],
    'Wilson': [
      `https://www.wilson.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-wilson-master/default/${cleanModel}.jpg`,
      `https://www.wilson.com/media/catalog/product/${cleanModel}.jpg`
    ],
    'Srixon': [
      `https://www.srixon.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-srixon-master/default/${cleanModel}.jpg`,
      `https://www.clevelandgolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-CG-Master/default/srixon-${cleanModel}.jpg`
    ]
  };
  
  return manufacturerPatterns[brand] || [];
}

// Test if image URL is valid
async function testImageUrl(url) {
  try {
    const response = await axios.head(url, {
      timeout: 3000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return response.status === 200 && 
           response.headers['content-type'] && 
           response.headers['content-type'].startsWith('image/');
  } catch (error) {
    return false;
  }
}

// Main function to find images for equipment
async function findImageForEquipment(equipment) {
  console.log(`\n🔍 Searching for: ${equipment.brand} ${equipment.model}`);
  
  // If we already have a good image URL, test it first
  if (equipment.image_url && equipment.image_url.includes('http')) {
    const isValid = await testImageUrl(equipment.image_url);
    if (isValid) {
      console.log('  ✅ Current image is valid');
      return equipment.image_url;
    }
  }
  
  // Try manufacturer URLs
  const manufacturerUrls = getManufacturerImageUrl(equipment.brand, equipment.model, equipment.category);
  for (const url of manufacturerUrls) {
    const isValid = await testImageUrl(url);
    if (isValid) {
      console.log('  ✅ Found manufacturer image');
      return url;
    }
  }
  
  // Try searching retail sites
  console.log('  🛒 Searching retail sites...');
  
  const retailers = [
    () => searchPGATourSuperstore(equipment.brand, equipment.model),
    () => searchGolfGalaxy(equipment.brand, equipment.model),
    () => searchTGW(equipment.brand, equipment.model)
  ];
  
  for (const searchFn of retailers) {
    try {
      const imageUrl = await searchFn();
      if (imageUrl) {
        const isValid = await testImageUrl(imageUrl);
        if (isValid) {
          console.log('  ✅ Found retail site image');
          return imageUrl;
        }
      }
    } catch (error) {
      // Continue to next retailer
    }
  }
  
  console.log('  ❌ No image found');
  return null;
}

// Main scraping function
async function scrapeAllImages() {
  console.log('🚀 Starting image scraping for all equipment...\n');
  
  // Get all equipment
  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('*')
    .order('brand', { ascending: true });
    
  if (error) {
    console.error('Error fetching equipment:', error);
    return;
  }
  
  console.log(`Found ${equipment.length} equipment items to process\n`);
  
  let updatedCount = 0;
  let failedCount = 0;
  
  // Process in batches to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < equipment.length; i += batchSize) {
    const batch = equipment.slice(i, i + batchSize);
    
    const promises = batch.map(async (item) => {
      const newImageUrl = await findImageForEquipment(item);
      
      if (newImageUrl && newImageUrl !== item.image_url) {
        // Update the database
        const { error: updateError } = await supabase
          .from('equipment')
          .update({ image_url: newImageUrl })
          .eq('id', item.id);
          
        if (updateError) {
          console.error(`  Error updating ${item.brand} ${item.model}:`, updateError.message);
          failedCount++;
        } else {
          updatedCount++;
        }
      } else if (!newImageUrl) {
        failedCount++;
      }
    });
    
    await Promise.all(promises);
    
    // Rate limiting
    if (i + batchSize < equipment.length) {
      console.log(`\n⏳ Processed ${i + batchSize} items, waiting before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n📊 Scraping complete!');
  console.log(`✅ Updated: ${updatedCount} items`);
  console.log(`❌ Failed: ${failedCount} items`);
  console.log(`⏭️  Skipped: ${equipment.length - updatedCount - failedCount} items (already had valid images)`);
}

// Run the scraper
scrapeAllImages().catch(console.error);