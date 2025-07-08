// Mapping of old equipment IDs to new equipment in the database
// Based on similar equipment types and characteristics

export const EQUIPMENT_ID_MAPPING: Record<string, { brand: string; model: string }> = {
  // Old sample equipment IDs (e1, e2, etc.)
  'e1': { brand: 'TaylorMade', model: 'Stealth 2' }, // Driver
  'e2': { brand: 'Callaway', model: 'Paradym' }, // 3-wood -> Driver
  'e3': { brand: 'Titleist', model: 'T100' }, // Irons
  'e4': { brand: 'Titleist', model: 'Vokey SM10' }, // Wedge
  'e5': { brand: 'Titleist', model: 'Vokey SM10' }, // Wedge
  'e6': { brand: 'Titleist', model: 'Vokey SM10' }, // Wedge
  'e7': { brand: 'Scotty Cameron', model: 'Newport 2' }, // Putter
  'e8': { brand: 'Titleist', model: 'Pro V1' }, // Ball
  
  // These IDs already exist in our database import, so they map to themselves
  'tm-stealth2-2023': { brand: 'TaylorMade', model: 'Stealth 2' },
  'tm-qi10-2024': { brand: 'TaylorMade', model: 'Qi10' },
  'tm-qi10-max': { brand: 'TaylorMade', model: 'Qi10' }, // Qi10 Max -> Qi10
  'titleist-tsr3-2023': { brand: 'Titleist', model: 'TSR3' },
  'titleist-t100-2023': { brand: 'Titleist', model: 'T100' },
  'vokey-sm10-2024': { brand: 'Titleist', model: 'Vokey SM10' },
  'scotty-newport2-2023': { brand: 'Scotty Cameron', model: 'Newport 2' },
  'titleist-prov1-2023': { brand: 'Titleist', model: 'Pro V1' },
  'callaway-paradym-2023': { brand: 'Callaway', model: 'Paradym' },
  'ping-g430-max-2023': { brand: 'Ping', model: 'G430 Max' },
  'odyssey-ai-one-2024': { brand: 'Odyssey', model: 'Ai-ONE' },
  'taylormade-tp5-2024': { brand: 'TaylorMade', model: 'TP5' },
  'footjoy-stasof': { brand: 'Titleist', model: 'Pro V1' }, // Glove -> Ball (no gloves in DB)
  'bushnell-pro-x3': { brand: 'Ping', model: 'Hoofer 14' }, // Rangefinder -> Bag (no rangefinders in DB)
  
  // Community submissions
  'community-ping-eye2': { brand: 'Ping', model: 'Eye 2' },
  'community-titleist-681': { brand: 'Titleist', model: '681' },
  'community-custom-bettinardi': { brand: 'Bettinardi', model: 'Custom DASS BB1' },
};

// Function to get equipment from database by old ID
export async function getEquipmentByOldId(oldId: string, supabase: any) {
  const mapping = EQUIPMENT_ID_MAPPING[oldId];
  if (!mapping) {
    console.warn(`No mapping found for equipment ID: ${oldId}`);
    return null;
  }
  
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('brand', mapping.brand)
    .eq('model', mapping.model)
    .single();
    
  if (error) {
    console.error('Error fetching equipment:', error);
    return null;
  }
  
  return data;
}