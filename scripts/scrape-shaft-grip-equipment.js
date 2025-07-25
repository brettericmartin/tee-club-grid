import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simulated scraping data for shaft and grip retailers
const SHAFT_GRIP_RETAILERS = {
  golfGalaxy: {
    shafts: [
      {
        brand: 'Aldila',
        model: 'Rogue Black 130 MSI',
        category: 'shaft',
        msrp: 299.99,
        retailer: 'Golf Galaxy',
        specs: {
          club_type: 'driver',
          flex: 'Stiff',
          weight_grams: 64,
          torque: 3.4,
          launch_profile: 'Low-Mid',
          spin_profile: 'Low',
          material: 'Graphite',
          butt_diameter: 0.600,
          tip_diameter: 0.335,
          length_inches: 46
        },
        description: 'Tour-proven low spin shaft with MSI technology for stability.',
        image_url: 'https://www.golfgalaxy.com/aldila-rogue-black-130-msi.jpg'
      },
      {
        brand: 'Accra',
        model: 'TZ6',
        category: 'shaft',
        msrp: 450.00,
        retailer: 'Golf Galaxy',
        specs: {
          club_type: 'driver',
          flex: 'Stiff',
          weight_grams: 65,
          torque: 3.2,
          launch_profile: 'Mid',
          spin_profile: 'Mid',
          material: 'Graphite',
          constant_taper: true
        },
        description: 'Premium constant taper design for consistent feel.',
        image_url: 'https://www.golfgalaxy.com/accra-tz6.jpg'
      },
      {
        brand: 'OBAN',
        model: 'Kiyoshi White',
        category: 'shaft',
        msrp: 400.00,
        retailer: 'Golf Galaxy',
        specs: {
          club_type: 'driver',
          flex: 'Stiff',
          weight_grams: 58,
          torque: 4.3,
          launch_profile: 'High',
          spin_profile: 'Mid',
          material: 'Graphite'
        },
        description: 'High launch shaft with smooth feel and stability.',
        image_url: 'https://www.golfgalaxy.com/oban-kiyoshi-white.jpg'
      },
      {
        brand: 'Aerotech',
        model: 'SteelFiber i95',
        category: 'shaft',
        msrp: 45.00,
        retailer: 'Golf Galaxy',
        specs: {
          club_type: 'iron',
          flex: 'Regular',
          weight_grams: 95,
          launch_profile: 'Mid-High',
          spin_profile: 'Mid',
          material: 'Graphite/Steel Composite'
        },
        description: 'Composite iron shaft combining steel stability with graphite feel.',
        image_url: 'https://www.golfgalaxy.com/aerotech-steelfiber-i95.jpg'
      }
    ],
    
    grips: [
      {
        brand: 'JumboMax',
        model: 'UltraLite Medium',
        category: 'grip',
        msrp: 12.99,
        retailer: 'Golf Galaxy',
        specs: {
          size: 'Jumbo',
          weight_grams: 52,
          diameter: 'Jumbo',
          color: 'Black/Green',
          material: 'Rubber',
          texture: 'Moderate',
          shock_absorption: 'High'
        },
        description: 'Oversized grip that promotes lighter grip pressure.',
        image_url: 'https://www.golfgalaxy.com/jumbomax-ultralite.jpg'
      },
      {
        brand: 'Avon',
        model: 'Chamois II',
        category: 'grip',
        msrp: 6.99,
        retailer: 'Golf Galaxy',
        specs: {
          size: 'Standard',
          weight_grams: 52,
          diameter: 'Standard',
          color: 'Black',
          material: 'Rubber',
          texture: 'Soft'
        },
        description: 'Classic soft feel grip with excellent traction.',
        image_url: 'https://www.golfgalaxy.com/avon-chamois.jpg'
      },
      {
        brand: 'Pure Grips',
        model: 'DTX',
        category: 'grip',
        msrp: 7.99,
        retailer: 'Golf Galaxy',
        specs: {
          size: 'Standard',
          weight_grams: 48,
          diameter: 'Standard',
          color: 'Black',
          material: 'Rubber',
          tapeless_installation: true
        },
        description: 'Innovative tapeless grip installation system.',
        image_url: 'https://www.golfgalaxy.com/pure-grips-dtx.jpg'
      }
    ]
  },
  
  tgw: {
    shafts: [
      {
        brand: 'VA Composites',
        model: 'Drago',
        category: 'shaft',
        msrp: 385.00,
        retailer: 'TGW',
        specs: {
          club_type: 'driver',
          flex: 'Stiff',
          weight_grams: 65,
          torque: 3.5,
          launch_profile: 'Mid',
          spin_profile: 'Low',
          material: 'Premium Graphite'
        },
        description: 'Tour-caliber shaft with explosive energy transfer.',
        image_url: 'https://www.tgw.com/va-composites-drago.jpg'
      },
      {
        brand: 'TPT Golf',
        model: 'Low Kick',
        category: 'shaft',
        msrp: 550.00,
        retailer: 'TGW',
        specs: {
          club_type: 'driver',
          flex: 'Stiff',
          weight_grams: 60,
          torque: 3.0,
          launch_profile: 'Low',
          spin_profile: 'Low',
          material: 'Thin Ply Technology'
        },
        description: 'Revolutionary thin ply carbon technology.',
        image_url: 'https://www.tgw.com/tpt-low-kick.jpg'
      },
      {
        brand: 'Matrix',
        model: 'OZIK HD6',
        category: 'shaft',
        msrp: 250.00,
        retailer: 'TGW',
        specs: {
          club_type: 'driver',
          flex: 'X-Stiff',
          weight_grams: 63,
          torque: 3.1,
          launch_profile: 'Low',
          spin_profile: 'Low',
          material: 'HD Graphite'
        },
        description: 'High density graphite for penetrating ball flight.',
        image_url: 'https://www.tgw.com/matrix-ozik-hd6.jpg'
      },
      {
        brand: 'Paderson',
        model: 'Kinetixx TS-I',
        category: 'shaft',
        msrp: 375.00,
        retailer: 'TGW',
        specs: {
          club_type: 'iron',
          flex: 'Stiff',
          weight_grams: 105,
          launch_profile: 'Mid',
          spin_profile: 'Mid',
          material: 'Graphite'
        },
        description: 'Tour-inspired iron shaft with consistent performance.',
        image_url: 'https://www.tgw.com/paderson-kinetixx.jpg'
      }
    ],
    
    grips: [
      {
        brand: 'Boccieri Golf',
        model: 'Secret Grip',
        category: 'grip',
        msrp: 29.99,
        retailer: 'TGW',
        specs: {
          size: 'Standard',
          weight_grams: 92,
          diameter: 'Standard',
          color: 'Black',
          material: 'Rubber',
          counter_balanced: true
        },
        description: 'Counter-balanced grip with 50g internal weight.',
        image_url: 'https://www.tgw.com/boccieri-secret-grip.jpg'
      },
      {
        brand: 'NO1 Grip',
        model: '50 Series',
        category: 'grip',
        msrp: 12.99,
        retailer: 'TGW',
        specs: {
          size: 'Standard',
          weight_grams: 50,
          diameter: 'Standard',
          color: 'Black/Orange',
          material: 'Synthetic',
          moisture_wicking: true
        },
        description: 'Moisture-wicking technology for all conditions.',
        image_url: 'https://www.tgw.com/no1-grip-50.jpg'
      },
      {
        brand: 'Tacki-Mac',
        model: 'Command X',
        category: 'grip',
        msrp: 8.99,
        retailer: 'TGW',
        specs: {
          size: 'Standard',
          weight_grams: 55,
          diameter: 'Standard',
          color: 'Black',
          material: 'Polyurethane',
          texture: 'X-Pattern'
        },
        description: 'Unique X-pattern for enhanced grip and control.',
        image_url: 'https://www.tgw.com/tacki-mac-command-x.jpg'
      }
    ]
  },
  
  '2ndSwing': {
    shafts: [
      {
        brand: 'Graphite Design',
        model: 'Tour AD BB',
        category: 'shaft',
        msrp: 350.00,
        condition: 'Used - Very Good',
        retailer: '2nd Swing Golf',
        specs: {
          club_type: 'driver',
          flex: 'Stiff',
          weight_grams: 65,
          torque: 3.2,
          launch_profile: 'Low',
          spin_profile: 'Low',
          material: 'Premium Graphite',
          original_price: 475.00
        },
        description: 'Tour AD Blue Board - low launch, low spin performer.',
        image_url: 'https://www.2ndswing.com/graphite-design-tour-ad-bb.jpg'
      },
      {
        brand: 'Fujikura',
        model: 'Atmos Blue Tour Spec',
        category: 'shaft',
        msrp: 199.99,
        condition: 'Used - Good',
        retailer: '2nd Swing Golf',
        specs: {
          club_type: 'driver',
          flex: 'Stiff',
          weight_grams: 68,
          torque: 3.6,
          launch_profile: 'Mid',
          spin_profile: 'Mid',
          material: 'Graphite',
          original_price: 300.00
        },
        description: 'Tour Spec version with tighter tolerances.',
        image_url: 'https://www.2ndswing.com/fujikura-atmos-blue-ts.jpg'
      },
      {
        brand: 'True Temper',
        model: 'AMT Tour White',
        category: 'shaft',
        msrp: 25.00,
        condition: 'Used - Excellent',
        retailer: '2nd Swing Golf',
        specs: {
          club_type: 'iron',
          flex: 'S300',
          weight_grams: 'Ascending',
          launch_profile: 'Mid',
          spin_profile: 'Mid',
          material: 'Steel',
          original_price: 40.00
        },
        description: 'Ascending Mass Technology for consistent feel.',
        image_url: 'https://www.2ndswing.com/true-temper-amt-tour-white.jpg'
      }
    ],
    
    grips: [
      {
        brand: 'Golf Pride',
        model: 'New Decade MultiCompound',
        category: 'grip',
        msrp: 7.99,
        condition: 'Used - Like New',
        retailer: '2nd Swing Golf',
        specs: {
          size: 'Standard',
          weight_grams: 50,
          diameter: 'Standard',
          color: 'Black/Red',
          material: 'Rubber/Cord',
          original_price: 11.99
        },
        description: 'Previous generation MCC with proven performance.',
        image_url: 'https://www.2ndswing.com/golf-pride-new-decade.jpg'
      },
      {
        brand: 'Lamkin',
        model: 'REL 3GEN',
        category: 'grip',
        msrp: 4.99,
        condition: 'Used - Good',
        retailer: '2nd Swing Golf',
        specs: {
          size: 'Standard',
          weight_grams: 46,
          diameter: 'Standard',
          color: 'Black',
          material: '3GEN Material',
          original_price: 8.99
        },
        description: 'ACE 3GEN material for consistent feel.',
        image_url: 'https://www.2ndswing.com/lamkin-rel-3gen.jpg'
      }
    ]
  }
};

