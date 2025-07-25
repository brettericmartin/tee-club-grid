import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkShaftGripStats() {
  console.log('🏌️ Shaft & Grip Database Statistics\n');
  
  try {
    // Get shaft statistics
    const { data: shafts } = await supabase
      .from('equipment')
      .select('*')
      .eq('category', 'shaft');
    
    console.log(`Total Shafts: ${shafts.length}`);
    
    // Shaft breakdown by club type
    const shaftsByType = {};
    shafts.forEach(shaft => {
      const type = shaft.specs?.club_type || 'unknown';
      shaftsByType[type] = (shaftsByType[type] || 0) + 1;
    });
    
    console.log('\nShafts by Club Type:');
    Object.entries(shaftsByType)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count} shafts`);
      });
    
    // Shaft brands
    const shaftBrands = {};
    shafts.forEach(shaft => {
      shaftBrands[shaft.brand] = (shaftBrands[shaft.brand] || 0) + 1;
    });
    
    console.log('\nTop Shaft Brands:');
    Object.entries(shaftBrands)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([brand, count]) => {
        console.log(`  ${brand}: ${count} shafts`);
      });
    
    // Get grip statistics
    const { data: grips } = await supabase
      .from('equipment')
      .select('*')
      .eq('category', 'grip');
    
    console.log(`\nTotal Grips: ${grips.length}`);
    
    // Grip brands
    const gripBrands = {};
    grips.forEach(grip => {
      gripBrands[grip.brand] = (gripBrands[grip.brand] || 0) + 1;
    });
    
    console.log('\nGrip Brands:');
    Object.entries(gripBrands)
      .sort(([,a], [,b]) => b - a)
      .forEach(([brand, count]) => {
        console.log(`  ${brand}: ${count} grips`);
      });
    
    // Grip sizes
    const gripSizes = {};
    grips.forEach(grip => {
      const size = grip.specs?.size || 'unknown';
      gripSizes[size] = (gripSizes[size] || 0) + 1;
    });
    
    console.log('\nGrip Sizes:');
    Object.entries(gripSizes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([size, count]) => {
        console.log(`  ${size}: ${count} grips`);
      });
    
    // Price ranges
    const shaftPrices = shafts.map(s => parseFloat(s.msrp)).filter(p => p > 0);
    const gripPrices = grips.map(g => parseFloat(g.msrp)).filter(p => p > 0);
    
    console.log('\nPrice Statistics:');
    if (shaftPrices.length > 0) {
      const avgShaftPrice = shaftPrices.reduce((a, b) => a + b, 0) / shaftPrices.length;
      console.log(`  Avg Shaft Price: $${avgShaftPrice.toFixed(2)}`);
      console.log(`  Shaft Price Range: $${Math.min(...shaftPrices)} - $${Math.max(...shaftPrices)}`);
    }
    
    if (gripPrices.length > 0) {
      const avgGripPrice = gripPrices.reduce((a, b) => a + b, 0) / gripPrices.length;
      console.log(`  Avg Grip Price: $${avgGripPrice.toFixed(2)}`);
      console.log(`  Grip Price Range: $${Math.min(...gripPrices)} - $${Math.max(...gripPrices)}`);
    }
    
    // Recent additions
    const { data: recentShafts } = await supabase
      .from('equipment')
      .select('brand, model, created_at')
      .eq('category', 'shaft')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('\nMost Recent Shaft Additions:');
    recentShafts.forEach(item => {
      console.log(`  ${item.brand} ${item.model}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkShaftGripStats().catch(console.error);