import { supabase } from '../src/lib/supabase';

// Map of old equipment IDs to equipment details
const equipmentMapping = [
  // Drivers
  { oldId: 'tm-qi10-max', brand: 'TaylorMade', model: 'Qi10 Max', category: 'driver' },
  { oldId: 'titleist-tsr3', brand: 'Titleist', model: 'TSR3', category: 'driver' },
  { oldId: 'callaway-ai-smoke-max', brand: 'Callaway', model: 'AI Smoke Max', category: 'driver' },
  { oldId: 'ping-g430-max', brand: 'Ping', model: 'G430 Max', category: 'driver' },
  
  // Fairway Woods
  { oldId: 'tm-qi10-fairway', brand: 'TaylorMade', model: 'Qi10 Fairway', category: 'fairway_wood' },
  { oldId: 'titleist-tsr3-fairway', brand: 'Titleist', model: 'TSR3 Fairway', category: 'fairway_wood' },
  { oldId: 'callaway-ai-smoke-fairway', brand: 'Callaway', model: 'AI Smoke Fairway', category: 'fairway_wood' },
  { oldId: 'ping-g430-fairway', brand: 'Ping', model: 'G430 Fairway', category: 'fairway_wood' },
  
  // Hybrids
  { oldId: 'tm-qi10-hybrid', brand: 'TaylorMade', model: 'Qi10 Hybrid', category: 'hybrid' },
  { oldId: 'titleist-tsr2-hybrid', brand: 'Titleist', model: 'TSR2 Hybrid', category: 'hybrid' },
  { oldId: 'callaway-apex-hybrid', brand: 'Callaway', model: 'Apex Hybrid', category: 'hybrid' },
  { oldId: 'ping-g430-hybrid', brand: 'Ping', model: 'G430 Hybrid', category: 'hybrid' },
  
  // Irons
  { oldId: 'titleist-t100', brand: 'Titleist', model: 'T100', category: 'irons' },
  { oldId: 'tm-p790', brand: 'TaylorMade', model: 'P790', category: 'irons' },
  { oldId: 'callaway-apex-pro', brand: 'Callaway', model: 'Apex Pro', category: 'irons' },
  { oldId: 'ping-i230', brand: 'Ping', model: 'i230', category: 'irons' },
  
  // Wedges
  { oldId: 'vokey-sm10', brand: 'Titleist', model: 'Vokey SM10', category: 'wedges' },
  { oldId: 'tm-mg4', brand: 'TaylorMade', model: 'MG4', category: 'wedges' },
  { oldId: 'callaway-jaws-raw', brand: 'Callaway', model: 'JAWS Raw', category: 'wedges' },
  { oldId: 'cleveland-rtx6', brand: 'Cleveland', model: 'RTX 6 ZipCore', category: 'wedges' },
  
  // Putters
  { oldId: 'scotty-phantom-x5', brand: 'Scotty Cameron', model: 'Phantom X 5', category: 'putter' },
  { oldId: 'odyssey-white-hot', brand: 'Odyssey', model: 'White Hot OG', category: 'putter' },
  { oldId: 'tm-spider-tour', brand: 'TaylorMade', model: 'Spider Tour', category: 'putter' },
  { oldId: 'ping-pld-anser', brand: 'Ping', model: 'PLD Anser', category: 'putter' },
  
  // Golf Balls
  { oldId: 'titleist-prov1', brand: 'Titleist', model: 'Pro V1', category: 'golf_ball' },
  { oldId: 'titleist-prov1x', brand: 'Titleist', model: 'Pro V1x', category: 'golf_ball' },
  { oldId: 'tm-tp5', brand: 'TaylorMade', model: 'TP5', category: 'golf_ball' },
  { oldId: 'callaway-chrome-soft', brand: 'Callaway', model: 'Chrome Soft', category: 'golf_ball' },
  { oldId: 'bridgestone-tour-bx', brand: 'Bridgestone', model: 'Tour B X', category: 'golf_ball' },
  { oldId: 'srixon-z-star-xv', brand: 'Srixon', model: 'Z-Star XV', category: 'golf_ball' },
  { oldId: 'wilson-duo-soft', brand: 'Wilson', model: 'Duo Soft', category: 'golf_ball' },
  
  // Gloves
  { oldId: 'footjoy-stasof', brand: 'FootJoy', model: 'StaSof', category: 'accessories' },
  { oldId: 'titleist-players', brand: 'Titleist', model: 'Players', category: 'accessories' },
  { oldId: 'callaway-tour-authentic', brand: 'Callaway', model: 'Tour Authentic', category: 'accessories' },
  { oldId: 'tm-tour-preferred', brand: 'TaylorMade', model: 'Tour Preferred', category: 'accessories' },
  { oldId: 'wilson-premium', brand: 'Wilson', model: 'Premium Feel', category: 'accessories' },
  
  // Bags
  { oldId: 'titleist-players-4', brand: 'Titleist', model: 'Players 4', category: 'accessories' },
  { oldId: 'ping-hoofer-14', brand: 'Ping', model: 'Hoofer 14', category: 'accessories' },
  { oldId: 'callaway-fairway-14', brand: 'Callaway', model: 'Fairway 14', category: 'accessories' },
  { oldId: 'tm-flextech-carry', brand: 'TaylorMade', model: 'FlexTech Carry', category: 'accessories' },
  
  // Tees
  { oldId: 'pride-pts', brand: 'Pride', model: 'Professional Tee System', category: 'accessories' },
  { oldId: 'zero-friction', brand: 'Zero Friction', model: 'Tour 3-Prong', category: 'accessories' },
];

