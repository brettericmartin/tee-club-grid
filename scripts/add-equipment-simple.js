import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const equipment = [
  // Drivers
  { brand: 'TaylorMade', model: 'Stealth 2', category: 'driver', msrp: 599.99 },
  { brand: 'TaylorMade', model: 'Stealth 2 Plus', category: 'driver', msrp: 599.99 },
  { brand: 'Callaway', model: 'Paradym', category: 'driver', msrp: 599.99 },
  { brand: 'Callaway', model: 'Paradym X', category: 'driver', msrp: 599.99 },
  { brand: 'Titleist', model: 'TSR2', category: 'driver', msrp: 599.99 },
  { brand: 'Titleist', model: 'TSR3', category: 'driver', msrp: 599.99 },
  { brand: 'Ping', model: 'G430 Max', category: 'driver', msrp: 599.99 },
  { brand: 'Ping', model: 'G430 LST', category: 'driver', msrp: 599.99 },
  { brand: 'Cobra', model: 'Aerojet', category: 'driver', msrp: 499.99 },
  { brand: 'Cobra', model: 'Aerojet LS', category: 'driver', msrp: 499.99 },
  
  // Fairway Woods
  { brand: 'TaylorMade', model: 'Stealth 2 3 Wood', category: 'fairway_wood', msrp: 349.99 },
  { brand: 'TaylorMade', model: 'Stealth 2 5 Wood', category: 'fairway_wood', msrp: 329.99 },
  { brand: 'Callaway', model: 'Paradym 3 Wood', category: 'fairway_wood', msrp: 349.99 },
  { brand: 'Titleist', model: 'TSR2 3 Wood', category: 'fairway_wood', msrp: 349.99 },
  { brand: 'Ping', model: 'G430 Max 3 Wood', category: 'fairway_wood', msrp: 349.99 },
  
  // Hybrids
  { brand: 'TaylorMade', model: 'Stealth 2 Rescue', category: 'hybrid', msrp: 279.99 },
  { brand: 'Callaway', model: 'Paradym Hybrid', category: 'hybrid', msrp: 279.99 },
  { brand: 'Titleist', model: 'TSR2 Hybrid', category: 'hybrid', msrp: 279.99 },
  { brand: 'Ping', model: 'G430 Hybrid', category: 'hybrid', msrp: 279.99 },
  
  // Irons
  { brand: 'Mizuno', model: 'JPX 923 Tour', category: 'iron', msrp: 1399.99 },
  { brand: 'Mizuno', model: 'JPX 923 Forged', category: 'iron', msrp: 1199.99 },
  { brand: 'Titleist', model: 'T100', category: 'iron', msrp: 1399.99 },
  { brand: 'Titleist', model: 'T200', category: 'iron', msrp: 1399.99 },
  { brand: 'TaylorMade', model: 'P790', category: 'iron', msrp: 1399.99 },
  { brand: 'TaylorMade', model: 'P770', category: 'iron', msrp: 1399.99 },
  { brand: 'Callaway', model: 'Apex Pro', category: 'iron', msrp: 1399.99 },
  { brand: 'Ping', model: 'i230', category: 'iron', msrp: 1399.99 },
  
  // Wedges
  { brand: 'Titleist', model: 'Vokey SM9 50°', category: 'wedge', msrp: 179.99 },
  { brand: 'Titleist', model: 'Vokey SM9 54°', category: 'wedge', msrp: 179.99 },
  { brand: 'Titleist', model: 'Vokey SM9 58°', category: 'wedge', msrp: 179.99 },
  { brand: 'Cleveland', model: 'RTX 6 ZipCore 56°', category: 'wedge', msrp: 169.99 },
  { brand: 'Cleveland', model: 'RTX 6 ZipCore 60°', category: 'wedge', msrp: 169.99 },
  { brand: 'TaylorMade', model: 'MG3 54°', category: 'wedge', msrp: 179.99 },
  { brand: 'Callaway', model: 'Jaws Raw 58°', category: 'wedge', msrp: 179.99 },
  
  // Putters
  { brand: 'Scotty Cameron', model: 'Special Select Newport 2', category: 'putter', msrp: 449.99 },
  { brand: 'Scotty Cameron', model: 'Phantom X 5', category: 'putter', msrp: 479.99 },
  { brand: 'Odyssey', model: 'White Hot OG #1', category: 'putter', msrp: 249.99 },
  { brand: 'Odyssey', model: 'White Hot OG #7', category: 'putter', msrp: 249.99 },
  { brand: 'Ping', model: 'PLD Milled Anser', category: 'putter', msrp: 399.99 },
  { brand: 'TaylorMade', model: 'Spider GT', category: 'putter', msrp: 349.99 },
  
  // Balls
  { brand: 'Titleist', model: 'Pro V1', category: 'balls', msrp: 54.99 },
  { brand: 'Titleist', model: 'Pro V1x', category: 'balls', msrp: 54.99 },
  { brand: 'TaylorMade', model: 'TP5', category: 'balls', msrp: 49.99 },
  { brand: 'TaylorMade', model: 'TP5x', category: 'balls', msrp: 49.99 },
  { brand: 'Callaway', model: 'Chrome Soft', category: 'balls', msrp: 49.99 },
  { brand: 'Bridgestone', model: 'Tour B XS', category: 'balls', msrp: 49.99 },
  
  // Bags
  { brand: 'Titleist', model: 'Players 4 Plus', category: 'bags', msrp: 299.99 },
  { brand: 'TaylorMade', model: 'FlexTech Crossover', category: 'bags', msrp: 279.99 },
  { brand: 'Ping', model: 'Hoofer 14', category: 'bags', msrp: 259.99 },
  { brand: 'Callaway', model: 'Fairway 14', category: 'bags', msrp: 239.99 },
  { brand: 'Sun Mountain', model: 'C-130', category: 'bags', msrp: 329.99 },
  
  // Gloves
  { brand: 'Titleist', model: 'Players Glove', category: 'gloves', msrp: 24.99 },
  { brand: 'TaylorMade', model: 'Tour Preferred', category: 'gloves', msrp: 22.99 },
  { brand: 'FootJoy', model: 'Pure Touch', category: 'gloves', msrp: 29.99 }
];

async function addEquipment() {
  console.log(`Adding ${equipment.length} equipment items...`);
  
  for (const item of equipment) {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .insert({
          brand: item.brand,
          model: item.model,
          category: item.category,
          msrp: item.msrp,
          image_url: `https://placehold.co/400x400/1a1a1a/white?text=${encodeURIComponent(item.brand + ' ' + item.model)}`,
          specs: {},
          popularity_score: Math.floor(Math.random() * 100)
        })
        .select();
      
      if (error) {
        console.error(`Error inserting ${item.brand} ${item.model}:`, error.message);
      } else {
        console.log(`✓ Added ${item.brand} ${item.model}`);
      }
    } catch (error) {
      console.error(`Failed to insert ${item.brand} ${item.model}:`, error);
    }
  }
  
  console.log('\nDone!');
}

addEquipment().catch(console.error);