import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFairwayShafts() {
  console.log('\n🏌️ Checking Fairway Wood Shafts\n');
  console.log('================================\n');

  try {
    // Check all fairway wood shafts
    const { data: fwShafts, error } = await supabase
      .from('shafts')
      .select('*')
      .eq('category', 'fairway_wood')
      .order('is_stock', { ascending: false })
      .order('brand');

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log(`Found ${fwShafts.length} fairway wood shafts:\n`);
    
    fwShafts.forEach(shaft => {
      console.log(`- ${shaft.brand} ${shaft.model} (${shaft.flex}) - ${shaft.weight_grams}g`);
      console.log(`  Stock: ${shaft.is_stock ? 'Yes' : 'No'} | Launch: ${shaft.launch_profile} | Spin: ${shaft.spin_profile}`);
    });

    // Also check what will be available with the new compatibility system
    console.log('\n\nWith the new compatibility system, fairway woods will also see:');
    
    const compatibleCategories = ['driver', 'wood', 'fairway_wood', 'hybrid'];
    const { data: allCompatible } = await supabase
      .from('shafts')
      .select('brand, model, category')
      .in('category', compatibleCategories)
      .order('category')
      .order('brand');

    if (allCompatible) {
      const byCategory = {};
      allCompatible.forEach(shaft => {
        if (!byCategory[shaft.category]) {
          byCategory[shaft.category] = 0;
        }
        byCategory[shaft.category]++;
      });

      Object.entries(byCategory).forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} shafts`);
      });
    }

    console.log('\n================================\n');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkFairwayShafts().catch(console.error);