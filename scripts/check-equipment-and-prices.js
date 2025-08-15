import { supabase } from './supabase-admin.js';

async function checkEquipmentAndPrices() {
  console.log('🏌️ Checking equipment and prices tables...\n');
  
  // Check if equipment_prices table exists and get structure
  try {
    const { data: pricesData, error: pricesError } = await supabase
      .from('equipment_prices')
      .select('*')
      .limit(1);
    
    if (pricesError) {
      console.log('❌ equipment_prices table does not exist yet');
      console.log('Creating equipment_prices table...\n');
      
      // Create the table
      const { error: createError } = await supabase.rpc('execute_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS equipment_prices (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
            retailer TEXT NOT NULL,
            price DECIMAL(10,2),
            url TEXT,
            in_stock BOOLEAN DEFAULT true,
            recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_equipment_prices_equipment_id ON equipment_prices(equipment_id);
          CREATE INDEX IF NOT EXISTS idx_equipment_prices_retailer ON equipment_prices(retailer);
          CREATE INDEX IF NOT EXISTS idx_equipment_prices_recorded_at ON equipment_prices(recorded_at);
        `
      });
      
      if (createError) {
        console.log('Failed to create equipment_prices table:', createError);
      } else {
        console.log('✅ Created equipment_prices table successfully');
      }
    } else {
      console.log('✅ equipment_prices table exists');
      
      // Get count of existing price records
      const { count } = await supabase
        .from('equipment_prices')
        .select('*', { count: 'exact', head: true });
      
      console.log(`   Current price records: ${count}\n`);
    }
  } catch (e) {
    console.log('Error checking equipment_prices table:', e.message);
  }
  
  // Get popular drivers and putters for testing
  console.log('🎯 Getting popular drivers and putters...\n');
  
  try {
    const { data: drivers, error: driversError } = await supabase
      .from('equipment')
      .select('id, brand, model, category, msrp')
      .eq('category', 'driver')
      .not('msrp', 'is', null)
      .order('msrp', { ascending: false })
      .limit(3);
    
    if (driversError) {
      console.log('Error fetching drivers:', driversError);
    } else {
      console.log('Popular Drivers:');
      drivers.forEach(item => {
        console.log(`  ${item.brand} ${item.model} - $${item.msrp} (ID: ${item.id})`);
      });
      console.log();
    }
    
    const { data: putters, error: puttersError } = await supabase
      .from('equipment')
      .select('id, brand, model, category, msrp')
      .eq('category', 'putter')
      .not('msrp', 'is', null)
      .order('msrp', { ascending: false })
      .limit(3);
    
    if (puttersError) {
      console.log('Error fetching putters:', puttersError);
    } else {
      console.log('Popular Putters:');
      putters.forEach(item => {
        console.log(`  ${item.brand} ${item.model} - $${item.msrp} (ID: ${item.id})`);
      });
      console.log();
    }
    
    // Return the equipment for price scraping
    return {
      drivers: drivers || [],
      putters: putters || []
    };
    
  } catch (e) {
    console.log('Error fetching equipment:', e.message);
    return { drivers: [], putters: [] };
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkEquipmentAndPrices();
}

export { checkEquipmentAndPrices };