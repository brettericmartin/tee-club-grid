import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addFairwayShafts() {
  console.log('\n🏌️ Adding Fairway Wood Shafts\n');
  console.log('=============================\n');

  try {
    // Popular fairway wood shafts
    const fairwayShafts = [
      // Fujikura shafts
      { brand: 'Fujikura', model: 'Ventus Blue FW', flex: 'Regular', weight_grams: 65, launch_profile: 'mid', spin_profile: 'low' },
      { brand: 'Fujikura', model: 'Ventus Blue FW', flex: 'Stiff', weight_grams: 75, launch_profile: 'mid', spin_profile: 'low' },
      { brand: 'Fujikura', model: 'Ventus Black FW', flex: 'Stiff', weight_grams: 85, launch_profile: 'low', spin_profile: 'low' },
      
      // Graphite Design
      { brand: 'Graphite Design', model: 'Tour AD IZ', flex: 'Regular', weight_grams: 65, launch_profile: 'mid', spin_profile: 'mid' },
      { brand: 'Graphite Design', model: 'Tour AD IZ', flex: 'Stiff', weight_grams: 75, launch_profile: 'mid', spin_profile: 'mid' },
      
      // Mitsubishi
      { brand: 'Mitsubishi', model: 'Tensei AV Blue', flex: 'Regular', weight_grams: 65, launch_profile: 'mid', spin_profile: 'mid' },
      { brand: 'Mitsubishi', model: 'Tensei AV Blue', flex: 'Stiff', weight_grams: 75, launch_profile: 'mid', spin_profile: 'mid' },
      
      // Project X
      { brand: 'Project X', model: 'HZRDUS Smoke Blue', flex: 'Regular', weight_grams: 60, launch_profile: 'low', spin_profile: 'low' },
      { brand: 'Project X', model: 'HZRDUS Smoke Blue', flex: 'Stiff', weight_grams: 70, launch_profile: 'low', spin_profile: 'low' },
      
      // UST Mamiya
      { brand: 'UST Mamiya', model: 'Helium', flex: 'Regular', weight_grams: 50, launch_profile: 'high', spin_profile: 'mid' },
      { brand: 'UST Mamiya', model: 'Helium', flex: 'Senior', weight_grams: 45, launch_profile: 'high', spin_profile: 'high' }
    ];

    console.log(`Adding ${fairwayShafts.length} fairway wood shafts...\n`);

    let added = 0;
    let skipped = 0;

    for (const shaft of fairwayShafts) {
      // Check if already exists
      const { data: existing } = await supabase
        .from('shafts')
        .select('id')
        .eq('brand', shaft.brand)
        .eq('model', shaft.model)
        .eq('flex', shaft.flex)
        .eq('category', 'fairway_wood');

      if (existing && existing.length > 0) {
        console.log(`⏭️  Skipping ${shaft.brand} ${shaft.model} (${shaft.flex}) - already exists`);
        skipped++;
        continue;
      }

      // Add the shaft
      const { error } = await supabase
        .from('shafts')
        .insert({
          ...shaft,
          category: 'fairway_wood',
          is_stock: false
        });

      if (error) {
        console.error(`❌ Error adding ${shaft.brand} ${shaft.model}:`, error.message);
      } else {
        console.log(`✅ Added ${shaft.brand} ${shaft.model} (${shaft.flex})`);
        added++;
      }
    }

    console.log(`\n✅ Summary: Added ${added} shafts, skipped ${skipped} existing`);

    // Show final count
    const { count } = await supabase
      .from('shafts')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'fairway_wood');

    console.log(`\nTotal fairway wood shafts: ${count}`);

    console.log('\n=============================');
    console.log('✅ Fairway wood shafts added!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

addFairwayShafts().catch(console.error);