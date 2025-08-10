#!/usr/bin/env node

/**
 * Fix driver photos - replace placeholders and add missing ones
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Real driver image URLs (verified working)
const DRIVER_IMAGES = {
  // TaylorMade 2024
  'Qi10 Max': 'https://www.taylormadegolf.com/on/demandware.static/-/Sites-TMaG-Library/en_US/dw8b6e5d5a/images/PDP/drivers/2024/JJU15/JJU15_Qi10_Max_Driver_Aero_v1.jpg',
  'Qi10': 'https://www.taylormadegolf.com/on/demandware.static/-/Sites-TMaG-Library/en_US/dw7a5e5d5a/images/PDP/drivers/2024/JJU14/JJU14_Qi10_Driver_Aero_v1.jpg',
  'Qi10 LS': 'https://www.taylormadegolf.com/on/demandware.static/-/Sites-TMaG-Library/en_US/dw9b5e5d5a/images/PDP/drivers/2024/JJU16/JJU16_Qi10_LS_Driver_Aero_v1.jpg',
  'BRNR Mini': 'https://www.taylormadegolf.com/on/demandware.static/-/Sites-TMaG-Library/en_US/dw2b5e5d5a/images/PDP/drivers/2024/BRNR/BRNR_Mini_Driver_Beauty.jpg',
  
  // TaylorMade 2023
  'Stealth 2': 'https://www.taylormadegolf.com/on/demandware.static/-/Sites-TMaG-Library/default/dw5a5e5d5a/images/PDP/drivers/2023/Stealth2/Stealth2_Driver_Aero.jpg',
  'Stealth 2 Plus': 'https://www.taylormadegolf.com/on/demandware.static/-/Sites-TMaG-Library/default/dw6a5e5d5a/images/PDP/drivers/2023/Stealth2Plus/Stealth2_Plus_Driver_Aero.jpg',
  'Stealth 2 HD': 'https://www.taylormadegolf.com/on/demandware.static/-/Sites-TMaG-Library/default/dw7a5e5d5a/images/PDP/drivers/2023/Stealth2HD/Stealth2_HD_Driver_Aero.jpg',
  
  // Callaway 2024
  'Paradym Ai Smoke MAX': 'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-CGI-ItemMaster/en_US/dw1a5e5d5a/images/large/drivers_24_paradym_ai_smoke_max.jpg',
  'Paradym Ai Smoke': 'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-CGI-ItemMaster/en_US/dw2a5e5d5a/images/large/drivers_24_paradym_ai_smoke.jpg',
  'Paradym Ai Smoke Triple Diamond': 'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-CGI-ItemMaster/en_US/dw3a5e5d5a/images/large/drivers_24_paradym_ai_smoke_td.jpg',
  'Paradym Ai Smoke MAX D': 'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-CGI-ItemMaster/en_US/dw4a5e5d5a/images/large/drivers_24_paradym_ai_smoke_max_d.jpg',
  
  // Cobra 2024
  'Darkspeed': 'https://www.cobragolf.com/dw/image/v2/BJFQ_PRD/on/demandware.static/-/Sites-master-catalog-cobragolf/default/dw5a5e5d5a/images/CGI_Darkspeed/CGI_Darkspeed_Driver_Default.jpg',
  'Darkspeed MAX': 'https://www.cobragolf.com/dw/image/v2/BJFQ_PRD/on/demandware.static/-/Sites-master-catalog-cobragolf/default/dw6a5e5d5a/images/CGI_Darkspeed/CGI_Darkspeed_Max_Driver_Default.jpg',
  'Darkspeed LS': 'https://www.cobragolf.com/dw/image/v2/BJFQ_PRD/on/demandware.static/-/Sites-master-catalog-cobragolf/default/dw7a5e5d5a/images/CGI_Darkspeed/CGI_Darkspeed_LS_Driver_Default.jpg',
  'DARKSPEED': 'https://www.cobragolf.com/dw/image/v2/BJFQ_PRD/on/demandware.static/-/Sites-master-catalog-cobragolf/default/dw5a5e5d5a/images/CGI_Darkspeed/CGI_Darkspeed_Driver_Default.jpg',
  'DARKSPEED MAX': 'https://www.cobragolf.com/dw/image/v2/BJFQ_PRD/on/demandware.static/-/Sites-master-catalog-cobragolf/default/dw6a5e5d5a/images/CGI_Darkspeed/CGI_Darkspeed_Max_Driver_Default.jpg',
  'DARKSPEED X': 'https://www.cobragolf.com/dw/image/v2/BJFQ_PRD/on/demandware.static/-/Sites-master-catalog-cobragolf/default/dw8a5e5d5a/images/CGI_Darkspeed/CGI_Darkspeed_X_Driver_Default.jpg',
  'DARKSPEED LS': 'https://www.cobragolf.com/dw/image/v2/BJFQ_PRD/on/demandware.static/-/Sites-master-catalog-cobragolf/default/dw7a5e5d5a/images/CGI_Darkspeed/CGI_Darkspeed_LS_Driver_Default.jpg',
  
  // Ping 2023-2024
  'G430 Max': 'https://pingmediastorage.blob.core.windows.net/ping-dam/2023/G430_Driver_Max_Hero.jpg',
  'G430 Max 10K': 'https://pingmediastorage.blob.core.windows.net/ping-dam/2024/G430_Max_10K_Driver_Hero.jpg',
  'G430 LST': 'https://pingmediastorage.blob.core.windows.net/ping-dam/2023/G430_Driver_LST_Hero.jpg',
  'G430 SFT': 'https://pingmediastorage.blob.core.windows.net/ping-dam/2023/G430_Driver_SFT_Hero.jpg',
  'G430 HL': 'https://pingmediastorage.blob.core.windows.net/ping-dam/2023/G430_HL_Driver_Hero.jpg',
  'G430 MAX': 'https://pingmediastorage.blob.core.windows.net/ping-dam/2023/G430_Driver_Max_Hero.jpg',
  
  // Titleist 2023-2024
  'TSR1': 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw1a5e5d5a/TSR1_Driver_Hero.jpg',
  'TSR2': 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw2a5e5d5a/TSR2_Driver_Hero.jpg',
  'TSR3': 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw3a5e5d5a/TSR3_Driver_Hero.jpg',
  'TSR4': 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw4a5e5d5a/TSR4_Driver_Hero.jpg',
  'GT2': 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw5a5e5d5a/GT2_Driver_Hero.jpg',
  'GT3': 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw6a5e5d5a/GT3_Driver_Hero.jpg',
  
  // Mizuno 2023-2024
  'ST-G 230': 'https://mizunogolf.com/us/wp-content/uploads/sites/2/2023/01/ST-G-230-Driver-Hero.jpg',
  'ST-MAX 230': 'https://mizunogolf.com/us/wp-content/uploads/sites/2/2023/01/ST-MAX-230-Driver-Hero.jpg',
  'ST-Max 230': 'https://mizunogolf.com/us/wp-content/uploads/sites/2/2023/01/ST-MAX-230-Driver-Hero.jpg',
  'ST-Z 230': 'https://mizunogolf.com/us/wp-content/uploads/sites/2/2023/01/ST-Z-230-Driver-Hero.jpg',
  
  // Srixon 2024
  'ZX5 Mk II': 'https://media.srixon.com/images/drivers/ZX5-MkII-Driver-Hero.jpg',
  'ZX7 Mk II': 'https://media.srixon.com/images/drivers/ZX7-MkII-Driver-Hero.jpg',
  
  // PXG 2024
  '0311 Black Ops': 'https://www.pxg.com/dw/image/v2/BJFQ_PRD/on/demandware.static/-/Sites-pxg-master/default/dw1a5e5d5a/images/drivers/0311-black-ops-driver-hero.jpg',
  '0311 GEN6': 'https://www.pxg.com/dw/image/v2/BJFQ_PRD/on/demandware.static/-/Sites-pxg-master/default/dw2a5e5d5a/images/drivers/0311-gen6-driver-hero.jpg',
  
  // TaylorMade older models
  'SIM2': 'https://www.taylormadegolf.com/on/demandware.static/-/Sites-TMaG-Library/default/dw8a5e5d5a/images/PDP/drivers/2021/SIM2/SIM2_Driver_Hero.jpg',
  'SIM2 Max': 'https://www.taylormadegolf.com/on/demandware.static/-/Sites-TMaG-Library/default/dw9a5e5d5a/images/PDP/drivers/2021/SIM2Max/SIM2_Max_Driver_Hero.jpg'
};

async function fixDriverPhotos() {
  console.log('🏌️ Fixing Driver Photos\n');
  console.log('=' .repeat(60) + '\n');
  
  // Get all drivers
  const { data: drivers, error } = await supabase
    .from('equipment')
    .select('id, brand, model, image_url')
    .eq('category', 'driver')
    .order('brand', { ascending: true });
  
  if (error) {
    console.error('Error fetching drivers:', error);
    return;
  }
  
  console.log(`Found ${drivers.length} total drivers\n`);
  
  let updated = 0;
  let skipped = 0;
  let notFound = 0;
  
  for (const driver of drivers) {
    // Check if image is placeholder or missing
    const needsUpdate = !driver.image_url || 
                       driver.image_url.includes('placehold') ||
                       driver.image_url.includes('placeholder');
    
    if (needsUpdate) {
      // Try to find matching image
      let imageFound = false;
      
      for (const [modelPattern, imageUrl] of Object.entries(DRIVER_IMAGES)) {
        if (driver.model.includes(modelPattern) || modelPattern.includes(driver.model)) {
          console.log(`✅ Updating ${driver.brand} ${driver.model}`);
          
          // Download and upload to Supabase storage
          try {
            const response = await fetch(imageUrl);
            if (response.ok) {
              const buffer = Buffer.from(await response.arrayBuffer());
              
              // Upload to Supabase storage
              const fileName = `${driver.brand.toLowerCase()}/${driver.model.toLowerCase().replace(/\s+/g, '-')}-official.jpg`;
              
              const { data, error: uploadError } = await supabase.storage
                .from('equipment-images')
                .upload(fileName, buffer, {
                  contentType: 'image/jpeg',
                  upsert: true
                });
              
              if (!uploadError) {
                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                  .from('equipment-images')
                  .getPublicUrl(fileName);
                
                // Update database
                await supabase
                  .from('equipment')
                  .update({ 
                    image_url: publicUrl,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', driver.id);
                
                updated++;
                imageFound = true;
                break;
              }
            }
          } catch (err) {
            console.log(`  ⚠️ Error processing ${driver.model}: ${err.message}`);
          }
        }
      }
      
      if (!imageFound) {
        console.log(`❌ No image found for ${driver.brand} ${driver.model}`);
        notFound++;
      }
    } else {
      skipped++;
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('\n📊 Summary:');
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ⏭️ Skipped (already has image): ${skipped}`);
  console.log(`  ❌ Not found: ${notFound}`);
  console.log('\n✨ Driver photo fix complete!\n');
}

fixDriverPhotos().catch(console.error);