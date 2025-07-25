import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Bulk Equipment Seeder
 * This creates a large dataset of realistic golf equipment
 */

const BRANDS = {
  driver: ['TaylorMade', 'Callaway', 'Titleist', 'Ping', 'Cobra', 'Mizuno', 'Srixon', 'Wilson', 'PXG', 'Honma'],
  iron: ['Mizuno', 'Titleist', 'TaylorMade', 'Callaway', 'Ping', 'Srixon', 'Wilson', 'Cobra', 'PXG', 'Ben Hogan'],
  wedge: ['Titleist', 'Cleveland', 'Callaway', 'TaylorMade', 'Ping', 'Mizuno', 'Wilson', 'Cobra'],
  putter: ['Scotty Cameron', 'Odyssey', 'Ping', 'TaylorMade', 'Cleveland', 'Bettinardi', 'EVNROLL', 'LAB Golf'],
  balls: ['Titleist', 'TaylorMade', 'Callaway', 'Bridgestone', 'Srixon', 'Vice', 'Mizuno', 'Wilson'],
  bags: ['Titleist', 'TaylorMade', 'Callaway', 'Ping', 'Sun Mountain', 'OGIO', 'Vessel', 'Jones']
};

const MODELS = {
  driver: {
    'TaylorMade': ['Stealth 2', 'Stealth 2 Plus', 'Stealth 2 HD', 'SIM2', 'SIM2 Max', 'M6', 'M5'],
    'Callaway': ['Paradym', 'Paradym X', 'Paradym Triple Diamond', 'Rogue ST Max', 'Epic Speed', 'Epic Flash'],
    'Titleist': ['TSR2', 'TSR3', 'TSR4', 'TSi2', 'TSi3', 'TS2', 'TS3'],
    'Ping': ['G430 Max', 'G430 LST', 'G430 SFT', 'G425 Max', 'G425 LST', 'G410 Plus'],
    'Cobra': ['Aerojet', 'Aerojet LS', 'Aerojet Max', 'LTDx', 'LTDx LS', 'Radspeed']
  },
  iron: {
    'Mizuno': ['JPX 923 Tour', 'JPX 923 Forged', 'JPX 923 Hot Metal', 'MP-223', 'MP-225', 'JPX 921 Tour'],
    'Titleist': ['T100', 'T100S', 'T200', 'T300', 'T350', '620 MB', '620 CB'],
    'TaylorMade': ['P790', 'P770', 'P7MB', 'P7MC', 'Stealth', 'SIM2 Max'],
    'Callaway': ['Apex Pro', 'Apex', 'Apex DCB', 'Rogue ST Pro', 'X Forged CB', 'Paradym'],
    'Ping': ['i230', 'i525', 'i59', 'Blueprint', 'G430', 'G425']
  },
  wedge: {
    'Titleist': ['Vokey SM9', 'Vokey SM8', 'Vokey SM7'],
    'Cleveland': ['RTX 6 ZipCore', 'RTX Full-Face', 'CBX 4 ZipCore', 'Smart Sole 4'],
    'Callaway': ['Jaws Raw', 'Jaws MD5', 'Mack Daddy CB'],
    'TaylorMade': ['MG3', 'MG2', 'Hi-Toe 3'],
    'Ping': ['Glide 4.0', 'Glide Forged Pro', 'ChipR']
  },
  putter: {
    'Scotty Cameron': ['Special Select Newport 2', 'Phantom X 5', 'Phantom X 11', 'Special Select Fastback'],
    'Odyssey': ['White Hot OG', 'Tri-Hot 5K', '2-Ball Eleven', 'Toulon Design'],
    'Ping': ['PLD Milled', 'Heppler', 'Sigma 2', 'Vault 2.0'],
    'TaylorMade': ['Spider GT', 'Spider GT Rollback', 'TP Hydro Blast']
  },
  balls: {
    'Titleist': ['Pro V1', 'Pro V1x', 'AVX', 'Tour Speed', 'Velocity'],
    'TaylorMade': ['TP5', 'TP5x', 'Tour Response', 'Soft Response', 'Distance+'],
    'Callaway': ['Chrome Soft', 'Chrome Soft X', 'Chrome Soft X LS', 'Supersoft', 'ERC Soft'],
    'Bridgestone': ['Tour B X', 'Tour B XS', 'Tour B RX', 'e12 Contact', 'e6']
  },
  bags: {
    'Titleist': ['Players 4 Plus', 'Hybrid 14', 'Cart 14', 'Premium Carry'],
    'TaylorMade': ['FlexTech Crossover', 'FlexTech Lite', 'Storm Dry Cart', 'Tour Staff'],
    'Vessel': ['Player 3.0', 'VLX', 'Lux Cart', 'Prime Staff'],
    'Sun Mountain': ['C-130', '4.5 LS', '2.5+', 'Eco-Lite']
  }
};

