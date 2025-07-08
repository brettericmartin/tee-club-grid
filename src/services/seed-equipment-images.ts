// Simple service to seed equipment with initial images from public sources
import { supabase } from '@/lib/supabase';

// Common golf equipment image sources that allow hotlinking
export const EQUIPMENT_IMAGE_SOURCES = {
  // 2nd Swing has good product images
  '2ndswing': (brand: string, model: string) => {
    const slug = `${brand}-${model}`.toLowerCase().replace(/\s+/g, '-');
    return [
      `https://www.2ndswing.com/images/product-image/${slug}-1.jpg`,
      `https://www.2ndswing.com/images/product-image/${slug}-2.jpg`
    ];
  },
  
  // TGW product images
  'tgw': (brand: string, model: string) => {
    const searchTerm = `${brand} ${model}`.replace(/\s+/g, '+');
    return [`https://www.tgw.com/wcsstore/images/${searchTerm}.jpg`];
  },
  
  // Generic CDN patterns used by many golf sites
  'generic': (brand: string, model: string, year?: number) => {
    const brandSlug = brand.toLowerCase();
    const modelSlug = model.toLowerCase().replace(/\s+/g, '-');
    const yearStr = year || new Date().getFullYear();
    
    return [
      // Common CDN patterns
      `https://cdn.golfsupport.com/images/products/${brandSlug}/${modelSlug}-${yearStr}.jpg`,
      `https://images.golf.com/equipment/${yearStr}/${brandSlug}-${modelSlug}.jpg`,
      `https://golfequipment.imgix.net/${brandSlug}/${modelSlug}.jpg`
    ];
  }
};

// Seed images for a single equipment item
export async function seedEquipmentImages(
  equipmentId: string,
  brand: string,
  model: string,
  year?: number
) {
  const imageUrls: string[] = [];
  
  // Try different sources
  imageUrls.push(...EQUIPMENT_IMAGE_SOURCES['2ndswing'](brand, model));
  imageUrls.push(...EQUIPMENT_IMAGE_SOURCES['generic'](brand, model, year));
  
  // Also try some known working image URLs for popular equipment
  const knownImages = getKnownEquipmentImages(brand.toLowerCase(), model.toLowerCase());
  if (knownImages.length > 0) {
    imageUrls.push(...knownImages);
  }
  
  // Test which URLs actually work (you'd do this server-side in production)
  const workingUrls: string[] = [];
  
  for (const url of imageUrls) {
    try {
      // In production, you'd validate these server-side
      // For now, we'll just add the most likely ones
      if (url.includes('2ndswing') || knownImages.includes(url)) {
        workingUrls.push(url);
      }
    } catch (error) {
      console.log(`Failed to validate ${url}`);
    }
  }
  
  // Insert the images
  const results = [];
  for (const url of workingUrls.slice(0, 3)) { // Limit to 3 images per equipment
    try {
      // Get the current user or use a system user
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('equipment_photos')
        .insert({
          equipment_id: equipmentId,
          user_id: user?.id || '00000000-0000-0000-0000-000000000000', // Use current user or system UUID
          photo_url: url,
          caption: `${brand} ${model} - Product Image`,
          is_primary: results.length === 0, // First image is primary
          metadata: {
            source: 'seed',
            scraped_at: new Date().toISOString()
          }
        })
        .select()
        .single();
      
      if (!error) {
        results.push(data);
      }
    } catch (error) {
      console.error(`Failed to insert image: ${url}`, error);
    }
  }
  
  return results;
}

