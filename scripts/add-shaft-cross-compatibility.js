import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addShaftCrossCompatibility() {
  console.log('\n🏌️ Adding Cross-Compatible Shafts\n');
  console.log('=================================\n');

  try {
    // 1. Get existing driver shafts
    console.log('1. Getting popular driver shafts to make available for woods...\n');
    
    const { data: driverShafts, error } = await supabase
      .from('shafts')
      .select('*')
      .eq('category', 'driver')
      .eq('is_stock', false); // Get aftermarket shafts

    if (error) {
      console.error('Error fetching driver shafts:', error);
      return;
    }

    console.log(`Found ${driverShafts.length} aftermarket driver shafts`);

    // 2. Create fairway wood versions of popular driver shafts
    console.log('\n2. Creating fairway wood versions of driver shafts...\n');
    
    for (const driverShaft of driverShafts) {
      // Check if this shaft already exists for fairway wood
      const { data: existing } = await supabase
        .from('shafts')
        .select('id')
        .eq('brand', driverShaft.brand)
        .eq('model', driverShaft.model)
        .eq('flex', driverShaft.flex)
        .eq('category', 'fairway_wood');

      if (!existing || existing.length === 0) {
        // Create fairway wood version
        const fairwayShaft = {
          ...driverShaft,
          id: undefined, // Let Supabase generate new ID
          category: 'fairway_wood',
          weight_grams: driverShaft.weight_grams + 5, // Fairway shafts typically slightly heavier
          is_stock: false
        };

        const { error: insertError } = await supabase
          .from('shafts')
          .insert(fairwayShaft);

        if (insertError) {
          console.error(`Error creating fairway shaft ${driverShaft.brand} ${driverShaft.model}:`, insertError.message);
        } else {
          console.log(`✅ Created fairway version of ${driverShaft.brand} ${driverShaft.model}`);
        }
      }
    }

    // 3. Also ensure hybrid shafts exist
    console.log('\n3. Creating hybrid shaft options...\n');
    
    const hybridShafts = [
      { brand: 'Graphite Design', model: 'Tour AD HY', flex: 'Stiff', weight_grams: 85 },
      { brand: 'UST Mamiya', model: 'Recoil', flex: 'Regular', weight_grams: 75 },
      { brand: 'UST Mamiya', model: 'Recoil', flex: 'Stiff', weight_grams: 85 }
    ];

    for (const shaft of hybridShafts) {
      const { error: insertError } = await supabase
        .from('shafts')
        .insert({
          ...shaft,
          category: 'hybrid',
          is_stock: false,
          launch_profile: 'mid',
          spin_profile: 'mid'
        });

      if (insertError && !insertError.message.includes('duplicate')) {
        console.error(`Error creating hybrid shaft:`, insertError.message);
      } else if (!insertError) {
        console.log(`✅ Created hybrid shaft: ${shaft.brand} ${shaft.model}`);
      }
    }

    // 4. Verify final counts
    console.log('\n4. Final shaft counts by category:\n');
    
    const categories = ['driver', 'fairway_wood', 'hybrid', 'utility_iron', 'iron', 'wedge', 'putter'];
    
    for (const cat of categories) {
      const { count } = await supabase
        .from('shafts')
        .select('*', { count: 'exact', head: true })
        .eq('category', cat);
      
      console.log(`  ${cat}: ${count} shafts`);
    }

    console.log('\n=================================');
    console.log('✅ Shaft cross-compatibility added!');
    console.log('\nFairway woods can now use driver shafts and vice versa.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

addShaftCrossCompatibility().catch(console.error);