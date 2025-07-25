import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Comprehensive shaft data organized by type and brand
const SHAFT_DATA = {
  driver: {
    'Fujikura': [
      {
        model: 'Ventus Blue',
        variants: [
          { flex: 'Regular', weight: 57, torque: 4.8, launch: 'Mid', spin: 'Low', msrp: 350 },
          { flex: 'Stiff', weight: 66, torque: 3.8, launch: 'Mid', spin: 'Low', msrp: 350 },
          { flex: 'X-Stiff', weight: 76, torque: 3.2, launch: 'Mid', spin: 'Low', msrp: 350 }
        ]
      },
      {
        model: 'Ventus Black',
        variants: [
          { flex: 'Stiff', weight: 65, torque: 3.1, launch: 'Low', spin: 'Low', msrp: 350 },
          { flex: 'X-Stiff', weight: 75, torque: 2.8, launch: 'Low', spin: 'Low', msrp: 350 },
          { flex: 'TX', weight: 85, torque: 2.5, launch: 'Low', spin: 'Low', msrp: 350 }
        ]
      },
      {
        model: 'Ventus Red',
        variants: [
          { flex: 'Senior', weight: 46, torque: 5.8, launch: 'High', spin: 'Mid', msrp: 350 },
          { flex: 'Regular', weight: 56, torque: 4.9, launch: 'High', spin: 'Mid', msrp: 350 },
          { flex: 'Stiff', weight: 66, torque: 4.0, launch: 'High', spin: 'Mid', msrp: 350 }
        ]
      },
      {
        model: 'Speeder NX',
        variants: [
          { flex: 'Regular', weight: 55, torque: 4.6, launch: 'Mid', spin: 'Mid', msrp: 200 },
          { flex: 'Stiff', weight: 65, torque: 3.6, launch: 'Mid', spin: 'Mid', msrp: 200 }
        ]
      }
    ],
    
    'Graphite Design': [
      {
        model: 'Tour AD DI',
        variants: [
          { flex: 'Regular', weight: 56, torque: 4.6, launch: 'Low-Mid', spin: 'Low', msrp: 400 },
          { flex: 'Stiff', weight: 65, torque: 3.4, launch: 'Low-Mid', spin: 'Low', msrp: 400 },
          { flex: 'X-Stiff', weight: 75, torque: 3.1, launch: 'Low-Mid', spin: 'Low', msrp: 400 }
        ]
      },
      {
        model: 'Tour AD IZ',
        variants: [
          { flex: 'Regular', weight: 55, torque: 4.7, launch: 'Mid', spin: 'Mid', msrp: 400 },
          { flex: 'Stiff', weight: 65, torque: 3.2, launch: 'Mid', spin: 'Mid', msrp: 400 },
          { flex: 'X-Stiff', weight: 75, torque: 2.9, launch: 'Mid', spin: 'Mid', msrp: 400 }
        ]
      },
      {
        model: 'Tour AD VF',
        variants: [
          { flex: 'Regular', weight: 54, torque: 4.4, launch: 'Mid-High', spin: 'Low-Mid', msrp: 400 },
          { flex: 'Stiff', weight: 64, torque: 3.3, launch: 'Mid-High', spin: 'Low-Mid', msrp: 400 }
        ]
      }
    ],
    
    'Mitsubishi': [
      {
        model: 'Tensei AV Blue',
        variants: [
          { flex: 'Regular', weight: 55, torque: 4.5, launch: 'Mid', spin: 'Low-Mid', msrp: 250 },
          { flex: 'Stiff', weight: 65, torque: 3.5, launch: 'Mid', spin: 'Low-Mid', msrp: 250 },
          { flex: 'X-Stiff', weight: 75, torque: 3.0, launch: 'Mid', spin: 'Low-Mid', msrp: 250 }
        ]
      },
      {
        model: 'Tensei 1K Black',
        variants: [
          { flex: 'Stiff', weight: 65, torque: 3.2, launch: 'Low', spin: 'Low', msrp: 350 },
          { flex: 'X-Stiff', weight: 75, torque: 2.9, launch: 'Low', spin: 'Low', msrp: 350 }
        ]
      },
      {
        model: 'Diamana D+',
        variants: [
          { flex: 'Regular', weight: 52, torque: 5.4, launch: 'Mid', spin: 'Mid', msrp: 300 },
          { flex: 'Stiff', weight: 62, torque: 3.9, launch: 'Mid', spin: 'Mid', msrp: 300 },
          { flex: 'X-Stiff', weight: 72, torque: 3.4, launch: 'Mid', spin: 'Mid', msrp: 300 }
        ]
      }
    ],
    
    'Project X': [
      {
        model: 'HZRDUS Smoke Blue RDX',
        variants: [
          { flex: 'Regular', weight: 55, torque: 4.6, launch: 'Low-Mid', spin: 'Low', msrp: 325 },
          { flex: 'Stiff', weight: 60, torque: 3.8, launch: 'Low-Mid', spin: 'Low', msrp: 325 },
          { flex: 'X-Stiff', weight: 70, torque: 3.4, launch: 'Low-Mid', spin: 'Low', msrp: 325 }
        ]
      },
      {
        model: 'HZRDUS Black',
        variants: [
          { flex: 'Stiff', weight: 62, torque: 3.2, launch: 'Low', spin: 'Low', msrp: 275 },
          { flex: 'X-Stiff', weight: 72, torque: 2.8, launch: 'Low', spin: 'Low', msrp: 275 }
        ]
      },
      {
        model: 'Cypher',
        variants: [
          { flex: 'Regular', weight: 50, torque: 5.5, launch: 'High', spin: 'Mid', msrp: 100 },
          { flex: 'Stiff', weight: 60, torque: 4.5, launch: 'High', spin: 'Mid', msrp: 100 }
        ]
      }
    ],
    
    'UST Mamiya': [
      {
        model: 'Helium Nanocore',
        variants: [
          { flex: 'Senior', weight: 45, torque: 5.9, launch: 'High', spin: 'High', msrp: 150 },
          { flex: 'Regular', weight: 54, torque: 4.8, launch: 'High', spin: 'Mid-High', msrp: 150 },
          { flex: 'Stiff', weight: 57, torque: 4.2, launch: 'High', spin: 'Mid-High', msrp: 150 }
        ]
      },
      {
        model: 'LIN-Q',
        variants: [
          { flex: 'Regular', weight: 55, torque: 4.5, launch: 'Mid', spin: 'Mid', msrp: 199 },
          { flex: 'Stiff', weight: 65, torque: 3.5, launch: 'Mid', spin: 'Mid', msrp: 199 },
          { flex: 'X-Stiff', weight: 75, torque: 3.0, launch: 'Mid', spin: 'Mid', msrp: 199 }
        ]
      }
    ]
  },
  
  iron: {
    'True Temper': [
      {
        model: 'Dynamic Gold',
        variants: [
          { flex: 'Regular (R300)', weight: 127, launch: 'Low', spin: 'Low', msrp: 35 },
          { flex: 'Stiff (S300)', weight: 130, launch: 'Low', spin: 'Low', msrp: 35 },
          { flex: 'X-Stiff (X100)', weight: 130, launch: 'Low', spin: 'Low', msrp: 35 }
        ]
      },
      {
        model: 'Dynamic Gold 105',
        variants: [
          { flex: 'Regular', weight: 103, launch: 'Mid', spin: 'Mid', msrp: 35 },
          { flex: 'Stiff', weight: 106, launch: 'Mid', spin: 'Mid', msrp: 35 }
        ]
      },
      {
        model: 'Dynamic Gold 120',
        variants: [
          { flex: 'Regular', weight: 118, launch: 'Mid-Low', spin: 'Low', msrp: 35 },
          { flex: 'Stiff', weight: 120, launch: 'Mid-Low', spin: 'Low', msrp: 35 },
          { flex: 'X-Stiff', weight: 122, launch: 'Mid-Low', spin: 'Low', msrp: 35 }
        ]
      },
      {
        model: 'Elevate 95',
        variants: [
          { flex: 'Regular', weight: 95, launch: 'High', spin: 'Mid', msrp: 30 },
          { flex: 'Stiff', weight: 95, launch: 'High', spin: 'Mid', msrp: 30 }
        ]
      }
    ],
    
    'KBS': [
      {
        model: 'Tour',
        variants: [
          { flex: 'Regular', weight: 110, launch: 'Mid', spin: 'Mid', msrp: 35 },
          { flex: 'Stiff', weight: 120, launch: 'Mid', spin: 'Mid', msrp: 35 },
          { flex: 'X-Stiff', weight: 130, launch: 'Mid', spin: 'Mid', msrp: 35 }
        ]
      },
      {
        model: 'Tour 90',
        variants: [
          { flex: 'Regular', weight: 95, launch: 'Mid-High', spin: 'Mid', msrp: 35 },
          { flex: 'Stiff', weight: 102, launch: 'Mid-High', spin: 'Mid', msrp: 35 }
        ]
      },
      {
        model: 'C-Taper',
        variants: [
          { flex: 'Regular', weight: 115, launch: 'Low', spin: 'Low', msrp: 35 },
          { flex: 'Stiff', weight: 120, launch: 'Low', spin: 'Low', msrp: 35 },
          { flex: 'X-Stiff', weight: 125, launch: 'Low', spin: 'Low', msrp: 35 }
        ]
      },
      {
        model: 'Max',
        variants: [
          { flex: 'Regular', weight: 85, launch: 'High', spin: 'High', msrp: 30 },
          { flex: 'Stiff', weight: 90, launch: 'High', spin: 'High', msrp: 30 }
        ]
      }
    ],
    
    'Project X': [
      {
        model: 'Project X',
        variants: [
          { flex: '5.0', weight: 115, launch: 'Low', spin: 'Low', msrp: 40 },
          { flex: '5.5', weight: 120, launch: 'Low', spin: 'Low', msrp: 40 },
          { flex: '6.0', weight: 120, launch: 'Low', spin: 'Low', msrp: 40 },
          { flex: '6.5', weight: 125, launch: 'Low', spin: 'Low', msrp: 40 }
        ]
      },
      {
        model: 'LZ',
        variants: [
          { flex: '5.0', weight: 110, launch: 'Mid', spin: 'Mid', msrp: 40 },
          { flex: '5.5', weight: 115, launch: 'Mid', spin: 'Mid', msrp: 40 },
          { flex: '6.0', weight: 120, launch: 'Mid', spin: 'Mid', msrp: 40 }
        ]
      },
      {
        model: 'Catalyst',
        variants: [
          { flex: 'Regular', weight: 80, launch: 'High', spin: 'High', msrp: 25 },
          { flex: 'Stiff', weight: 90, launch: 'High', spin: 'High', msrp: 25 }
        ]
      }
    ],
    
    'Nippon': [
      {
        model: 'Modus 105',
        variants: [
          { flex: 'Regular', weight: 103, launch: 'Mid', spin: 'Mid', msrp: 40 },
          { flex: 'Stiff', weight: 106, launch: 'Mid', spin: 'Mid', msrp: 40 },
          { flex: 'X-Stiff', weight: 112, launch: 'Mid', spin: 'Mid', msrp: 40 }
        ]
      },
      {
        model: 'Modus 120',
        variants: [
          { flex: 'Regular', weight: 111, launch: 'Mid-Low', spin: 'Low', msrp: 40 },
          { flex: 'Stiff', weight: 114, launch: 'Mid-Low', spin: 'Low', msrp: 40 },
          { flex: 'X-Stiff', weight: 120, launch: 'Mid-Low', spin: 'Low', msrp: 40 }
        ]
      },
      {
        model: 'Zelos 7',
        variants: [
          { flex: 'Regular', weight: 77.5, launch: 'High', spin: 'Mid', msrp: 35 },
          { flex: 'Stiff', weight: 77.5, launch: 'High', spin: 'Mid', msrp: 35 }
        ]
      }
    ],
    
    'UST Mamiya': [
      {
        model: 'Recoil Dart',
        variants: [
          { flex: 'Regular (65)', weight: 66, launch: 'Mid', spin: 'Mid', msrp: 60 },
          { flex: 'Stiff (75)', weight: 76, launch: 'Mid', spin: 'Mid', msrp: 60 },
          { flex: 'X-Stiff (95)', weight: 96, launch: 'Mid', spin: 'Mid', msrp: 60 }
        ]
      },
      {
        model: 'Recoil',
        variants: [
          { flex: 'Regular (460)', weight: 59, launch: 'Mid-High', spin: 'Mid', msrp: 50 },
          { flex: 'Stiff (760)', weight: 73, launch: 'Mid-High', spin: 'Mid', msrp: 50 },
          { flex: 'Stiff (780)', weight: 78, launch: 'Mid', spin: 'Mid', msrp: 50 }
        ]
      }
    ]
  },
  
  wedge: {
    'True Temper': [
      {
        model: 'Dynamic Gold Wedge',
        variants: [
          { flex: 'Wedge', weight: 128, launch: 'Low', spin: 'High', msrp: 35 },
          { flex: 'S200', weight: 127, launch: 'Low', spin: 'High', msrp: 35 },
          { flex: 'S400', weight: 132, launch: 'Low', spin: 'High', msrp: 35 }
        ]
      },
      {
        model: 'Dynamic Gold Spinner',
        variants: [
          { flex: 'Wedge', weight: 121, launch: 'Mid', spin: 'High', msrp: 40 }
        ]
      }
    ],
    
    'KBS': [
      {
        model: 'Hi-Rev 2.0',
        variants: [
          { flex: 'Wedge', weight: 115, launch: 'Mid', spin: 'High', msrp: 35 },
          { flex: 'Stiff', weight: 125, launch: 'Mid', spin: 'High', msrp: 35 }
        ]
      }
    ],
    
    'Project X': [
      {
        model: 'Wedge',
        variants: [
          { flex: '6.0', weight: 125, launch: 'Low', spin: 'High', msrp: 40 },
          { flex: '6.5', weight: 130, launch: 'Low', spin: 'High', msrp: 40 }
        ]
      }
    ]
  },
  
  putter: {
    'KBS': [
      {
        model: 'CT Tour',
        variants: [
          { flex: 'Putter', weight: 120, launch: 'N/A', spin: 'N/A', msrp: 40 }
        ]
      }
    ],
    
    'True Temper': [
      {
        model: 'Putter Steel',
        variants: [
          { flex: 'Standard', weight: 115, launch: 'N/A', spin: 'N/A', msrp: 25 }
        ]
      }
    ],
    
    'LA Golf': [
      {
        model: 'P-Series',
        variants: [
          { flex: '135g', weight: 135, launch: 'N/A', spin: 'N/A', msrp: 199 },
          { flex: '155g', weight: 155, launch: 'N/A', spin: 'N/A', msrp: 199 }
        ]
      }
    ]
  }
};