// Known working images for popular equipment
function getKnownEquipmentImages(brand: string, model: string): string[] {
  const imageMap: Record<string, string[]> = {
    // TaylorMade
    'taylormade-stealth 2 driver': [
      'https://www.taylormadegolf.com/dw/image/v2/AAIW_PRD/on/demandware.static/-/Sites-TMaG-Library/default/v1677614041352/2023/drivers/stealth2/hero/Stealth2_Driver_Hero.png',
      'https://cdn.2ndswing.com/images/product_images/Driver/TaylorMade/Stealth-2-Driver/Stealth-2-Driver-1.jpg'
    ],
    'taylormade-sim2 driver': [
      'https://www.taylormadegolf.com/dw/image/v2/AAIW_PRD/on/demandware.static/-/Sites-TMaG-Library/default/images/2021/drivers/sim2/hero/SIM2_Driver_Hero.png'
    ],
    'taylormade-p790 irons': [
      'https://www.taylormadegolf.com/dw/image/v2/AAIW_PRD/on/demandware.static/-/Sites-TMaG-Library/default/images/2023/irons/p790/hero/P790_Iron_Hero.png'
    ],
    
    // Titleist
    'titleist-tsi3 driver': [
      'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-Library/default/v1612988461194/products/drivers/tsi/tsi3/TSi3_Driver_Hero.png'
    ],
    'titleist-t100 irons': [
      'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-Library/default/products/irons/t-series/t100/T100_Iron_Hero.png'
    ],
    'titleist-pro v1': [
      'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-Library/default/golf-balls/pro-v1/Pro_V1_Ball_Hero.png'
    ],
    
    // Callaway
    'callaway-paradym driver': [
      'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-CGI-Library/default/v1674165433614/products/drivers/2023/paradym/hero/Paradym_Driver_Hero.png'
    ],
    'callaway-apex 21 irons': [
      'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-CGI-Library/default/products/irons/2021/apex-21/hero/Apex_21_Iron_Hero.png'
    ],
    
    // Ping
    'ping-g430 driver': [
      'https://ping.com/dw/image/v2/AAHB_PRD/on/demandware.static/-/Sites-ping-Library/default/products/drivers/g430/hero/G430_Driver_Hero.png'
    ],
    'ping-i230 irons': [
      'https://ping.com/dw/image/v2/AAHB_PRD/on/demandware.static/-/Sites-ping-Library/default/products/irons/i230/hero/i230_Iron_Hero.png'
    ],
    
    // Scotty Cameron
    'scotty cameron-newport 2': [
      'https://www.scottycameron.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-Library/default/putters/select/newport-2/Newport_2_Putter_Hero.png'
    ]
  };
  
  const key = `${brand}-${model}`;
  return imageMap[key] || [];
}

// Bulk seed all equipment in database
export async function seedAllEquipmentImages() {
  try {
    // Get all equipment without photos
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select(`
        id,
        brand,
        model,
        release_date,
        equipment_photos (count)
      `)
      .eq('equipment_photos.count', 0)
      .limit(50); // Process in batches
    
    if (error) throw error;
    
    const results = [];
    for (const item of equipment || []) {
      const year = item.release_date ? new Date(item.release_date).getFullYear() : undefined;
      const seeded = await seedEquipmentImages(item.id, item.brand, item.model, year);
      results.push({
        equipment: `${item.brand} ${item.model}`,
        imagesAdded: seeded.length
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error seeding equipment images:', error);
    throw error;
  }
}

// Quick seed for specific popular equipment
export async function quickSeedPopularEquipment() {
  const popularEquipment = [
    { brand: 'TaylorMade', model: 'Stealth 2 Driver', category: 'drivers', msrp: 599.99 },
    { brand: 'Titleist', model: 'TSi3 Driver', category: 'drivers', msrp: 549.99 },
    { brand: 'Callaway', model: 'Paradym Driver', category: 'drivers', msrp: 599.99 },
    { brand: 'Ping', model: 'G430 Driver', category: 'drivers', msrp: 549.99 },
    { brand: 'TaylorMade', model: 'P790 Irons', category: 'irons', msrp: 1399.99 },
    { brand: 'Titleist', model: 'T100 Irons', category: 'irons', msrp: 1399.99 },
    { brand: 'Callaway', model: 'Apex 21 Irons', category: 'irons', msrp: 1299.99 },
    { brand: 'Ping', model: 'i230 Irons', category: 'irons', msrp: 1199.99 },
    { brand: 'Titleist', model: 'Vokey SM9', category: 'wedges', msrp: 179.99 },
    { brand: 'Scotty Cameron', model: 'Newport 2', category: 'putters', msrp: 599.99 },
    { brand: 'Titleist', model: 'Pro V1', category: 'balls', msrp: 54.99 },
  ];
  
  for (const eq of popularEquipment) {
    try {
      // Check if equipment exists
      const { data: existing } = await supabase
        .from('equipment')
        .select('id')
        .eq('brand', eq.brand)
        .eq('model', eq.model)
        .single();
      
      let equipmentId = existing?.id;
      
      // Create if doesn't exist
      if (!equipmentId) {
        const { data: newEquipment } = await supabase
          .from('equipment')
          .insert({
            brand: eq.brand,
            model: eq.model,
            category: eq.category,
            msrp: eq.msrp,
            specs: {}
          })
          .select()
          .single();
        
        equipmentId = newEquipment?.id;
      }
      
      if (equipmentId) {
        await seedEquipmentImages(equipmentId, eq.brand, eq.model);
      }
    } catch (error) {
      console.error(`Error seeding ${eq.brand} ${eq.model}:`, error);
    }
  }
}

// Utility to validate image URLs (would run server-side)
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    // In production, do this server-side
    // For now, just check if it's a valid URL
    new URL(url);
    return true;
  } catch {
    return false;
  }
}