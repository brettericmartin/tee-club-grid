import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Comprehensive grip data organized by brand
const GRIP_DATA = {
  'Golf Pride': [
    {
      model: 'MCC Plus4',
      variants: [
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Grey/Black', msrp: 12.99 },
        { size: 'Midsize', weight: 65, diameter: 'Midsize', color: 'Grey/Black', msrp: 12.99 },
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Blue/Black', msrp: 12.99 },
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Red/Black', msrp: 12.99 }
      ],
      features: ['Hybrid Technology', 'Plus4 Lower Hand', 'All-Weather Performance']
    },
    {
      model: 'MCC',
      variants: [
        { size: 'Standard', weight: 47, diameter: 'Standard', color: 'Black/Grey', msrp: 11.99 },
        { size: 'Midsize', weight: 60, diameter: 'Midsize', color: 'Black/Grey', msrp: 11.99 },
        { size: 'Standard', weight: 47, diameter: 'Standard', color: 'Black/Blue', msrp: 11.99 },
        { size: 'Standard', weight: 47, diameter: 'Standard', color: 'Black/Red', msrp: 11.99 }
      ],
      features: ['Hybrid Technology', 'Brushed Cotton Cord', 'Rubber Lower Hand']
    },
    {
      model: 'Tour Velvet',
      variants: [
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Black', msrp: 7.99 },
        { size: 'Midsize', weight: 63, diameter: 'Midsize', color: 'Black', msrp: 7.99 },
        { size: 'Jumbo', weight: 90, diameter: 'Jumbo', color: 'Black', msrp: 8.99 },
        { size: 'Undersize', weight: 42, diameter: 'Undersize', color: 'Black', msrp: 7.99 }
      ],
      features: ['Classic Feel', 'Moderate Surface Texture', 'Proven Performance']
    },
    {
      model: 'Tour Velvet Plus4',
      variants: [
        { size: 'Standard', weight: 52, diameter: 'Standard Plus4', color: 'Black', msrp: 8.99 },
        { size: 'Midsize', weight: 66, diameter: 'Midsize Plus4', color: 'Black', msrp: 8.99 }
      ],
      features: ['Plus4 Technology', 'Reduced Taper', 'Light Tension Grip']
    },
    {
      model: 'CP2 Pro',
      variants: [
        { size: 'Standard', weight: 67, diameter: 'Standard', color: 'Black/Blue', msrp: 10.99 },
        { size: 'Midsize', weight: 84, diameter: 'Midsize', color: 'Black/Blue', msrp: 10.99 },
        { size: 'Jumbo', weight: 104, diameter: 'Jumbo', color: 'Black/Blue', msrp: 11.99 }
      ],
      features: ['Softest Performance Grip', 'Reduced Vibration', 'Control Core Technology']
    },
    {
      model: 'Z-Grip',
      variants: [
        { size: 'Standard', weight: 48, diameter: 'Standard', color: 'Black', msrp: 5.99 },
        { size: 'Midsize', weight: 60, diameter: 'Midsize', color: 'Black', msrp: 5.99 }
      ],
      features: ['All-Weather', 'Deep Texture Pattern', 'Value Option']
    },
    {
      model: 'Tour Velvet Align',
      variants: [
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Black/Red', msrp: 11.99 },
        { size: 'Midsize', weight: 63, diameter: 'Midsize', color: 'Black/Red', msrp: 11.99 }
      ],
      features: ['ALIGN Technology', 'Consistent Hand Placement', 'Raised Ridge']
    }
  ],
  
  'Lamkin': [
    {
      model: 'Crossline',
      variants: [
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Black', msrp: 5.99 },
        { size: 'Midsize', weight: 60, diameter: 'Midsize', color: 'Black', msrp: 5.99 },
        { size: 'Jumbo', weight: 85, diameter: 'Jumbo', color: 'Black', msrp: 6.99 },
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Blue', msrp: 5.99 }
      ],
      features: ['Distinctive Pattern', 'Natural Rubber', 'Tour Proven']
    },
    {
      model: 'UTx',
      variants: [
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Black/Grey', msrp: 9.99 },
        { size: 'Midsize', weight: 62, diameter: 'Midsize', color: 'Black/Grey', msrp: 9.99 },
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Blue/Grey', msrp: 9.99 }
      ],
      features: ['Tri-Layer Technology', 'Cord Upper', 'Tacky Lower']
    },
    {
      model: 'Sonar',
      variants: [
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Black/Blue', msrp: 10.99 },
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Black/Red', msrp: 10.99 },
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Black/Grey', msrp: 10.99 }
      ],
      features: ['Micro-Texture', 'Genesis Material', 'Tacky Feel']
    },
    {
      model: 'ST Hybrid',
      variants: [
        { size: 'Standard', weight: 53, diameter: 'Standard', color: 'Black/Grey', msrp: 12.99 },
        { size: 'Midsize', weight: 65, diameter: 'Midsize', color: 'Black/Grey', msrp: 12.99 }
      ],
      features: ['Hybrid Construction', 'Calibrate Technology', 'Consistent Feel']
    },
    {
      model: 'Comfort Plus',
      variants: [
        { size: 'Standard', weight: 58, diameter: 'Standard', color: 'Black', msrp: 7.99 },
        { size: 'Midsize', weight: 70, diameter: 'Midsize', color: 'Black', msrp: 7.99 }
      ],
      features: ['Softer Feel', 'Reduced Vibration', 'Comfort Layer']
    }
  ],
  
  'SuperStroke': [
    {
      model: 'S-Tech',
      variants: [
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Black', msrp: 8.99 },
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Grey', msrp: 8.99 },
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Red/White', msrp: 8.99 }
      ],
      features: ['Soft Rubber', 'Cross-Traction', 'No Taper Technology']
    },
    {
      model: 'Traxion Tour',
      variants: [
        { size: 'Standard', weight: 55, diameter: 'Standard', color: 'White/Black', msrp: 24.99 },
        { size: 'Standard', weight: 55, diameter: 'Standard', color: 'Grey/Black', msrp: 24.99 }
      ],
      features: ['Traxion Control', 'Tackymax Rubber', 'Tour Feedback']
    },
    {
      model: 'Traxion Pistol GT 1.0',
      variants: [
        { size: 'Putter', weight: 83, diameter: 'Putter', color: 'Black/Red', msrp: 29.99 },
        { size: 'Putter', weight: 83, diameter: 'Putter', color: 'Black/Blue', msrp: 29.99 },
        { size: 'Putter', weight: 83, diameter: 'Putter', color: 'Black/Grey', msrp: 29.99 }
      ],
      features: ['Putter Grip', 'No Taper', 'Enhanced Spyne Technology']
    },
    {
      model: 'Zenergy Tour 2.0',
      variants: [
        { size: 'Putter', weight: 50, diameter: 'Putter', color: 'Black/Silver', msrp: 34.99 },
        { size: 'Putter', weight: 50, diameter: 'Putter', color: 'White/Silver', msrp: 34.99 }
      ],
      features: ['Multi-Zone Texture', 'Putter Specific', 'Tour Feedback']
    }
  ],
  
  'Winn': [
    {
      model: 'Dri-Tac',
      variants: [
        { size: 'Standard', weight: 45, diameter: 'Standard', color: 'Black', msrp: 9.95 },
        { size: 'Midsize', weight: 53, diameter: 'Midsize', color: 'Black', msrp: 9.95 },
        { size: 'Jumbo', weight: 70, diameter: 'Jumbo', color: 'Black', msrp: 10.95 },
        { size: 'Standard', weight: 45, diameter: 'Standard', color: 'Grey', msrp: 9.95 }
      ],
      features: ['WinnDry Polymer', 'All-Weather', 'Cushioned Comfort']
    },
    {
      model: 'Dri-Tac LT',
      variants: [
        { size: 'Standard', weight: 32, diameter: 'Standard', color: 'Black', msrp: 11.95 },
        { size: 'Standard', weight: 32, diameter: 'Standard', color: 'Blue', msrp: 11.95 },
        { size: 'Standard', weight: 32, diameter: 'Standard', color: 'Red', msrp: 11.95 }
      ],
      features: ['Ultra Light', '40% Lighter', 'Increased Swing Speed']
    },
    {
      model: 'Excel',
      variants: [
        { size: 'Standard', weight: 43, diameter: 'Standard', color: 'Black', msrp: 4.95 },
        { size: 'Midsize', weight: 52, diameter: 'Midsize', color: 'Black', msrp: 4.95 }
      ],
      features: ['Polymer', 'Comfortable', 'Value Grip']
    }
  ],
  
  'IOMIC': [
    {
      model: 'Sticky 2.3',
      variants: [
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Black', msrp: 25.00 },
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Blue', msrp: 25.00 },
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Red', msrp: 25.00 },
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'White', msrp: 25.00 }
      ],
      features: ['Elastomer Material', 'Water Resistant', 'Consistent Feel']
    },
    {
      model: 'Sticky Evolution 2.3',
      variants: [
        { size: 'Standard', weight: 48, diameter: 'Standard', color: 'Black/Blue', msrp: 27.00 },
        { size: 'Standard', weight: 48, diameter: 'Standard', color: 'Black/Red', msrp: 27.00 }
      ],
      features: ['Premium Elastomer', 'Enhanced Traction', 'Tour Performance']
    }
  ],
  
  'Karma': [
    {
      model: 'Velour',
      variants: [
        { size: 'Standard', weight: 50, diameter: 'Standard', color: 'Black', msrp: 3.99 },
        { size: 'Midsize', weight: 60, diameter: 'Midsize', color: 'Black', msrp: 3.99 },
        { size: 'Jumbo', weight: 75, diameter: 'Jumbo', color: 'Black', msrp: 4.99 }
      ],
      features: ['Rubber Compound', 'Classic Feel', 'Budget Friendly']
    },
    {
      model: 'Dual Touch',
      variants: [
        { size: 'Standard', weight: 53, diameter: 'Standard', color: 'Black/Grey', msrp: 4.99 },
        { size: 'Midsize', weight: 63, diameter: 'Midsize', color: 'Black/Grey', msrp: 4.99 }
      ],
      features: ['Two-Tone Design', 'Soft Feel', 'Good Traction']
    }
  ]
};