async function addComprehensiveShafts() {
  console.log('🏌️ Adding Comprehensive Shaft Catalog\n');
  
  try {
    let totalAdded = 0;
    let totalSkipped = 0;
    
    // Process each club type
    for (const [clubType, brands] of Object.entries(SHAFT_DATA)) {
      console.log(`\n📦 Processing ${clubType} shafts...`);
      
      for (const [brand, models] of Object.entries(brands)) {
        console.log(`  Brand: ${brand}`);
        
        for (const modelData of models) {
          for (const variant of modelData.variants) {
            const shaftName = `${modelData.model} ${variant.flex}`;
            
            // Check if exists
            const { data: existing } = await supabase
              .from('equipment')
              .select('id')
              .eq('brand', brand)
              .eq('model', shaftName)
              .eq('category', 'shaft')
              .single();
            
            if (existing) {
              totalSkipped++;
              continue;
            }
            
            // Create shaft entry
            const shaftData = {
              brand: brand,
              model: shaftName,
              category: 'shaft',
              msrp: variant.msrp || 0,
              specs: {
                club_type: clubType,
                flex: variant.flex,
                weight_grams: variant.weight || null,
                torque: variant.torque || null,
                launch_profile: variant.launch || null,
                spin_profile: variant.spin || null,
                material: getShaftMaterial(brand, clubType),
                length_inches: getDefaultLength(clubType),
                tip_diameter: getTipDiameter(clubType),
                year: 2023
              },
              description: `Premium ${clubType} shaft with ${variant.launch || 'optimal'} launch and ${variant.spin || 'optimal'} spin characteristics.`,
              popularity_score: getPopularityScore(brand, modelData.model),
              image_url: `https://placehold.co/400x400/1a1a1a/white?text=${encodeURIComponent(brand + ' ' + modelData.model)}`
            };
            
            const { error } = await supabase
              .from('equipment')
              .insert(shaftData);
            
            if (error) {
              console.error(`    ❌ Error adding ${shaftName}:`, error.message);
            } else {
              console.log(`    ✅ Added: ${shaftName}`);
              totalAdded++;
            }
          }
        }
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Added: ${totalAdded} shafts`);
    console.log(`⏭️  Skipped: ${totalSkipped} (already exist)`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Helper functions
function getShaftMaterial(brand, clubType) {
  if (clubType === 'iron' || clubType === 'wedge') {
    return 'Steel';
  }
  if (brand === 'True Temper' || brand === 'KBS' || brand === 'Project X' || brand === 'Nippon') {
    return 'Steel';
  }
  return 'Graphite';
}

function getDefaultLength(clubType) {
  const lengths = {
    driver: 45.5,
    fairway: 43,
    hybrid: 40.5,
    iron: 38.5,
    wedge: 35.5,
    putter: 34
  };
  return lengths[clubType] || 40;
}

function getTipDiameter(clubType) {
  if (clubType === 'driver' || clubType === 'fairway') return 0.335;
  if (clubType === 'iron' || clubType === 'wedge') return 0.355;
  if (clubType === 'putter') return 0.370;
  return 0.370;
}

function getPopularityScore(brand, model) {
  // Premium brands get higher scores
  const premiumBrands = ['Graphite Design', 'Fujikura', 'Mitsubishi', 'Project X'];
  const popularModels = ['Ventus', 'Tour AD', 'Tensei', 'Dynamic Gold', 'KBS Tour'];
  
  let score = 70;
  if (premiumBrands.includes(brand)) score += 10;
  if (popularModels.some(pm => model.includes(pm))) score += 10;
  
  return Math.min(score + Math.floor(Math.random() * 10), 95);
}

// Run the script
addComprehensiveShafts().catch(console.error);