const PRICE_RANGES = {
  driver: { min: 299, max: 699 },
  fairway_wood: { min: 229, max: 499 },
  hybrid: { min: 199, max: 349 },
  iron: { min: 799, max: 1599 }, // Set price
  wedge: { min: 129, max: 199 },
  putter: { min: 299, max: 599 },
  balls: { min: 29, max: 55 }, // Per dozen
  bags: { min: 199, max: 599 },
  gloves: { min: 15, max: 35 },
  accessories: { min: 25, max: 299 }
};

function generateEquipment() {
  const equipment = [];
  
  // Generate Drivers
  Object.entries(MODELS.driver).forEach(([brand, models]) => {
    models.forEach(model => {
      equipment.push({
        brand,
        model,
        category: 'driver',
        msrp: Math.floor(Math.random() * (PRICE_RANGES.driver.max - PRICE_RANGES.driver.min) + PRICE_RANGES.driver.min),
        specs: {
          loft_options: ['8°', '9°', '10.5°', '12°'],
          shaft_length: '45.75"',
          head_size: '460cc'
        },
        popularity_score: Math.floor(Math.random() * 100)
      });
    });
  });
  
  // Generate Irons
  Object.entries(MODELS.iron).forEach(([brand, models]) => {
    models.forEach(model => {
      equipment.push({
        brand,
        model,
        category: 'iron',
        msrp: Math.floor(Math.random() * (PRICE_RANGES.iron.max - PRICE_RANGES.iron.min) + PRICE_RANGES.iron.min),
        specs: {
          set_makeup: '4-PW',
          shaft_options: ['Steel', 'Graphite'],
          lie_angle: 'Standard'
        },
        popularity_score: Math.floor(Math.random() * 100)
      });
    });
  });
  
  // Generate Wedges
  Object.entries(MODELS.wedge).forEach(([brand, models]) => {
    models.forEach(model => {
      const lofts = ['50°', '52°', '54°', '56°', '58°', '60°'];
      lofts.forEach(loft => {
        equipment.push({
          brand,
          model: `${model} ${loft}`,
          category: 'wedge',
          msrp: Math.floor(Math.random() * (PRICE_RANGES.wedge.max - PRICE_RANGES.wedge.min) + PRICE_RANGES.wedge.min),
          specs: {
            loft,
            bounce: '10°',
            grind: 'S'
          },
          popularity_score: Math.floor(Math.random() * 100)
        });
      });
    });
  });
  
  // Generate Putters
  Object.entries(MODELS.putter).forEach(([brand, models]) => {
    models.forEach(model => {
      equipment.push({
        brand,
        model,
        category: 'putter',
        msrp: Math.floor(Math.random() * (PRICE_RANGES.putter.max - PRICE_RANGES.putter.min) + PRICE_RANGES.putter.min),
        specs: {
          length_options: ['33"', '34"', '35"'],
          head_style: 'Blade',
          hosel: 'Plumber\'s Neck'
        },
        popularity_score: Math.floor(Math.random() * 100)
      });
    });
  });
  
  // Generate Balls
  Object.entries(MODELS.balls).forEach(([brand, models]) => {
    models.forEach(model => {
      equipment.push({
        brand,
        model,
        category: 'balls',
        msrp: Math.floor(Math.random() * (PRICE_RANGES.balls.max - PRICE_RANGES.balls.min) + PRICE_RANGES.balls.min),
        specs: {
          construction: '3-piece',
          compression: '90',
          dimples: '332'
        },
        popularity_score: Math.floor(Math.random() * 100)
      });
    });
  });
  
  // Generate Bags
  Object.entries(MODELS.bags).forEach(([brand, models]) => {
    models.forEach(model => {
      equipment.push({
        brand,
        model,
        category: 'bags',
        msrp: Math.floor(Math.random() * (PRICE_RANGES.bags.max - PRICE_RANGES.bags.min) + PRICE_RANGES.bags.min),
        specs: {
          type: 'Stand',
          dividers: '14-way',
          pockets: '10',
          weight: '5.5 lbs'
        },
        popularity_score: Math.floor(Math.random() * 100)
      });
    });
  });
  
  // Add some fairway woods and hybrids
  const fwBrands = ['TaylorMade', 'Callaway', 'Titleist', 'Ping', 'Cobra'];
  fwBrands.forEach(brand => {
    // Fairway woods
    ['3 Wood', '5 Wood', '7 Wood'].forEach(club => {
      equipment.push({
        brand,
        model: `${brand === 'TaylorMade' ? 'Stealth 2' : brand === 'Callaway' ? 'Paradym' : brand === 'Titleist' ? 'TSR2' : brand === 'Ping' ? 'G430' : 'Aerojet'} ${club}`,
        category: 'fairway_wood',
        msrp: Math.floor(Math.random() * (PRICE_RANGES.fairway_wood.max - PRICE_RANGES.fairway_wood.min) + PRICE_RANGES.fairway_wood.min),
        specs: {
          loft: club === '3 Wood' ? '15°' : club === '5 Wood' ? '18°' : '21°',
          shaft_length: '43"'
        },
        popularity_score: Math.floor(Math.random() * 100)
      });
    });
    
    // Hybrids
    ['3 Hybrid', '4 Hybrid', '5 Hybrid'].forEach(club => {
      equipment.push({
        brand,
        model: `${brand === 'TaylorMade' ? 'Stealth 2' : brand === 'Callaway' ? 'Paradym' : brand === 'Titleist' ? 'TSR' : brand === 'Ping' ? 'G430' : 'Aerojet'} ${club}`,
        category: 'hybrid',
        msrp: Math.floor(Math.random() * (PRICE_RANGES.hybrid.max - PRICE_RANGES.hybrid.min) + PRICE_RANGES.hybrid.min),
        specs: {
          loft: club === '3 Hybrid' ? '19°' : club === '4 Hybrid' ? '22°' : '25°',
          shaft_length: '40.5"'
        },
        popularity_score: Math.floor(Math.random() * 100)
      });
    });
  });
  
  return equipment;
}