async function scrapeShaftGripEquipment() {
  console.log('🏌️ Starting Shaft & Grip Equipment Scraping...\n');
  
  try {
    // Create output directory
    const outputDir = path.join(__dirname, 'scraped-data');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Process all retailers
    const allEquipment = [];
    let totalCount = 0;
    
    for (const [retailerKey, retailerData] of Object.entries(SHAFT_GRIP_RETAILERS)) {
      console.log(`\n🏪 Processing ${retailerKey}...`);
      
      // Process shafts
      if (retailerData.shafts) {
        console.log(`  📦 Shafts (${retailerData.shafts.length} items)...`);
        retailerData.shafts.forEach(item => {
          const equipmentItem = {
            ...item,
            id: `${retailerKey}-${item.brand.toLowerCase().replace(/\s+/g, '-')}-${item.model.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            scraped_at: new Date().toISOString(),
            source: 'shaft-grip-scraper',
            popularity_score: Math.floor(Math.random() * 20) + 70
          };
          
          allEquipment.push(equipmentItem);
          totalCount++;
          console.log(`    ✓ ${item.brand} ${item.model} - $${item.msrp}`);
        });
      }
      
      // Process grips
      if (retailerData.grips) {
        console.log(`  📦 Grips (${retailerData.grips.length} items)...`);
        retailerData.grips.forEach(item => {
          const equipmentItem = {
            ...item,
            id: `${retailerKey}-${item.brand.toLowerCase().replace(/\s+/g, '-')}-${item.model.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            scraped_at: new Date().toISOString(),
            source: 'shaft-grip-scraper',
            popularity_score: Math.floor(Math.random() * 20) + 65
          };
          
          allEquipment.push(equipmentItem);
          totalCount++;
          console.log(`    ✓ ${item.brand} ${item.model} - $${item.msrp}`);
        });
      }
    }
    
    // Save to JSON file
    const outputPath = path.join(outputDir, 'shaft-grip-equipment.json');
    await fs.writeFile(
      outputPath,
      JSON.stringify(allEquipment, null, 2)
    );
    
    console.log('\n📊 Scraping Summary:');
    console.log(`✅ Total items scraped: ${totalCount}`);
    console.log(`📁 Data saved to: ${outputPath}`);
    
    // Category breakdown
    const shaftCount = allEquipment.filter(item => item.category === 'shaft').length;
    const gripCount = allEquipment.filter(item => item.category === 'grip').length;
    
    console.log('\nCategory breakdown:');
    console.log(`  Shafts: ${shaftCount} items`);
    console.log(`  Grips: ${gripCount} items`);
    
    // Brand breakdown
    const brandCounts = allEquipment.reduce((acc, item) => {
      acc[item.brand] = (acc[item.brand] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nBrand breakdown:');
    Object.entries(brandCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([brand, count]) => {
        console.log(`  ${brand}: ${count} items`);
      });
    
    console.log('\n✨ Shaft & grip equipment scraping complete!');
    console.log('Next step: Run "npm run scrape:import" to import data to database');
    
  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    process.exit(1);
  }
}

// Run the scraper
scrapeShaftGripEquipment().catch(console.error);