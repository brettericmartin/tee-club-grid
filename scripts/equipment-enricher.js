import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Equipment Enricher
 * 
 * Enriches existing equipment data with missing information:
 * - Tour usage data
 * - Missing specifications
 * - Better descriptions
 * - Updated pricing
 * - Higher quality images
 */

// Fields that can be enriched
const ENRICHABLE_FIELDS = [
  'description',
  'specs',
  'image_url',
  'msrp',
  'tour_usage',
  'key_features',
  'release_year'
];

/**
 * Analyze equipment to find missing data
 */
async function analyzeEquipment(limit = 100) {
  console.log('🔍 Analyzing equipment for missing data...\n');
  
  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('*')
    .limit(limit);
  
  if (error) {
    console.error('Error fetching equipment:', error);
    return;
  }
  
  const missingData = {
    no_description: [],
    no_image: [],
    no_specs: [],
    no_msrp: [],
    no_tour_usage: [],
    no_release_year: [],
    incomplete_specs: []
  };
  
  equipment.forEach(item => {
    const identifier = `${item.brand} ${item.model}`;
    
    if (!item.description || item.description.length < 50) {
      missingData.no_description.push(identifier);
    }
    
    if (!item.image_url) {
      missingData.no_image.push(identifier);
    }
    
    if (!item.specs || Object.keys(item.specs).length === 0) {
      missingData.no_specs.push(identifier);
    } else if (Object.keys(item.specs).length < 3) {
      missingData.incomplete_specs.push(identifier);
    }
    
    if (!item.msrp || item.msrp === 0) {
      missingData.no_msrp.push(identifier);
    }
    
    if (!item.tour_usage || item.tour_usage.length === 0) {
      missingData.no_tour_usage.push(identifier);
    }
    
    if (!item.release_year) {
      missingData.no_release_year.push(identifier);
    }
  });
  
  // Display analysis results
  console.log('📊 Missing Data Analysis:');
  console.log('='.repeat(50));
  
  Object.entries(missingData).forEach(([key, items]) => {
    if (items.length > 0) {
      const label = key.replace(/_/g, ' ').replace('no ', 'Missing ');
      console.log(`\n${label}: ${items.length} items`);
      if (items.length <= 5) {
        items.forEach(item => console.log(`  - ${item}`));
      } else {
        items.slice(0, 5).forEach(item => console.log(`  - ${item}`));
        console.log(`  ... and ${items.length - 5} more`);
      }
    }
  });
  
  // Calculate completeness score
  const totalFields = equipment.length * ENRICHABLE_FIELDS.length;
  let filledFields = 0;
  
  equipment.forEach(item => {
    ENRICHABLE_FIELDS.forEach(field => {
      if (item[field] && 
          (typeof item[field] !== 'object' || Object.keys(item[field]).length > 0)) {
        filledFields++;
      }
    });
  });
  
  const completeness = ((filledFields / totalFields) * 100).toFixed(1);
  console.log(`\n📈 Overall Data Completeness: ${completeness}%`);
  
  return missingData;
}

/**
 * Enrich equipment with tour usage data
 */
async function enrichTourUsage(category = 'driver') {
  console.log(`\n🏌️ Enriching tour usage for ${category}s...`);
  
  // Sample tour usage data (in production, this would come from web scraping or API)
  const TOUR_USAGE_DATA = {
    driver: {
      'TaylorMade': {
        'Qi10 LS': ['Rory McIlroy', 'Tiger Woods', 'Collin Morikawa'],
        'Qi10 Max': ['Tommy Fleetwood', 'Nelly Korda'],
        'Stealth 2 Plus': ['Scottie Scheffler', 'Dustin Johnson']
      },
      'Titleist': {
        'TSR3': ['Jordan Spieth', 'Justin Thomas', 'Max Homa'],
        'TSR2': ['Will Zalatoris', 'Cameron Young']
      },
      'Callaway': {
        'Paradym Triple Diamond': ['Jon Rahm', 'Xander Schauffele'],
        'Paradym Ai Smoke Max': ['Phil Mickelson', 'Sam Burns']
      },
      'Ping': {
        'G430 LST': ['Viktor Hovland', 'Tyrrell Hatton'],
        'G430 Max': ['Louis Oosthuizen', 'Bubba Watson']
      }
    },
    putter: {
      'Scotty Cameron': {
        'Newport 2': ['Justin Thomas', 'Adam Scott'],
        'Phantom X 5': ['Jon Rahm'],
        'Special Select Squareback 2': ['Scottie Scheffler']
      },
      'Odyssey': {
        'White Hot OG #7': ['Xander Schauffele'],
        'Tri-Hot 5K': ['Collin Morikawa']
      },
      'TaylorMade': {
        'Spider Tour': ['Rory McIlroy', 'Jason Day'],
        'TP Hydro Blast': ['Dustin Johnson']
      }
    }
  };
  
  const tourData = TOUR_USAGE_DATA[category] || {};
  let updatedCount = 0;
  
  for (const [brand, models] of Object.entries(tourData)) {
    for (const [model, players] of Object.entries(models)) {
      const { data, error } = await supabase
        .from('equipment')
        .update({ tour_usage: players })
        .eq('brand', brand)
        .eq('model', model)
        .eq('category', category)
        .select();
      
      if (data && data.length > 0) {
        console.log(`  ✅ Updated ${brand} ${model} with ${players.length} tour players`);
        updatedCount++;
      }
    }
  }
  
  console.log(`\nUpdated ${updatedCount} items with tour usage data`);
  return updatedCount;
}

/**
 * Enrich equipment with better descriptions
 */
