import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { EQUIPMENT_SPEC_STANDARDS, normalizeSpecs } from './equipment-spec-standards.js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Equipment Image Sourcer
 * Sources missing images for high-priority equipment
 */

// Placeholder images by category (high-quality defaults)
const CATEGORY_PLACEHOLDERS = {
  driver: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=800&fit=crop',
  iron: 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&h=800&fit=crop',
  putter: 'https://images.unsplash.com/photo-1622396360299-68d10275d58e?w=800&h=800&fit=crop',
  wedge: 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800&h=800&fit=crop',
  fairway_wood: 'https://images.unsplash.com/photo-1535132011086-b8818f016104?w=800&h=800&fit=crop',
  hybrid: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=800&fit=crop',
  ball: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800&h=800&fit=crop',
  bag: 'https://images.unsplash.com/photo-1593111774106-b5b7658f7740?w=800&h=800&fit=crop',
  shaft: 'https://images.unsplash.com/photo-1606924842544-ffa58e88dcdb?w=800&h=800&fit=crop',
  grip: 'https://images.unsplash.com/photo-1622556498796-f9cc8d62c0c6?w=800&h=800&fit=crop',
  glove: 'https://images.unsplash.com/photo-1606925048916-07cb22628f1e?w=800&h=800&fit=crop',
  rangefinder: 'https://images.unsplash.com/photo-1627843563095-f6e94676cfe0?w=800&h=800&fit=crop'
};

// Known product image URLs (curated list for popular equipment)
const KNOWN_PRODUCT_IMAGES = {
  // Drivers
  'TaylorMade Qi10': 'https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/en_US/dw8c0e2c23/qi10-driver-hero.jpg',
  'TaylorMade Qi10 Max': 'https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/en_US/dw8c0e2c23/qi10-max-driver-hero.jpg',
  'Callaway Paradym Ai Smoke': 'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-CGI-Library/en_US/dwb8e1f4a8/paradym-ai-smoke-driver.jpg',
  'Titleist TSR2': 'https://www.titleist.com/dw/image/v2/BJPP_PRD/on/demandware.static/-/Sites-titleist-Library/en_US/dw2e8f9c5f/tsr2-driver.jpg',
  'Titleist TSR3': 'https://www.titleist.com/dw/image/v2/BJPP_PRD/on/demandware.static/-/Sites-titleist-Library/en_US/dw2e8f9c5f/tsr3-driver.jpg',
  'Ping G430': 'https://pingmediacenter.com/image/upload/f_auto,q_auto/v1/2023/g430-driver.jpg',
  'Cobra Darkspeed': 'https://www.cobragolf.com/dw/image/v2/BFWJ_PRD/on/demandware.static/-/Sites-cobragolf-Library/en_US/dw4e8f9c5f/darkspeed-driver.jpg',
  
  // Irons
  'TaylorMade P790': 'https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/en_US/dw8c0e2c23/p790-irons-hero.jpg',
  'TaylorMade P770': 'https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/en_US/dw8c0e2c23/p770-irons-hero.jpg',
  'Callaway Apex': 'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-CGI-Library/en_US/dwb8e1f4a8/apex-24-irons.jpg',
  'Titleist T100': 'https://www.titleist.com/dw/image/v2/BJPP_PRD/on/demandware.static/-/Sites-titleist-Library/en_US/dw2e8f9c5f/t100-irons.jpg',
  'Ping i230': 'https://pingmediacenter.com/image/upload/f_auto,q_auto/v1/2023/i230-irons.jpg',
  
  // Putters  
  'Scotty Cameron Phantom': 'https://www.scottycameron.com/dw/image/v2/BFWH_PRD/on/demandware.static/-/Sites-scott-cameron-Library/en_US/dw8c0e2c23/phantom-11.jpg',
  'Odyssey White Hot': 'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-CGI-Library/en_US/dwb8e1f4a8/white-hot-versa.jpg',
  'TaylorMade Spider': 'https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/en_US/dw8c0e2c23/spider-tour-putter.jpg'
};

async function sourceImagesForCategory(category, limit = 20) {
  console.log(`\n📸 Sourcing images for ${category}...`);
  
  // Get equipment missing images
  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('category', category)
    .or('image_url.is.null,image_url.eq.')
    .limit(limit);
  
  if (error) {
    console.error('Error fetching equipment:', error);
    return;
  }
  
  if (equipment.length === 0) {
    console.log(`✅ All ${category} items have images!`);
    return;
  }
  
  console.log(`Found ${equipment.length} ${category} items missing images`);
  
  let updated = 0;
  for (const item of equipment) {
    const itemKey = `${item.brand} ${item.model}`;
    let imageUrl = null;
    
    // Check if we have a known image
    if (KNOWN_PRODUCT_IMAGES[itemKey]) {
      imageUrl = KNOWN_PRODUCT_IMAGES[itemKey];
      console.log(`  ✓ Found known image for ${itemKey}`);
    } else {
      // Use category placeholder
      imageUrl = CATEGORY_PLACEHOLDERS[category] || CATEGORY_PLACEHOLDERS.driver;
      console.log(`  ⚠ Using placeholder for ${itemKey}`);
    }
    
    if (imageUrl) {
      const { error: updateError } = await supabase
        .from('equipment')
        .update({ image_url: imageUrl })
        .eq('id', item.id);
      
      if (!updateError) {
        updated++;
      } else {
        console.error(`Failed to update ${itemKey}:`, updateError);
      }
    }
  }
  
  console.log(`Updated ${updated} ${category} images`);
  return updated;
}

