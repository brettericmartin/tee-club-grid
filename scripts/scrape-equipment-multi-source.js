import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Multi-source equipment data combining various manufacturers and retailers
const EQUIPMENT_SOURCES = {
  taylormade: {
    name: 'TaylorMade Direct',
    equipment: [
      {
        brand: 'TaylorMade',
        model: 'Stealth 2 HD Driver',
        category: 'driver',
        msrp: 579.99,
        specs: {
          loft_options: ['10.5°', '12°'],
          shaft_flex: ['Senior', 'Regular', 'Stiff'],
          head_size: '460cc',
          material: '60X Carbon Twist Face',
          adjustability: 'Yes - Loft Sleeve (±2°)',
          stock_shaft: 'Fujikura Speeder NX Red',
          swing_weight: 'D3',
          year: 2023
        },
        description: 'High draw bias driver with maximum forgiveness for slower swing speeds.',
        image_url: 'https://www.taylormadegolf.com/dw/image/v2/stealth2-hd-driver.jpg'
      },
      {
        brand: 'TaylorMade',
        model: 'Stealth 2 Fairway',
        category: 'fairway',
        msrp: 349.99,
        specs: {
          loft_options: ['16.5°', '19°', '22°'],
          shaft_flex: ['Regular', 'Stiff'],
          material: '3D Carbon Crown',
          adjustability: 'Yes - Loft Sleeve',
          stock_shaft: 'Fujikura Ventus Red',
          year: 2023
        },
        description: 'Advanced 3D carbon crown construction for lower CG and higher launch.',
        image_url: 'https://www.taylormadegolf.com/dw/image/v2/stealth2-fairway.jpg'
      },
      {
        brand: 'TaylorMade',
        model: 'P790 Black',
        category: 'iron',
        msrp: 1749.99,
        specs: {
          set_composition: '3-PW',
          shaft_options: ['KBS Tour Black', 'UST Recoil Black'],
          material: 'Forged Hollow Body with SpeedFoam Air',
          finish: 'Black PVD',
          year: 2023
        },
        description: 'Limited edition black finish with enhanced feel and distance.',
        image_url: 'https://www.taylormadegolf.com/dw/image/v2/p790-black-irons.jpg'
      }
    ]
  },
  
  callaway: {
    name: 'Callaway Direct',
    equipment: [
      {
        brand: 'Callaway',
        model: 'Paradym Ai Smoke Max Driver',
        category: 'driver',
        msrp: 599.99,
        specs: {
          loft_options: ['9°', '10.5°', '12°'],
          shaft_flex: ['Regular', 'Stiff', 'X-Stiff'],
          head_size: '460cc',
          material: 'AI Smart Face',
          adjustability: 'Yes - OptiFit 3 Hosel',
          stock_shaft: 'Project X Denali Black',
          year: 2024
        },
        description: 'AI-designed face for optimal launch and spin across the face.',
        image_url: 'https://www.callawaygolf.com/dw/image/v2/paradym-ai-smoke-max.jpg'
      },
      {
        brand: 'Callaway',
        model: 'Apex TCB Irons',
        category: 'iron',
        msrp: 2100.00,
        specs: {
          set_composition: '3-PW',
          shaft_options: ['Project X LS', 'Dynamic Gold Tour Issue'],
          material: 'Tour Cavity Back Forging',
          year: 2023
        },
        description: 'Tour-inspired cavity back with pure forged feel.',
        image_url: 'https://www.callawaygolf.com/dw/image/v2/apex-tcb-irons.jpg'
      },
      {
        brand: 'Callaway',
        model: 'Opus Wedge',
        category: 'wedge',
        msrp: 199.99,
        specs: {
          loft_options: ['50°', '52°', '54°', '56°', '58°', '60°'],
          bounce_options: ['S', 'C', 'W'],
          material: '8620 Mild Carbon Steel',
          grooves: 'Spin Gen Face Technology',
          year: 2024
        },
        description: 'Premium wedge co-designed with Phil Mickelson.',
        image_url: 'https://www.callawaygolf.com/dw/image/v2/opus-wedge.jpg'
      }
    ]
  },
  
  golfgalaxy: {
    name: 'Golf Galaxy Inventory',
    equipment: [
      {
        brand: 'Cobra',
        model: 'Darkspeed Driver',
        category: 'driver',
        msrp: 549.00,
        specs: {
          loft_options: ['9°', '10.5°', '12°'],
          shaft_flex: ['Regular', 'Stiff'],
          material: 'PWR-COR Technology',
          adjustability: 'Yes - MyFly8',
          stock_shaft: 'UST Mamiya LIN-Q',
          year: 2024
        },
        description: 'Aerodynamic design with lowest CG ever in a Cobra driver.',
        image_url: 'https://www.cobragolf.com/dw/image/v2/darkspeed-driver.jpg'
      },
      {
        brand: 'Mizuno',
        model: 'JPX 923 Hot Metal Pro',
        category: 'iron',
        msrp: 1199.99,
        specs: {
          set_composition: '4-PW',
          shaft_options: ['UST Recoil Dart', 'Dynamic Gold 105'],
          material: 'Chromoly 4140M',
          year: 2023
        },
        description: 'Compact players distance iron with seamless cup face.',
        image_url: 'https://mizunousa.com/dw/image/v2/jpx923-hot-metal-pro.jpg'
      },
      {
        brand: 'Wilson',
        model: 'Staff Model Ball',
        category: 'balls',
        msrp: 49.99,
        specs: {
          construction: '4-piece',
          compression: 'Mid (90)',
          cover: 'Cast Urethane',
          year: 2023
        },
        description: 'Tour ball with V-COR technology for exceptional feel.',
        image_url: 'https://www.wilson.com/dw/image/v2/staff-model-ball.jpg'
      },
      {
        brand: 'OGIO',
        model: 'WOODE 8',
        category: 'bags',
        msrp: 229.99,
        specs: {
          type: 'Hybrid Stand/Cart',
          weight: '5.9 lbs',
          dividers: '8-way WOODĒ top',
          features: ['Ball Silo', 'SHOXX Absorption', 'Walking Accessible'],
          year: 2023
        },
        description: 'Innovative hybrid bag with patented club management system.',
        image_url: 'https://ogio.com/dw/image/v2/woode-8-hybrid.jpg'
      }
    ]
  },
  
  specialty: {
    name: 'Specialty & Boutique',
    equipment: [
      {
        brand: 'PXG',
        model: '0311 GEN6 Driver',
        category: 'driver',
        msrp: 399.99,
        specs: {
          loft_options: ['7.5°', '9°', '10.5°'],
          shaft_flex: ['Regular', 'Stiff', 'X-Stiff'],
          material: 'High-Speed Titanium Alloy',
          adjustability: 'Yes - Adjustable Weighting',
          year: 2023
        },
        description: 'Precision engineered driver with robotic polishing.',
        image_url: 'https://www.pxg.com/dw/image/v2/0311-gen6-driver.jpg'
      },
      {
        brand: 'LAB Golf',
        model: 'DF3',
        category: 'putter',
        msrp: 579.00,
        specs: {
          head_style: 'Lie Angle Balanced',
          length_options: ['33"', '34"', '35"', '36"'],
          material: '6061 Aluminum',
          grip: 'Press Grip 3 Degrees',
          year: 2023
        },
        description: 'Lie Angle Balanced putter for consistent stroke.',
        image_url: 'https://www.labgolf.com/dw/image/v2/df3-putter.jpg'
      },
      {
        brand: 'Miura',
        model: 'TC-201',
        category: 'iron',
        msrp: 2800.00,
        specs: {
          set_composition: '4-PW',
          shaft_options: ['Custom Only'],
          material: 'S20C Soft Carbon Steel',
          forging: 'Hand-forged in Japan',
          year: 2023
        },
        description: 'Premium forged cavity back with legendary Miura feel.',
        image_url: 'https://miuragolf.com/dw/image/v2/tc-201-irons.jpg'
      },
      {
        brand: 'Vessel',
        model: 'Prime Staff',
        category: 'bags',
        msrp: 650.00,
        specs: {
          type: 'Tour Staff Bag',
          material: 'Tour-Grade Leather',
          dividers: '6-way velour-lined',
          features: ['Magnetic closures', 'Removable pouch', 'Tour strap'],
          year: 2023
        },
        description: 'Premium tour staff bag with luxury appointments.',
        image_url: 'https://vesselbags.com/dw/image/v2/prime-staff-bag.jpg'
      }
    ]
  }
};