async function enrichDescriptions(category = 'driver') {
  console.log(`\n📝 Enriching descriptions for ${category}s...`);
  
  // Get items without descriptions
  const { data: items, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('category', category)
    .or('description.is.null,description.eq.')
    .limit(10);
  
  if (error) {
    console.error('Error fetching items:', error);
    return 0;
  }
  
  if (items.length === 0) {
    console.log(`All ${category}s already have descriptions`);
    return 0;
  }
  
  // Sample descriptions (in production, generate via AI or fetch from sources)
  const DESCRIPTION_TEMPLATES = {
    driver: 'The {brand} {model} driver delivers exceptional distance and forgiveness with advanced {material} construction. Designed for golfers seeking {benefit}, this driver features {technology} for optimal performance.',
    iron: 'The {brand} {model} irons combine distance, forgiveness, and feel in a {design} design. Featuring {technology}, these irons help golfers achieve consistent ball striking and improved accuracy.',
    putter: 'The {brand} {model} putter offers tour-proven performance with {technology}. Its {design} design provides exceptional feel and alignment, helping golfers make more putts with confidence.',
    wedge: 'The {brand} {model} wedge delivers precision and versatility around the green. With {technology} and {grooves} grooves, this wedge provides maximum spin and control in all conditions.'
  };
  
  const template = DESCRIPTION_TEMPLATES[category] || 'The {brand} {model} offers exceptional performance and quality for discerning golfers.';
  
  let updatedCount = 0;
  for (const item of items) {
    // Generate description based on template and available data
    let description = template
      .replace('{brand}', item.brand)
      .replace('{model}', item.model)
      .replace('{material}', item.specs?.material || 'premium')
      .replace('{technology}', item.specs?.technology || 'innovative technology')
      .replace('{benefit}', category === 'driver' ? 'maximum distance' : 'improved performance')
      .replace('{design}', item.specs?.design || 'modern')
      .replace('{grooves}', item.specs?.grooves || 'precision-milled');
    
    const { error: updateError } = await supabase
      .from('equipment')
      .update({ description })
      .eq('id', item.id);
    
    if (!updateError) {
      console.log(`  ✅ Added description for ${item.brand} ${item.model}`);
      updatedCount++;
    }
  }
  
  console.log(`\nUpdated ${updatedCount} items with descriptions`);
  return updatedCount;
}

/**
 * Enrich equipment with specification data
 */
async function enrichSpecs(category = 'driver') {
  console.log(`\n⚙️ Enriching specifications for ${category}s...`);
  
  // Get items with incomplete specs
  const { data: items, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('category', category)
    .limit(10);
  
  if (error) {
    console.error('Error fetching items:', error);
    return 0;
  }
  
  // Category-specific spec templates
  const SPEC_TEMPLATES = {
    driver: {
      loft_options: ['9°', '10.5°', '12°'],
      shaft_flex: ['Regular', 'Stiff', 'X-Stiff'],
      head_size: '460cc',
      adjustability: 'Yes',
      swing_weight: 'D3'
    },
    iron: {
      set_composition: '4-PW',
      shaft_type: 'Steel',
      shaft_flex: ['Regular', 'Stiff'],
      lie_angle: 'Standard',
      offset: 'Progressive'
    },
    putter: {
      head_style: 'Blade',
      length_options: ['33"', '34"', '35"'],
      grip_style: 'SuperStroke',
      toe_hang: 'Slight',
      alignment_aid: 'Yes'
    },
    wedge: {
      loft_options: ['50°', '54°', '58°'],
      bounce_options: ['8°', '10°', '12°'],
      grind_options: ['S', 'M', 'L'],
      groove_type: 'Milled',
      finish: 'Chrome'
    }
  };
  
  const specTemplate = SPEC_TEMPLATES[category] || {};
  let updatedCount = 0;
  
  for (const item of items) {
    // Only update if specs are missing or incomplete
    const currentSpecs = item.specs || {};
    const hasAllSpecs = Object.keys(specTemplate).every(key => currentSpecs[key]);
    
    if (!hasAllSpecs) {
      const enrichedSpecs = { ...specTemplate, ...currentSpecs };
      
      const { error: updateError } = await supabase
        .from('equipment')
        .update({ specs: enrichedSpecs })
        .eq('id', item.id);
      
      if (!updateError) {
        console.log(`  ✅ Enriched specs for ${item.brand} ${item.model}`);
        updatedCount++;
      }
    }
  }
  
  console.log(`\nUpdated ${updatedCount} items with specifications`);
  return updatedCount;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Equipment Data Enricher for Teed.club');
  console.log('========================================\n');
  
  const args = process.argv.slice(2);
  const command = args[0] || 'analyze';
  const category = args[1] || 'driver';
  
  switch (command) {
    case 'analyze':
      await analyzeEquipment();
      break;
      
    case 'tour':
      await enrichTourUsage(category);
      break;
      
    case 'descriptions':
      await enrichDescriptions(category);
      break;
      
    case 'specs':
      await enrichSpecs(category);
      break;
      
    case 'all':
      console.log('Running all enrichment tasks...\n');
      await analyzeEquipment();
      await enrichTourUsage(category);
      await enrichDescriptions(category);
      await enrichSpecs(category);
      break;
      
    default:
      console.log('Usage: node scripts/equipment-enricher.js [command] [category]');
      console.log('\nCommands:');
      console.log('  analyze      - Analyze equipment for missing data');
      console.log('  tour         - Enrich with tour usage data');
      console.log('  descriptions - Add missing descriptions');
      console.log('  specs        - Add missing specifications');
      console.log('  all          - Run all enrichment tasks');
      console.log('\nCategories: driver, iron, putter, wedge, etc.');
  }
}

main().catch(console.error);