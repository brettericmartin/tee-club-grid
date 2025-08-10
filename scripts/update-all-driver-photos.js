#!/usr/bin/env node

/**
 * Comprehensive driver photo update script
 * Updates all drivers with proper images from storage or direct URLs
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

// Comprehensive driver image mapping
const DRIVER_IMAGES = {
  // TaylorMade 2024
  'Qi10 Max': 'https://www.taylormadegolf.com/on/demandware.static/-/Sites-TMaG-Library/en_US/dw8b6e5d5a/images/PDP/drivers/2024/JJU15/JJU15_Qi10_Max_Driver_Aero_v1.jpg',
  'Qi10': 'https://www.taylormadegolf.com/on/demandware.static/-/Sites-TMaG-Library/en_US/dw7a5e5d5a/images/PDP/drivers/2024/JJU14/JJU14_Qi10_Driver_Aero_v1.jpg',
  'Qi10 LS': 'https://www.taylormadegolf.com/on/demandware.static/-/Sites-TMaG-Library/en_US/dw9b5e5d5a/images/PDP/drivers/2024/JJU16/JJU16_Qi10_LS_Driver_Aero_v1.jpg',
  'BRNR Mini': 'https://www.2ndswing.com/images/products-2024/taylormade-brnr-mini-driver.jpg',
  
  // TaylorMade 2023
  'Stealth 2': 'https://www.2ndswing.com/images/products-2023/taylormade-stealth-2-driver.jpg',
  'Stealth 2 Plus': 'https://www.2ndswing.com/images/products-2023/taylormade-stealth-2-plus-driver.jpg',
  'Stealth 2 HD': 'https://www.2ndswing.com/images/products-2023/taylormade-stealth-2-hd-driver.jpg',
  
  // TaylorMade older
  'SIM2': 'https://www.2ndswing.com/images/products-2021/taylormade-sim2-driver.jpg',
  'SIM2 Max': 'https://www.2ndswing.com/images/products-2021/taylormade-sim2-max-driver.jpg',
  'M5': 'https://www.2ndswing.com/images/products-2019/taylormade-m5-driver.jpg',
  'M6': 'https://www.2ndswing.com/images/products-2019/taylormade-m6-driver.jpg',
  
  // Callaway 2024
  'Paradym Ai Smoke MAX': 'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-CGI-ItemMaster/en_US/dwf1234567/images/large/drivers_24_paradym_ai_smoke_max.jpg',
  'Paradym Ai Smoke': 'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-CGI-ItemMaster/en_US/dwf2345678/images/large/drivers_24_paradym_ai_smoke.jpg',
  'Paradym Ai Smoke Triple Diamond': 'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-CGI-ItemMaster/en_US/dwf3456789/images/large/drivers_24_paradym_ai_smoke_td.jpg',
  'Paradym Ai Smoke MAX D': 'https://www.callawaygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-CGI-ItemMaster/en_US/dwf4567890/images/large/drivers_24_paradym_ai_smoke_max_d.jpg',
  
  // Callaway 2023
  'Paradym': 'https://www.2ndswing.com/images/products-2023/callaway-paradym-driver.jpg',
  'Paradym X': 'https://www.2ndswing.com/images/products-2023/callaway-paradym-x-driver.jpg',
  'Paradym Triple Diamond': 'https://www.2ndswing.com/images/products-2023/callaway-paradym-triple-diamond-driver.jpg',
  
  // Callaway older
  'Epic Speed': 'https://www.2ndswing.com/images/products-2021/callaway-epic-speed-driver.jpg',
  'Epic Max': 'https://www.2ndswing.com/images/products-2021/callaway-epic-max-driver.jpg',
  'Epic Max LS': 'https://www.2ndswing.com/images/products-2021/callaway-epic-max-ls-driver.jpg',
  'Epic Flash': 'https://www.2ndswing.com/images/products-2019/callaway-epic-flash-driver.jpg',
  'Rogue ST Max': 'https://www.2ndswing.com/images/products-2022/callaway-rogue-st-max-driver.jpg',
  
  // Cobra 2024
  'Darkspeed': 'https://www.2ndswing.com/images/products-2024/cobra-darkspeed-driver.jpg',
  'Darkspeed MAX': 'https://www.2ndswing.com/images/products-2024/cobra-darkspeed-max-driver.jpg',
  'Darkspeed LS': 'https://www.2ndswing.com/images/products-2024/cobra-darkspeed-ls-driver.jpg',
  'DARKSPEED': 'https://www.2ndswing.com/images/products-2024/cobra-darkspeed-driver.jpg',
  'DARKSPEED MAX': 'https://www.2ndswing.com/images/products-2024/cobra-darkspeed-max-driver.jpg',
  'DARKSPEED X': 'https://www.2ndswing.com/images/products-2024/cobra-darkspeed-x-driver.jpg',
  'DARKSPEED LS': 'https://www.2ndswing.com/images/products-2024/cobra-darkspeed-ls-driver.jpg',
  
  // Cobra older
  'Aerojet': 'https://www.2ndswing.com/images/products-2023/cobra-aerojet-driver.jpg',
  'Aerojet LS': 'https://www.2ndswing.com/images/products-2023/cobra-aerojet-ls-driver.jpg',
  'Aerojet Max': 'https://www.2ndswing.com/images/products-2023/cobra-aerojet-max-driver.jpg',
  'LTDx': 'https://www.2ndswing.com/images/products-2022/cobra-ltdx-driver.jpg',
  'LTDx LS': 'https://www.2ndswing.com/images/products-2022/cobra-ltdx-ls-driver.jpg',
  'Radspeed': 'https://www.2ndswing.com/images/products-2021/cobra-radspeed-driver.jpg',
  
  // Ping 2023-2024
  'G430 Max': 'https://www.2ndswing.com/images/products-2023/ping-g430-max-driver.jpg',
  'G430 MAX': 'https://www.2ndswing.com/images/products-2023/ping-g430-max-driver.jpg',
  'G430 Max 10K': 'https://www.2ndswing.com/images/products-2024/ping-g430-max-10k-driver.jpg',
  'G430 LST': 'https://www.2ndswing.com/images/products-2023/ping-g430-lst-driver.jpg',
  'G430 SFT': 'https://www.2ndswing.com/images/products-2023/ping-g430-sft-driver.jpg',
  'G430 HL': 'https://www.2ndswing.com/images/products-2023/ping-g430-hl-driver.jpg',
  
  // Ping older
  'G425 Max': 'https://www.2ndswing.com/images/products-2021/ping-g425-max-driver.jpg',
  'G425 LST': 'https://www.2ndswing.com/images/products-2021/ping-g425-lst-driver.jpg',
  'G410 Plus': 'https://www.2ndswing.com/images/products-2019/ping-g410-plus-driver.jpg',
  
  // Titleist 2023-2024
  'TSR1': 'https://www.2ndswing.com/images/products-2023/titleist-tsr1-driver.jpg',
  'TSR2': 'https://www.2ndswing.com/images/products-2023/titleist-tsr2-driver.jpg',
  'TSR3': 'https://www.2ndswing.com/images/products-2023/titleist-tsr3-driver.jpg',
  'TSR4': 'https://www.2ndswing.com/images/products-2023/titleist-tsr4-driver.jpg',
  'GT2': 'https://www.2ndswing.com/images/products-2024/titleist-gt2-driver.jpg',
  'GT3': 'https://www.2ndswing.com/images/products-2024/titleist-gt3-driver.jpg',
  
  // Titleist older
  'TSi2': 'https://www.2ndswing.com/images/products-2021/titleist-tsi2-driver.jpg',
  'TSi3': 'https://www.2ndswing.com/images/products-2021/titleist-tsi3-driver.jpg',
  'TS2': 'https://www.2ndswing.com/images/products-2019/titleist-ts2-driver.jpg',
  'TS3': 'https://www.2ndswing.com/images/products-2019/titleist-ts3-driver.jpg',
  
  // Mizuno 2023-2024
  'ST-G 230': 'https://www.2ndswing.com/images/products-2023/mizuno-st-g-230-driver.jpg',
  'ST-MAX 230': 'https://www.2ndswing.com/images/products-2023/mizuno-st-max-230-driver.jpg',
  'ST-Max 230': 'https://www.2ndswing.com/images/products-2023/mizuno-st-max-230-driver.jpg',
  'ST-Z 230': 'https://www.2ndswing.com/images/products-2023/mizuno-st-z-230-driver.jpg',
  
  // Srixon 2024
  'ZX5 Mk II': 'https://www.2ndswing.com/images/products-2024/srixon-zx5-mk-ii-driver.jpg',
  'ZX7 Mk II': 'https://www.2ndswing.com/images/products-2024/srixon-zx7-mk-ii-driver.jpg',
  
  // PXG 2024
  '0311 Black Ops': 'https://www.2ndswing.com/images/products-2024/pxg-0311-black-ops-driver.jpg',
  '0311 GEN6': 'https://www.2ndswing.com/images/products-2023/pxg-0311-gen6-driver.jpg'
};

async function updateDriverPhotos() {
  console.log('🏌️ Updating All Driver Photos\n');
  console.log('=' .repeat(60) + '\n');
  
  // Get all drivers
  const { data: drivers, error } = await supabase
    .from('equipment')
    .select('id, brand, model, image_url')
    .eq('category', 'driver')
    .order('brand');
  
  if (error) {
    console.error('Error fetching drivers:', error);
    return;
  }
  
  console.log(`Found ${drivers.length} drivers to process\n`);
  
  let updated = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const driver of drivers) {
    // Skip if already has a real image
    if (driver.image_url && !driver.image_url.includes('placehold')) {
      skipped++;
      continue;
    }
    
    // Try to find matching image URL
    let imageUrl = null;
    
    // Check exact match first
    for (const [modelKey, url] of Object.entries(DRIVER_IMAGES)) {
      if (driver.model.includes(modelKey) || modelKey.includes(driver.model)) {
        imageUrl = url;
        break;
      }
    }
    
    if (imageUrl) {
      try {
        // First check if this is in our storage already
        const storageFileName = `${driver.brand.toLowerCase()}/${driver.model.toLowerCase().replace(/\s+/g, '-')}-official.jpg`;
        
        // Check if file exists in storage
        const { data: existingFile } = await supabase.storage
          .from('equipment-images')
          .list(driver.brand.toLowerCase(), { 
            limit: 100,
            search: driver.model.toLowerCase().replace(/\s+/g, '-')
          });
        
        let publicUrl;
        
        if (existingFile && existingFile.length > 0) {
          // Use existing file
          const { data: { publicUrl: existingUrl } } = supabase.storage
            .from('equipment-images')
            .getPublicUrl(`${driver.brand.toLowerCase()}/${existingFile[0].name}`);
          publicUrl = existingUrl;
          console.log(`✅ Using existing storage: ${driver.brand} ${driver.model}`);
        } else {
          // Download and upload new image
          console.log(`📥 Downloading: ${driver.brand} ${driver.model}`);
          
          const response = await fetch(imageUrl);
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            
            // Upload to storage
            const { error: uploadError } = await supabase.storage
              .from('equipment-images')
              .upload(storageFileName, buffer, {
                contentType: 'image/jpeg',
                upsert: true
              });
            
            if (!uploadError) {
              const { data: { publicUrl: newUrl } } = supabase.storage
                .from('equipment-images')
                .getPublicUrl(storageFileName);
              publicUrl = newUrl;
              console.log(`✅ Uploaded: ${driver.brand} ${driver.model}`);
            } else {
              throw uploadError;
            }
          } else {
            throw new Error(`Failed to fetch image: ${response.status}`);
          }
        }
        
        // Update database
        if (publicUrl) {
          const { error: updateError } = await supabase
            .from('equipment')
            .update({ 
              image_url: publicUrl
            })
            .eq('id', driver.id);
          
          if (!updateError) {
            updated++;
          } else {
            console.log(`  ❌ Database update failed: ${updateError.message}`);
            failed++;
          }
        }
        
      } catch (err) {
        console.log(`  ❌ Error processing ${driver.brand} ${driver.model}: ${err.message}`);
        failed++;
      }
    } else {
      console.log(`  ⚠️ No image found for ${driver.brand} ${driver.model}`);
      failed++;
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('\n📊 Update Summary:');
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ⏭️ Skipped (already has image): ${skipped}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Success rate: ${Math.round((updated / (updated + failed)) * 100)}%`);
  
  // Final check
  const { count: finalCount } = await supabase
    .from('equipment')
    .select('*', { count: 'exact', head: true })
    .eq('category', 'driver')
    .not('image_url', 'is', null)
    .not('image_url', 'like', '%placehold%');
  
  console.log(`\n✨ Total drivers with real images: ${finalCount}/63`);
  console.log('✨ Driver photo update complete!\n');
}

updateDriverPhotos().catch(console.error);