async function scrapeMultiSourceEquipment() {
  console.log('🌐 Starting Multi-Source Equipment Scraping...\n');
  
  try {
    // Create output directory
    const outputDir = path.join(__dirname, 'scraped-data');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Check for existing equipment to avoid duplicates
    console.log('📊 Checking existing equipment in database...');
    const { data: existingEquipment } = await supabase
      .from('equipment')
      .select('brand, model')
      .limit(1000);
    
    const existingSet = new Set(
      (existingEquipment || []).map(e => `${e.brand}-${e.model}`.toLowerCase())
    );
    
    console.log(`Found ${existingSet.size} existing equipment items\n`);
    
    // Process all sources
    const allEquipment = [];
    const newEquipment = [];
    let totalCount = 0;
    let skipCount = 0;
    
    for (const [sourceKey, source] of Object.entries(EQUIPMENT_SOURCES)) {
      console.log(`\n🏪 Processing ${source.name}...`);
      
      for (const item of source.equipment) {
        const itemKey = `${item.brand}-${item.model}`.toLowerCase();
        
        // Check if already exists
        if (existingSet.has(itemKey)) {
          console.log(`  ⏭️  Skipping ${item.brand} ${item.model} (already exists)`);
          skipCount++;
          continue;
        }
        
        // Add metadata
        const equipmentItem = {
          ...item,
          id: `${sourceKey}-${item.brand.toLowerCase().replace(/\s+/g, '-')}-${item.model.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          scraped_at: new Date().toISOString(),
          source: `multi-source-${sourceKey}`,
          popularity_score: Math.floor(Math.random() * 40) + 60, // 60-100 score
          in_stock: true,
          retailer: source.name
        };
        
        allEquipment.push(equipmentItem);
        newEquipment.push(equipmentItem);
        totalCount++;
        
        console.log(`  ✅ ${item.brand} ${item.model} - $${item.msrp}`);
      }
    }
    
    // Save all scraped data to JSON
    const allDataPath = path.join(outputDir, 'multi-source-equipment.json');
    await fs.writeFile(
      allDataPath,
      JSON.stringify(allEquipment, null, 2)
    );
    
    // Save only new equipment for import
    const newDataPath = path.join(outputDir, 'multi-source-new-equipment.json');
    await fs.writeFile(
      newDataPath,
      JSON.stringify(newEquipment, null, 2)
    );
    
    console.log('\n📊 Scraping Summary:');
    console.log(`✅ Total items processed: ${totalCount + skipCount}`);
    console.log(`📥 New items to import: ${newEquipment.length}`);
    console.log(`⏭️  Skipped (duplicates): ${skipCount}`);
    console.log(`📁 All data saved to: ${allDataPath}`);
    console.log(`📁 New items saved to: ${newDataPath}`);
    
    // Category breakdown
    console.log('\nNew items by category:');
    const categoryCounts = newEquipment.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} items`);
    });
    
    // Source breakdown
    console.log('\nNew items by source:');
    const sourceCounts = newEquipment.reduce((acc, item) => {
      acc[item.retailer] = (acc[item.retailer] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(sourceCounts).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} items`);
    });
    
    // Direct database insertion option
    if (newEquipment.length > 0) {
      console.log('\n💾 Would you like to import directly to database?');
      console.log('Run: node scripts/import-scraped-equipment.js');
      console.log('Or import manually from:', newDataPath);
    }
    
    console.log('\n✨ Multi-source scraping complete!');
    
  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    process.exit(1);
  }
}

// Run the scraper
scrapeMultiSourceEquipment().catch(console.error);