async function createEquipmentMappingTable() {
  console.log('Creating equipment mapping table...');
  
  // Create a mapping table to store old ID to new ID relationships
  const { error: createError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS equipment_id_mapping (
        old_id TEXT PRIMARY KEY,
        new_id UUID REFERENCES equipment(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
      );
    `
  });
  
  if (createError) {
    console.error('Error creating mapping table:', createError);
    return;
  }
  
  console.log('Mapping table created successfully');
  
  // For each equipment in the mapping, find or create the equipment and store the mapping
  for (const item of equipmentMapping) {
    // First check if equipment exists
    const { data: existing } = await supabase
      .from('equipment')
      .select('id')
      .eq('brand', item.brand)
      .eq('model', item.model)
      .single();
    
    let equipmentId: string;
    
    if (existing) {
      equipmentId = existing.id;
      console.log(`Found existing equipment: ${item.brand} ${item.model}`);
    } else {
      // Create the equipment
      const { data: newEquipment, error: insertError } = await supabase
        .from('equipment')
        .insert({
          brand: item.brand,
          model: item.model,
          category: item.category,
          msrp: getEstimatedMSRP(item.category, item.brand),
          specs: {}
        })
        .select()
        .single();
      
      if (insertError) {
        console.error(`Error creating equipment ${item.brand} ${item.model}:`, insertError);
        continue;
      }
      
      equipmentId = newEquipment.id;
      console.log(`Created new equipment: ${item.brand} ${item.model}`);
    }
    
    // Store the mapping
    const { error: mappingError } = await supabase
      .from('equipment_id_mapping')
      .upsert({
        old_id: item.oldId,
        new_id: equipmentId
      });
    
    if (mappingError) {
      console.error(`Error storing mapping for ${item.oldId}:`, mappingError);
    } else {
      console.log(`Mapped ${item.oldId} -> ${equipmentId}`);
    }
  }
  
  console.log('Equipment mapping complete!');
}

function getEstimatedMSRP(category: string, brand: string): number {
  const premiumBrands = ['Titleist', 'Scotty Cameron', 'TaylorMade', 'Callaway'];
  const isPremium = premiumBrands.includes(brand);
  
  const msrpMap: Record<string, [number, number]> = {
    'driver': [400, 600],
    'fairway_wood': [300, 450],
    'hybrid': [250, 350],
    'irons': [800, 1400],
    'wedges': [150, 200],
    'putter': [300, 500],
    'golf_ball': [40, 60],
    'accessories': [25, 200]
  };
  
  const [min, max] = msrpMap[category] || [100, 200];
  return isPremium ? max : min;
}

// Run the script
createEquipmentMappingTable().catch(console.error);