async function seedEquipment() {
  console.log('Generating equipment data...');
  const equipment = generateEquipment();
  console.log(`Generated ${equipment.length} equipment items`);
  
  // Check existing equipment first
  console.log('Checking for existing equipment...');
  const { data: existingData } = await supabase
    .from('equipment')
    .select('brand, model, category');
  
  const existingSet = new Set(
    (existingData || []).map(e => `${e.brand}-${e.model}-${e.category}`)
  );
  
  // Filter out duplicates
  const newEquipment = equipment.filter(item => 
    !existingSet.has(`${item.brand}-${item.model}-${item.category}`)
  );
  
  console.log(`Found ${existingData?.length || 0} existing items`);
  console.log(`Will insert ${newEquipment.length} new items`);
  
  if (newEquipment.length === 0) {
    console.log('\n✅ All equipment already exists in database!');
    return;
  }
  
  // Insert in batches
  const batchSize = 50;
  let totalInserted = 0;
  
  for (let i = 0; i < newEquipment.length; i += batchSize) {
    const batch = newEquipment.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from('equipment')
        .insert(
          batch.map(item => ({
            ...item,
            image_url: `https://placehold.co/400x400/1a1a1a/white?text=${encodeURIComponent(item.brand + ' ' + item.model)}`,
            created_at: new Date().toISOString()
          }))
        )
        .select();
      
      if (error) {
        console.error('Error inserting batch:', error);
        console.error('Error details:', error.details, error.message, error.hint);
      } else if (data && data.length > 0) {
        totalInserted += data.length;
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1} (${data.length} items)`);
      } else {
        console.log(`⚠️ Batch ${Math.floor(i/batchSize) + 1} returned no data`);
      }
    } catch (error) {
      console.error('Batch insert error:', error);
    }
  }
  
  console.log(`\nSeeding complete! Total items inserted: ${totalInserted}`);
}

// Run the seeder
seedEquipment().catch(console.error);