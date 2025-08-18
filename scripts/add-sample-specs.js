import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addSampleSpecs() {
  console.log('Adding sample equipment with comprehensive specs...\n');
  
  try {
    // Find some existing equipment to update with specs
    const { data: equipment, error: fetchError } = await supabase
      .from('equipment')
      .select('id, brand, model, category')
      .limit(10);
    
    if (fetchError) {
      console.error('Error fetching equipment:', fetchError);
      return;
    }
    
    console.log(`Found ${equipment.length} equipment items to enhance with specs\n`);
    
    // Sample specs for different categories
    const sampleSpecs = {
      driver: {
        loft_options: ['9°', '10.5°', '12°'],
        shaft_flex: ['Senior', 'Regular', 'Stiff', 'X-Stiff'],
        head_size: '460cc',
        material: 'Titanium with Carbon Crown',
        adjustability: 'Yes - 4° Loft Sleeve',
        face_technology: 'AI-Designed Flash Face',
        crown_material: 'Carbon Composite',
        stock_shaft: 'Project X HZRDUS',
        launch: 'Mid-High',
        spin: 'Low-Mid',
        forgiveness: 'Very High',
        description: 'Maximum forgiveness driver with AI-designed face for faster ball speeds across the entire face.',
        tour_usage: ['Rory McIlroy', 'Jon Rahm', 'Dustin Johnson'],
        key_features: [
          'AI-designed Flash Face for consistent ball speeds',
          'Jailbreak Speed Frame for stability',
          'Adjustable perimeter weighting',
          'Premium shaft options available'
        ]
      },
      iron: {
        set_composition: '4-PW (7 clubs)',
        shaft_options: ['KBS Tour Steel', 'UST Recoil Graphite'],
        material: 'Forged 1025 Carbon Steel',
        technology: 'Hollow Body Construction',
        offset: 'Progressive (more in long irons)',
        sole_width: 'Medium',
        top_line: 'Thin to Medium',
        finish: 'Chrome',
        launch: 'Mid-High',
        forgiveness: 'High',
        feel: 'Soft and Responsive',
        workability: 'Moderate',
        description: 'Players distance irons combining tour-level feel with game improvement forgiveness.',
        tour_usage: ['Collin Morikawa', 'Viktor Hovland'],
        key_features: [
          'Forged construction for exceptional feel',
          'Tungsten weighting for optimal CG',
          'Progressive offset design',
          'Tour-inspired shaping'
        ]
      },
      putter: {
        head_style: 'Blade',
        length_options: ['33"', '34"', '35"'],
        material: '303 Stainless Steel',
        face_insert: 'White Hot Microhinge',
        toe_hang: '35°',
        balance: 'Toe Weighted',
        grip: 'SuperStroke Pistol GT',
        neck_style: 'Plumber\'s Neck',
        alignment_aid: 'Triple Track',
        weight: '340g',
        lie_angle: '70°',
        loft: '3°',
        finish: 'Tour Black',
        description: 'Tour-proven blade putter with enhanced alignment and premium feel.',
        tour_usage: ['Justin Thomas', 'Jordan Spieth'],
        key_features: [
          'Precision milled from 303 stainless steel',
          'Microhinge face insert for true roll',
          'Adjustable sole weights',
          'Tour-preferred shape and finish'
        ]
      },
      wedge: {
        loft: '56°',
        bounce: '12°',
        grind: 'S Grind',
        material: '8620 Carbon Steel',
        finish: 'Tour Chrome',
        grooves: 'Tour-Issue Spin Milled',
        shaft_options: ['Dynamic Gold', 'KBS Hi-Rev'],
        sole_width: 'Medium',
        leading_edge: 'Slightly Rounded',
        lie_angle: '64°',
        description: 'Tour-validated wedge with maximum spin and versatility around the greens.',
        tour_usage: ['Tiger Woods', 'Justin Rose'],
        key_features: [
          'Spin Milled grooves for maximum spin',
          'Progressive CG for optimal trajectory',
          'Multiple grind options available',
          'Raw face option for enhanced spin'
        ]
      }
    };
    
    // Update equipment with appropriate specs based on category
    for (const item of equipment) {
      const category = item.category.toLowerCase();
      let specs = {};
      
      if (category.includes('driver')) {
        specs = sampleSpecs.driver;
      } else if (category.includes('iron')) {
        specs = sampleSpecs.iron;
      } else if (category.includes('putter')) {
        specs = sampleSpecs.putter;
      } else if (category.includes('wedge')) {
        specs = sampleSpecs.wedge;
      } else {
        // Generic specs for other categories
        specs = {
          material: 'Premium Composite',
          technology: 'Advanced Construction',
          description: `High-quality ${item.category} from ${item.brand}`,
          key_features: [
            'Premium materials',
            'Tour-level performance',
            'Exceptional durability'
          ]
        };
      }
      
      // Add brand/model specific tweaks
      specs.release_year = 2023 + Math.floor(Math.random() * 2);
      
      const { error: updateError } = await supabase
        .from('equipment')
        .update({ specs })
        .eq('id', item.id);
      
      if (updateError) {
        console.error(`Error updating ${item.brand} ${item.model}:`, updateError);
      } else {
        console.log(`✅ Updated ${item.brand} ${item.model} with comprehensive specs`);
      }
    }
    
    console.log('\n✨ Sample specs have been added successfully!');
    console.log('Navigate to any equipment detail page and check the new "Specs" tab.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

addSampleSpecs();