async function addComprehensiveGrips() {
  console.log('🏌️ Adding Comprehensive Grip Catalog\n');
  
  try {
    let totalAdded = 0;
    let totalSkipped = 0;
    
    // Process each brand
    for (const [brand, models] of Object.entries(GRIP_DATA)) {
      console.log(`\n📦 Processing ${brand} grips...`);
      
      for (const modelData of models) {
        for (const variant of modelData.variants) {
          const gripName = variant.color !== 'Black' ? 
            `${modelData.model} ${variant.size} - ${variant.color}` : 
            `${modelData.model} ${variant.size}`;
          
          // Check if exists
          const { data: existing } = await supabase
            .from('equipment')
            .select('id')
            .eq('brand', brand)
            .eq('model', gripName)
            .eq('category', 'grip')
            .single();
          
          if (existing) {
            totalSkipped++;
            continue;
          }
          
          // Create grip entry
          const gripData = {
            brand: brand,
            model: gripName,
            category: 'grip',
            msrp: variant.msrp || 0,
            specs: {
              size: variant.size,
              weight_grams: variant.weight,
              diameter: variant.diameter,
              color: variant.color,
              material: getGripMaterial(brand),
              features: modelData.features,
              texture: getTextureType(modelData.model),
              firmness: getFirmness(modelData.model),
              year: 2023
            },
            description: `${brand} ${modelData.model} featuring ${modelData.features.join(', ')}.`,
            popularity_score: getGripPopularityScore(brand, modelData.model),
            image_url: `https://placehold.co/400x400/1a1a1a/white?text=${encodeURIComponent(brand + ' ' + modelData.model)}`
          };
          
          const { error } = await supabase
            .from('equipment')
            .insert(gripData);
          
          if (error) {
            console.error(`  ❌ Error adding ${gripName}:`, error.message);
          } else {
            console.log(`  ✅ Added: ${gripName}`);
            totalAdded++;
          }
        }
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Added: ${totalAdded} grips`);
    console.log(`⏭️  Skipped: ${totalSkipped} (already exist)`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Helper functions
function getGripMaterial(brand) {
  const materials = {
    'Golf Pride': 'Rubber/Cord Hybrid',
    'Lamkin': 'Synthetic Rubber',
    'SuperStroke': 'Polyurethane',
    'Winn': 'Polymer',
    'IOMIC': 'Elastomer',
    'Karma': 'Rubber'
  };
  return materials[brand] || 'Rubber';
}

function getTextureType(model) {
  if (model.includes('MCC') || model.includes('Cord')) return 'Cord';
  if (model.includes('Tour Velvet')) return 'Moderate';
  if (model.includes('CP2')) return 'Soft';
  if (model.includes('Crossline')) return 'Aggressive';
  return 'Standard';
}

function getFirmness(model) {
  if (model.includes('CP2') || model.includes('Comfort')) return 'Soft';
  if (model.includes('Tour') || model.includes('MCC')) return 'Medium';
  if (model.includes('Cord')) return 'Firm';
  return 'Medium';
}

function getGripPopularityScore(brand, model) {
  // Popular brands and models get higher scores
  const popularBrands = ['Golf Pride', 'Lamkin', 'SuperStroke'];
  const popularModels = ['MCC', 'Tour Velvet', 'Crossline', 'Dri-Tac'];
  
  let score = 70;
  if (popularBrands.includes(brand)) score += 10;
  if (popularModels.some(pm => model.includes(pm))) score += 10;
  
  return Math.min(score + Math.floor(Math.random() * 10), 95);
}

// Run the script
addComprehensiveGrips().catch(console.error);