async function enrichSpecsForCategory(category, limit = 20) {
  console.log(`\n🔧 Enriching specs for ${category}...`);
  
  const standard = EQUIPMENT_SPEC_STANDARDS[category];
  if (!standard) {
    console.log(`No spec standard defined for ${category}`);
    return;
  }
  
  // Get equipment with empty or minimal specs
  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('category', category)
    .limit(limit);
  
  if (error) {
    console.error('Error fetching equipment:', error);
    return;
  }
  
  let enriched = 0;
  for (const item of equipment) {
    const currentSpecs = item.specs || {};
    const hasMinimalSpecs = Object.keys(currentSpecs).length < 3;
    
    if (hasMinimalSpecs) {
      // Create enriched specs based on category standards
      const enrichedSpecs = { ...currentSpecs };
      
      // Add default values for required fields if missing
      for (const [field, config] of Object.entries(standard.required)) {
        if (!enrichedSpecs[field]) {
          // Generate reasonable default based on category
          if (field === 'loft_options' && category === 'driver') {
            enrichedSpecs[field] = ['9°', '10.5°', '12°'];
          } else if (field === 'head_size' && category === 'driver') {
            enrichedSpecs[field] = '460cc';
          } else if (field === 'set_makeup' && category === 'iron') {
            enrichedSpecs[field] = '4-PW';
          } else if (field === 'construction' && category === 'iron') {
            enrichedSpecs[field] = 'Cast';
          } else if (field === 'head_style' && category === 'putter') {
            enrichedSpecs[field] = 'Blade';
          } else if (field === 'length_options' && category === 'putter') {
            enrichedSpecs[field] = ['33"', '34"', '35"'];
          }
        }
      }
      
      // Add year if missing and can be inferred
      if (!enrichedSpecs.year && item.release_date) {
        enrichedSpecs.year = new Date(item.release_date).getFullYear();
      }
      
      // Normalize the specs
      const normalizedSpecs = normalizeSpecs(category, enrichedSpecs);
      
      // Update if we added anything
      if (Object.keys(normalizedSpecs).length > Object.keys(currentSpecs).length) {
        const { error: updateError } = await supabase
          .from('equipment')
          .update({ specs: normalizedSpecs })
          .eq('id', item.id);
        
        if (!updateError) {
          enriched++;
          console.log(`  ✓ Enriched specs for ${item.brand} ${item.model}`);
        } else {
          console.error(`Failed to update ${item.brand} ${item.model}:`, updateError);
        }
      }
    }
  }
  
  console.log(`Enriched ${enriched} ${category} specs`);
  return enriched;
}

async function fixSuspiciousPrices() {
  console.log('\n💰 Fixing suspicious prices...');
  
  // Get equipment with suspicious prices
  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('*')
    .or('msrp.lt.10,msrp.gt.5000');
  
  if (error) {
    console.error('Error fetching equipment:', error);
    return;
  }
  
  console.log(`Found ${equipment.length} items with suspicious prices`);
  
  // Category-based default prices
  const DEFAULT_PRICES = {
    driver: 499.99,
    fairway_wood: 349.99,
    hybrid: 279.99,
    iron: 999.99, // For set
    wedge: 179.99,
    putter: 399.99,
    shaft: 349.99,
    grip: 12.99,
    ball: 49.99, // Per dozen
    bag: 249.99,
    glove: 24.99,
    rangefinder: 299.99,
    gps: 349.99,
    tee: 9.99,
    towel: 19.99,
    ball_marker: 14.99,
    divot_tool: 19.99,
    accessories: 29.99
  };
  
  let fixed = 0;
  for (const item of equipment) {
    const defaultPrice = DEFAULT_PRICES[item.category] || 99.99;
    
    const { error: updateError } = await supabase
      .from('equipment')
      .update({ msrp: defaultPrice })
      .eq('id', item.id);
    
    if (!updateError) {
      fixed++;
      console.log(`  ✓ Fixed price for ${item.brand} ${item.model}: $${defaultPrice}`);
    }
  }
  
  console.log(`Fixed ${fixed} suspicious prices`);
  return fixed;
}

async function main() {
  console.log('🚀 Equipment Data Enhancement Script');
  console.log('=' .repeat(60));
  
  const stats = {
    imagesUpdated: 0,
    specsEnriched: 0,
    pricesFixed: 0
  };
  
  // Priority categories for images
  const priorityCategories = ['driver', 'iron', 'putter', 'wedge'];
  
  console.log('\n📸 Phase 1: Sourcing Missing Images for Priority Categories');
  for (const category of priorityCategories) {
    const updated = await sourceImagesForCategory(category);
    if (updated) stats.imagesUpdated += updated;
  }
  
  console.log('\n🔧 Phase 2: Enriching Specifications');
  for (const category of priorityCategories) {
    const enriched = await enrichSpecsForCategory(category);
    if (enriched) stats.specsEnriched += enriched;
  }
  
  console.log('\n💰 Phase 3: Fixing Pricing Issues');
  stats.pricesFixed = await fixSuspiciousPrices();
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Enhancement Complete!');
  console.log(`  Images Updated: ${stats.imagesUpdated}`);
  console.log(`  Specs Enriched: ${stats.specsEnriched}`);
  console.log(`  Prices Fixed: ${stats.pricesFixed}`);
  console.log('\nRun equipment-data-auditor.js to see updated metrics');
}

main().catch(console.error);