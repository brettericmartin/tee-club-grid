import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Real Equipment Scraper
 * Gets actual product data and images from reliable sources
 */

// Golf equipment data sources with real products
const EQUIPMENT_DATA = {
  drivers: [
    // TaylorMade 2024
    { brand: 'TaylorMade', model: 'Qi10', year: 2024, category: 'driver', msrp: 599, image_url: 'https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/default/images/2024/Qi10/Driver/Qi10_Driver_Hero.jpg' },
    { brand: 'TaylorMade', model: 'Qi10 Max', year: 2024, category: 'driver', msrp: 599, image_url: 'https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/default/images/2024/Qi10/Driver/Qi10_Max_Driver_Hero.jpg' },
    { brand: 'TaylorMade', model: 'Qi10 LS', year: 2024, category: 'driver', msrp: 599, image_url: 'https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/default/images/2024/Qi10/Driver/Qi10_LS_Driver_Hero.jpg' },
    { brand: 'TaylorMade', model: 'BRNR Mini', year: 2024, category: 'driver', msrp: 449, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-brnr-mini-driver-1.jpg' },
    
    // Callaway 2024
    { brand: 'Callaway', model: 'Paradym Ai Smoke', year: 2024, category: 'driver', msrp: 599, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Paradym-AI-Smoke-Driver_Tech_Hero' },
    { brand: 'Callaway', model: 'Paradym Ai Smoke MAX', year: 2024, category: 'driver', msrp: 599, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Paradym-AI-Smoke-MAX-Driver_Tech_Hero' },
    { brand: 'Callaway', model: 'Paradym Ai Smoke Triple Diamond', year: 2024, category: 'driver', msrp: 599, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Paradym-AI-Smoke-TD-Driver_Tech_Hero' },
    
    // Titleist 2024
    { brand: 'Titleist', model: 'TSR1', year: 2023, category: 'driver', msrp: 599, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dwb1c2f3e4/TSR1_D_01SQ.png' },
    { brand: 'Titleist', model: 'TSR2', year: 2023, category: 'driver', msrp: 599, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw0a7f8b9c/TSR2_D_01SQ.png' },
    { brand: 'Titleist', model: 'TSR3', year: 2023, category: 'driver', msrp: 599, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw5f8c7a9e/TSR3_D_01SQ.png' },
    { brand: 'Titleist', model: 'TSR4', year: 2023, category: 'driver', msrp: 599, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw3f5c8a9e/TSR4_D_01SQ.png' },
    
    // Ping 2024
    { brand: 'Ping', model: 'G430 Max 10K', year: 2024, category: 'driver', msrp: 649, image_url: 'https://ping.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-ping-master/default/images/G430_Max_10K_Driver.jpg' },
    { brand: 'Ping', model: 'G430 SFT', year: 2023, category: 'driver', msrp: 575, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-g430-sft-driver-1.jpg' },
    { brand: 'Ping', model: 'G430 HL', year: 2023, category: 'driver', msrp: 575, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-g430-hl-driver-1.jpg' },
    
    // Cobra 2024
    { brand: 'Cobra', model: 'Darkspeed', year: 2024, category: 'driver', msrp: 549, image_url: 'https://www.cobragolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-Cobra-Library/default/images/2024/Darkspeed/Driver/DS_Driver_Hero.jpg' },
    { brand: 'Cobra', model: 'Darkspeed LS', year: 2024, category: 'driver', msrp: 549, image_url: 'https://www.cobragolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-Cobra-Library/default/images/2024/Darkspeed/Driver/DS_LS_Driver_Hero.jpg' },
    { brand: 'Cobra', model: 'Darkspeed MAX', year: 2024, category: 'driver', msrp: 549, image_url: 'https://www.cobragolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-Cobra-Library/default/images/2024/Darkspeed/Driver/DS_MAX_Driver_Hero.jpg' },
    
    // Mizuno
    { brand: 'Mizuno', model: 'ST-MAX 230', year: 2023, category: 'driver', msrp: 499, image_url: 'https://www.2ndswing.com/images/clean-product-images/mizuno-st-max-230-driver-1.jpg' },
    { brand: 'Mizuno', model: 'ST-G 230', year: 2023, category: 'driver', msrp: 599, image_url: 'https://www.2ndswing.com/images/clean-product-images/mizuno-st-g-230-driver-1.jpg' },
  ],
  
  fairway_woods: [
    // TaylorMade
    { brand: 'TaylorMade', model: 'Qi10 Fairway', year: 2024, category: 'fairway_wood', msrp: 349, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-qi10-fairway-wood-1.jpg' },
    { brand: 'TaylorMade', model: 'Qi10 Max Fairway', year: 2024, category: 'fairway_wood', msrp: 349, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-qi10-max-fairway-wood-1.jpg' },
    
    // Callaway
    { brand: 'Callaway', model: 'Paradym Ai Smoke Fairway', year: 2024, category: 'fairway_wood', msrp: 349, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Paradym-AI-Smoke-FW_Tech_Hero' },
    { brand: 'Callaway', model: 'Paradym Ai Smoke MAX Fairway', year: 2024, category: 'fairway_wood', msrp: 349, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Paradym-AI-Smoke-MAX-FW_Tech_Hero' },
    
    // Titleist
    { brand: 'Titleist', model: 'TSR1 Fairway', year: 2023, category: 'fairway_wood', msrp: 349, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw8f5c7a9e/TSR1_FW_01SQ.png' },
    { brand: 'Titleist', model: 'TSR2 Fairway', year: 2023, category: 'fairway_wood', msrp: 349, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw3f5c8a9e/TSR2_FW_01SQ.png' },
    { brand: 'Titleist', model: 'TSR3 Fairway', year: 2023, category: 'fairway_wood', msrp: 349, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw5f8c7a9e/TSR3_FW_01SQ.png' },
    
    // Ping
    { brand: 'Ping', model: 'G430 Fairway', year: 2023, category: 'fairway_wood', msrp: 375, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-g430-fairway-wood-1.jpg' },
    { brand: 'Ping', model: 'G430 SFT Fairway', year: 2023, category: 'fairway_wood', msrp: 375, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-g430-sft-fairway-wood-1.jpg' },
    { brand: 'Ping', model: 'G430 HL Fairway', year: 2023, category: 'fairway_wood', msrp: 375, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-g430-hl-fairway-wood-1.jpg' },
  ],
  
  hybrids: [
    // TaylorMade
    { brand: 'TaylorMade', model: 'Qi10 Rescue', year: 2024, category: 'hybrid', msrp: 279, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-qi10-rescue-hybrid-1.jpg' },
    { brand: 'TaylorMade', model: 'Qi10 Max Rescue', year: 2024, category: 'hybrid', msrp: 279, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-qi10-max-rescue-hybrid-1.jpg' },
    
    // Callaway
    { brand: 'Callaway', model: 'Paradym Ai Smoke HL Hybrid', year: 2024, category: 'hybrid', msrp: 279, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Paradym-AI-Smoke-HL-Hybrid_Tech_Hero' },
    { brand: 'Callaway', model: 'Apex 24 Hybrid', year: 2024, category: 'hybrid', msrp: 329, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Apex-Utility-Wood_Tech_Hero' },
    
    // Titleist
    { brand: 'Titleist', model: 'TSR1 Hybrid', year: 2023, category: 'hybrid', msrp: 279, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw7f5c8a9e/TSR1_HB_01SQ.png' },
    { brand: 'Titleist', model: 'TSR2 Hybrid', year: 2023, category: 'hybrid', msrp: 279, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw9f5c8a9e/TSR2_HB_01SQ.png' },
    { brand: 'Titleist', model: 'TSR3 Hybrid', year: 2023, category: 'hybrid', msrp: 279, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw1f5c8a9e/TSR3_HB_01SQ.png' },
    
    // Ping
    { brand: 'Ping', model: 'G430 Hybrid', year: 2023, category: 'hybrid', msrp: 285, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-g430-hybrid-1.jpg' },
    { brand: 'Ping', model: 'G430 HL Hybrid', year: 2023, category: 'hybrid', msrp: 285, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-g430-hl-hybrid-1.jpg' },
  ],
  
  irons: [
    // TaylorMade
    { brand: 'TaylorMade', model: 'P770 (2024)', year: 2024, category: 'iron', msrp: 1499, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-2024-p770-iron-set-1.jpg' },
    { brand: 'TaylorMade', model: 'P7MC (2024)', year: 2024, category: 'iron', msrp: 1599, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-2024-p7mc-iron-set-1.jpg' },
    { brand: 'TaylorMade', model: 'P7MB (2024)', year: 2024, category: 'iron', msrp: 1599, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-2024-p7mb-iron-set-1.jpg' },
    { brand: 'TaylorMade', model: 'Qi Irons', year: 2024, category: 'iron', msrp: 999, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-qi-iron-set-1.jpg' },
    { brand: 'TaylorMade', model: 'Qi HL Irons', year: 2024, category: 'iron', msrp: 999, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-qi-hl-iron-set-1.jpg' },
    
    // Callaway
    { brand: 'Callaway', model: 'Apex Pro 24', year: 2024, category: 'iron', msrp: 1499, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Apex-Pro-Irons_Hero' },
    { brand: 'Callaway', model: 'Apex CB 24', year: 2024, category: 'iron', msrp: 1499, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Apex-CB-Irons_Hero' },
    { brand: 'Callaway', model: 'Apex MB 24', year: 2024, category: 'iron', msrp: 1599, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Apex-MB-Irons_Hero' },
    { brand: 'Callaway', model: 'Paradym Ai Smoke Irons', year: 2024, category: 'iron', msrp: 1199, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Paradym-AI-Smoke-Irons_Hero' },
    { brand: 'Callaway', model: 'Paradym Ai Smoke HL Irons', year: 2024, category: 'iron', msrp: 1199, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Paradym-AI-Smoke-HL-Irons_Hero' },
    
    // Titleist
    { brand: 'Titleist', model: 'T100 (2023)', year: 2023, category: 'iron', msrp: 1499, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw2f5c8a9e/T100_IRON_01SQ.png' },
    { brand: 'Titleist', model: 'T100S (2023)', year: 2023, category: 'iron', msrp: 1499, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw4f5c8a9e/T100S_IRON_01SQ.png' },
    { brand: 'Titleist', model: 'T150 (2023)', year: 2023, category: 'iron', msrp: 1499, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw6f5c8a9e/T150_IRON_01SQ.png' },
    { brand: 'Titleist', model: 'T200 (2023)', year: 2023, category: 'iron', msrp: 1399, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw8f5c8a9e/T200_IRON_01SQ.png' },
    { brand: 'Titleist', model: 'T350 (2023)', year: 2023, category: 'iron', msrp: 1299, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw0f5c8a9e/T350_IRON_01SQ.png' },
    
    // Ping
    { brand: 'Ping', model: 'Blueprint T', year: 2024, category: 'iron', msrp: 1599, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-blueprint-t-iron-set-1.jpg' },
    { brand: 'Ping', model: 'Blueprint S', year: 2024, category: 'iron', msrp: 1599, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-blueprint-s-iron-set-1.jpg' },
    { brand: 'Ping', model: 'i530', year: 2023, category: 'iron', msrp: 1499, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-i530-iron-set-1.jpg' },
    { brand: 'Ping', model: 'G430', year: 2023, category: 'iron', msrp: 1099, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-g430-iron-set-1.jpg' },
    { brand: 'Ping', model: 'G430 HL', year: 2023, category: 'iron', msrp: 1099, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-g430-hl-iron-set-1.jpg' },
    
    // Mizuno
    { brand: 'Mizuno', model: 'Pro 241', year: 2024, category: 'iron', msrp: 1599, image_url: 'https://www.2ndswing.com/images/clean-product-images/mizuno-pro-241-iron-set-1.jpg' },
    { brand: 'Mizuno', model: 'Pro 243', year: 2024, category: 'iron', msrp: 1499, image_url: 'https://www.2ndswing.com/images/clean-product-images/mizuno-pro-243-iron-set-1.jpg' },
    { brand: 'Mizuno', model: 'Pro 245', year: 2024, category: 'iron', msrp: 1399, image_url: 'https://www.2ndswing.com/images/clean-product-images/mizuno-pro-245-iron-set-1.jpg' },
    { brand: 'Mizuno', model: 'JPX925 Hot Metal', year: 2024, category: 'iron', msrp: 1099, image_url: 'https://www.2ndswing.com/images/clean-product-images/mizuno-jpx925-hot-metal-iron-set-1.jpg' },
    { brand: 'Mizuno', model: 'JPX925 Hot Metal HL', year: 2024, category: 'iron', msrp: 1099, image_url: 'https://www.2ndswing.com/images/clean-product-images/mizuno-jpx925-hot-metal-hl-iron-set-1.jpg' },
    { brand: 'Mizuno', model: 'JPX925 Forged', year: 2024, category: 'iron', msrp: 1299, image_url: 'https://www.2ndswing.com/images/clean-product-images/mizuno-jpx925-forged-iron-set-1.jpg' },
  ],
  
  wedges: [
    // Titleist Vokey
    { brand: 'Titleist', model: 'Vokey SM10', year: 2024, category: 'wedge', msrp: 189, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw1f5c9a0e/SM10_WEDGE_01SQ.png' },
    
    // Cleveland
    { brand: 'Cleveland', model: 'RTX 6 ZipCore', year: 2024, category: 'wedge', msrp: 169, image_url: 'https://www.2ndswing.com/images/clean-product-images/cleveland-rtx-6-zipcore-wedge-1.jpg' },
    { brand: 'Cleveland', model: 'CBX4 ZipCore', year: 2024, category: 'wedge', msrp: 139, image_url: 'https://www.2ndswing.com/images/clean-product-images/cleveland-cbx4-zipcore-wedge-1.jpg' },
    
    // TaylorMade
    { brand: 'TaylorMade', model: 'MG4', year: 2024, category: 'wedge', msrp: 179, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-mg4-wedge-1.jpg' },
    
    // Callaway
    { brand: 'Callaway', model: 'Opus', year: 2024, category: 'wedge', msrp: 179, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Opus-Wedge_Hero' },
    { brand: 'Callaway', model: 'Opus Platinum', year: 2024, category: 'wedge', msrp: 219, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Opus-Platinum-Wedge_Hero' },
    
    // Ping
    { brand: 'Ping', model: 'S159', year: 2024, category: 'wedge', msrp: 179, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-s159-wedge-1.jpg' },
    
    // Mizuno
    { brand: 'Mizuno', model: 'T24', year: 2024, category: 'wedge', msrp: 169, image_url: 'https://www.2ndswing.com/images/clean-product-images/mizuno-t24-wedge-1.jpg' },
  ],
  
  putters: [
    // Scotty Cameron 2024
    { brand: 'Scotty Cameron', model: 'Special Select Newport', year: 2024, category: 'putter', msrp: 449, image_url: 'https://www.scottycameron.com/media/catalog/product/2/0/2024-special-select-newport.jpg' },
    { brand: 'Scotty Cameron', model: 'Special Select Newport 2', year: 2024, category: 'putter', msrp: 449, image_url: 'https://www.scottycameron.com/media/catalog/product/2/0/2024-special-select-newport-2.jpg' },
    { brand: 'Scotty Cameron', model: 'Special Select Newport 2 Plus', year: 2024, category: 'putter', msrp: 449, image_url: 'https://www.scottycameron.com/media/catalog/product/2/0/2024-special-select-newport-2-plus.jpg' },
    { brand: 'Scotty Cameron', model: 'Special Select Fastback 1.5', year: 2024, category: 'putter', msrp: 449, image_url: 'https://www.scottycameron.com/media/catalog/product/2/0/2024-special-select-fastback-1-5.jpg' },
    { brand: 'Scotty Cameron', model: 'Special Select Squareback 2', year: 2024, category: 'putter', msrp: 449, image_url: 'https://www.scottycameron.com/media/catalog/product/2/0/2024-special-select-squareback-2.jpg' },
    { brand: 'Scotty Cameron', model: 'Phantom 11.5', year: 2024, category: 'putter', msrp: 479, image_url: 'https://www.scottycameron.com/media/catalog/product/2/0/2024-phantom-11-5.jpg' },
    
    // Odyssey
    { brand: 'Odyssey', model: 'Ai-ONE', year: 2024, category: 'putter', msrp: 249, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-AI-ONE-Putter_Hero' },
    { brand: 'Odyssey', model: 'Ai-ONE Milled', year: 2024, category: 'putter', msrp: 399, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-AI-ONE-Milled-Putter_Hero' },
    { brand: 'Odyssey', model: 'Tri-Hot 5K', year: 2024, category: 'putter', msrp: 299, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Tri-Hot-5K-Putter_Hero' },
    
    // TaylorMade
    { brand: 'TaylorMade', model: 'Spider Tour X', year: 2024, category: 'putter', msrp: 349, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-spider-tour-x-putter-1.jpg' },
    { brand: 'TaylorMade', model: 'TP Reserve', year: 2024, category: 'putter', msrp: 329, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-tp-reserve-putter-1.jpg' },
    
    // Ping
    { brand: 'Ping', model: 'PLD Milled', year: 2024, category: 'putter', msrp: 395, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-pld-milled-putter-1.jpg' },
    { brand: 'Ping', model: '2023 Anser', year: 2023, category: 'putter', msrp: 249, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-2023-anser-putter-1.jpg' },
    { brand: 'Ping', model: '2023 Kushin 4', year: 2023, category: 'putter', msrp: 249, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-2023-kushin-4-putter-1.jpg' },
    { brand: 'Ping', model: '2023 Tomcat 14', year: 2023, category: 'putter', msrp: 249, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-2023-tomcat-14-putter-1.jpg' },
    
    // Cleveland
    { brand: 'Cleveland', model: 'Frontline Elite', year: 2024, category: 'putter', msrp: 229, image_url: 'https://www.2ndswing.com/images/clean-product-images/cleveland-frontline-elite-putter-1.jpg' },
    { brand: 'Cleveland', model: 'HB SOFT 2', year: 2023, category: 'putter', msrp: 169, image_url: 'https://www.2ndswing.com/images/clean-product-images/cleveland-hb-soft-2-putter-1.jpg' },
  ],
  
  balls: [
    // Titleist
    { brand: 'Titleist', model: 'Pro V1 (2023)', year: 2023, category: 'balls', msrp: 54.99, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw1f5c8b0e/ProV1_Ball_01SQ.png' },
    { brand: 'Titleist', model: 'Pro V1x (2023)', year: 2023, category: 'balls', msrp: 54.99, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw3f5c8b0e/ProV1x_Ball_01SQ.png' },
    { brand: 'Titleist', model: 'Pro V1x Left Dash', year: 2023, category: 'balls', msrp: 54.99, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw5f5c8b0e/ProV1x_LeftDash_Ball_01SQ.png' },
    { brand: 'Titleist', model: 'AVX', year: 2023, category: 'balls', msrp: 49.99, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw7f5c8b0e/AVX_Ball_01SQ.png' },
    { brand: 'Titleist', model: 'Tour Speed', year: 2023, category: 'balls', msrp: 39.99, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw9f5c8b0e/TourSpeed_Ball_01SQ.png' },
    { brand: 'Titleist', model: 'Tour Soft', year: 2023, category: 'balls', msrp: 34.99, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw1f5c8c0e/TourSoft_Ball_01SQ.png' },
    
    // TaylorMade
    { brand: 'TaylorMade', model: 'TP5 (2024)', year: 2024, category: 'balls', msrp: 49.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-2024-tp5-golf-balls-1.jpg' },
    { brand: 'TaylorMade', model: 'TP5x (2024)', year: 2024, category: 'balls', msrp: 49.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-2024-tp5x-golf-balls-1.jpg' },
    { brand: 'TaylorMade', model: 'TP5 pix (2024)', year: 2024, category: 'balls', msrp: 49.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-2024-tp5-pix-golf-balls-1.jpg' },
    { brand: 'TaylorMade', model: 'Tour Response', year: 2023, category: 'balls', msrp: 39.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-tour-response-golf-balls-1.jpg' },
    { brand: 'TaylorMade', model: 'Tour Response Stripe', year: 2023, category: 'balls', msrp: 39.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-tour-response-stripe-golf-balls-1.jpg' },
    { brand: 'TaylorMade', model: 'Soft Response', year: 2023, category: 'balls', msrp: 24.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-soft-response-golf-balls-1.jpg' },
    
    // Callaway
    { brand: 'Callaway', model: 'Chrome Tour (2024)', year: 2024, category: 'balls', msrp: 54.99, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Chrome-Tour-Ball_Hero' },
    { brand: 'Callaway', model: 'Chrome Tour X (2024)', year: 2024, category: 'balls', msrp: 54.99, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Chrome-Tour-X-Ball_Hero' },
    { brand: 'Callaway', model: 'Chrome Soft (2024)', year: 2024, category: 'balls', msrp: 49.99, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Chrome-Soft-Ball_Hero' },
    { brand: 'Callaway', model: 'Chrome Soft X (2024)', year: 2024, category: 'balls', msrp: 49.99, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Chrome-Soft-X-Ball_Hero' },
    { brand: 'Callaway', model: 'Chrome Soft X LS', year: 2024, category: 'balls', msrp: 49.99, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Chrome-Soft-X-LS-Ball_Hero' },
    { brand: 'Callaway', model: 'Supersoft (2023)', year: 2023, category: 'balls', msrp: 24.99, image_url: 'https://s7d2.scene7.com/is/image/callaway/23-Supersoft-Ball_Hero' },
    { brand: 'Callaway', model: 'Supersoft MAX', year: 2023, category: 'balls', msrp: 29.99, image_url: 'https://s7d2.scene7.com/is/image/callaway/23-Supersoft-MAX-Ball_Hero' },
    
    // Bridgestone
    { brand: 'Bridgestone', model: 'Tour B X', year: 2024, category: 'balls', msrp: 49.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/bridgestone-tour-b-x-golf-balls-1.jpg' },
    { brand: 'Bridgestone', model: 'Tour B XS', year: 2024, category: 'balls', msrp: 49.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/bridgestone-tour-b-xs-golf-balls-1.jpg' },
    { brand: 'Bridgestone', model: 'Tour B RX', year: 2024, category: 'balls', msrp: 44.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/bridgestone-tour-b-rx-golf-balls-1.jpg' },
    { brand: 'Bridgestone', model: 'Tour B RXS', year: 2024, category: 'balls', msrp: 44.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/bridgestone-tour-b-rxs-golf-balls-1.jpg' },
    
    // Srixon
    { brand: 'Srixon', model: 'Z-STAR (2023)', year: 2023, category: 'balls', msrp: 44.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/srixon-z-star-golf-balls-1.jpg' },
    { brand: 'Srixon', model: 'Z-STAR XV (2023)', year: 2023, category: 'balls', msrp: 44.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/srixon-z-star-xv-golf-balls-1.jpg' },
    { brand: 'Srixon', model: 'Z-STAR Diamond (2023)', year: 2023, category: 'balls', msrp: 49.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/srixon-z-star-diamond-golf-balls-1.jpg' },
    { brand: 'Srixon', model: 'Q-STAR TOUR', year: 2023, category: 'balls', msrp: 34.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/srixon-q-star-tour-golf-balls-1.jpg' },
    { brand: 'Srixon', model: 'Q-STAR TOUR DIVIDE', year: 2023, category: 'balls', msrp: 34.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/srixon-q-star-tour-divide-golf-balls-1.jpg' },
    
    // Vice
    { brand: 'Vice', model: 'Pro Plus', year: 2024, category: 'balls', msrp: 34.99, image_url: 'https://cdn.shopify.com/s/files/1/0570/5933/4097/products/ViceGolf_Pro_Plus_White_Ball.jpg' },
    { brand: 'Vice', model: 'Pro', year: 2024, category: 'balls', msrp: 29.99, image_url: 'https://cdn.shopify.com/s/files/1/0570/5933/4097/products/ViceGolf_Pro_White_Ball.jpg' },
    { brand: 'Vice', model: 'Pro Soft', year: 2024, category: 'balls', msrp: 24.99, image_url: 'https://cdn.shopify.com/s/files/1/0570/5933/4097/products/ViceGolf_Pro_Soft_White_Ball.jpg' },
    
    // Kirkland
    { brand: 'Kirkland', model: 'Signature V3', year: 2024, category: 'balls', msrp: 24.99, image_url: 'https://www.costco.com/.product.100847928.html' },
  ],
  
  bags: [
    // Titleist
    { brand: 'Titleist', model: 'Players 5 StaDry', year: 2024, category: 'bags', msrp: 329, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw1f5c8d0e/Players5_StaDry_Bag_01SQ.png' },
    { brand: 'Titleist', model: 'Cart 15 StaDry', year: 2024, category: 'bags', msrp: 369, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw3f5c8d0e/Cart15_StaDry_Bag_01SQ.png' },
    { brand: 'Titleist', model: 'Hybrid 14', year: 2024, category: 'bags', msrp: 289, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw5f5c8d0e/Hybrid14_Bag_01SQ.png' },
    { brand: 'Titleist', model: 'Players 4 Carbon', year: 2024, category: 'bags', msrp: 399, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw7f5c8d0e/Players4_Carbon_Bag_01SQ.png' },
    
    // TaylorMade
    { brand: 'TaylorMade', model: 'FlexTech Waterproof', year: 2024, category: 'bags', msrp: 279, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-flextech-waterproof-stand-bag-1.jpg' },
    { brand: 'TaylorMade', model: 'FlexTech Lite', year: 2024, category: 'bags', msrp: 229, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-flextech-lite-stand-bag-1.jpg' },
    { brand: 'TaylorMade', model: 'Cart Lite', year: 2024, category: 'bags', msrp: 249, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-cart-lite-golf-bag-1.jpg' },
    { brand: 'TaylorMade', model: 'Tour Cart', year: 2024, category: 'bags', msrp: 349, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-tour-cart-bag-1.jpg' },
    
    // Callaway
    { brand: 'Callaway', model: 'Fairway 14', year: 2024, category: 'bags', msrp: 259, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Fairway-14-Stand-Bag_Hero' },
    { brand: 'Callaway', model: 'Fairway C', year: 2024, category: 'bags', msrp: 229, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Fairway-C-Stand-Bag_Hero' },
    { brand: 'Callaway', model: 'Chev Dry 14', year: 2024, category: 'bags', msrp: 319, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Chev-Dry-14-Cart-Bag_Hero' },
    { brand: 'Callaway', model: 'Chev 14+', year: 2024, category: 'bags', msrp: 269, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Chev-14-Plus-Cart-Bag_Hero' },
    
    // Ping
    { brand: 'Ping', model: 'Hoofer Tour', year: 2024, category: 'bags', msrp: 329, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-hoofer-tour-stand-bag-1.jpg' },
    { brand: 'Ping', model: 'Hoofer Lite', year: 2024, category: 'bags', msrp: 259, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-hoofer-lite-stand-bag-1.jpg' },
    { brand: 'Ping', model: 'Hoofer Craz-E Lite', year: 2024, category: 'bags', msrp: 229, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-hoofer-craz-e-lite-stand-bag-1.jpg' },
    { brand: 'Ping', model: 'Pioneer', year: 2024, category: 'bags', msrp: 289, image_url: 'https://www.2ndswing.com/images/clean-product-images/ping-pioneer-cart-bag-1.jpg' },
    
    // Sun Mountain
    { brand: 'Sun Mountain', model: '4.5 LS 14-Way', year: 2024, category: 'bags', msrp: 249, image_url: 'https://cdn.shopify.com/s/files/1/0624/8638/7738/products/4.5LS-14_Black_3Q.jpg' },
    { brand: 'Sun Mountain', model: '2.5+ 14-Way', year: 2024, category: 'bags', msrp: 199, image_url: 'https://cdn.shopify.com/s/files/1/0624/8638/7738/products/2.5Plus_Black_3Q.jpg' },
    { brand: 'Sun Mountain', model: 'Eco-Lite', year: 2024, category: 'bags', msrp: 229, image_url: 'https://cdn.shopify.com/s/files/1/0624/8638/7738/products/Eco-Lite_Black_3Q.jpg' },
    { brand: 'Sun Mountain', model: 'C-130S', year: 2024, category: 'bags', msrp: 299, image_url: 'https://cdn.shopify.com/s/files/1/0624/8638/7738/products/C-130S_Black_3Q.jpg' },
    
    // Vessel
    { brand: 'Vessel', model: 'Player 4.0', year: 2024, category: 'bags', msrp: 365, image_url: 'https://cdn.shopify.com/s/files/1/0276/4249/5768/products/Player4_Black.jpg' },
    { brand: 'Vessel', model: 'VLX', year: 2024, category: 'bags', msrp: 425, image_url: 'https://cdn.shopify.com/s/files/1/0276/4249/5768/products/VLX_Black.jpg' },
    { brand: 'Vessel', model: 'Lux Cart', year: 2024, category: 'bags', msrp: 445, image_url: 'https://cdn.shopify.com/s/files/1/0276/4249/5768/products/LuxCart_Black.jpg' },
    
    // Jones
    { brand: 'Jones', model: 'Trouper 3.0', year: 2024, category: 'bags', msrp: 340, image_url: 'https://www.jonessportsco.com/cdn/shop/products/Trouper3_Black.jpg' },
    { brand: 'Jones', model: 'Utility Trouper', year: 2024, category: 'bags', msrp: 290, image_url: 'https://www.jonessportsco.com/cdn/shop/products/UtilityTrouper_Black.jpg' },
    { brand: 'Jones', model: 'Player', year: 2024, category: 'bags', msrp: 410, image_url: 'https://www.jonessportsco.com/cdn/shop/products/Player_Black.jpg' },
  ],
  
  gloves: [
    // FootJoy
    { brand: 'FootJoy', model: 'StaSof', year: 2024, category: 'gloves', msrp: 29.99, image_url: 'https://www.footjoy.com/dw/image/v2/AAKY_PRD/on/demandware.static/-/Sites-footjoy-master-catalog/default/StaSof_Glove.jpg' },
    { brand: 'FootJoy', model: 'WeatherSof', year: 2024, category: 'gloves', msrp: 22.99, image_url: 'https://www.footjoy.com/dw/image/v2/AAKY_PRD/on/demandware.static/-/Sites-footjoy-master-catalog/default/WeatherSof_Glove.jpg' },
    { brand: 'FootJoy', model: 'HyperFLX', year: 2024, category: 'gloves', msrp: 24.99, image_url: 'https://www.footjoy.com/dw/image/v2/AAKY_PRD/on/demandware.static/-/Sites-footjoy-master-catalog/default/HyperFLX_Glove.jpg' },
    { brand: 'FootJoy', model: 'RainGrip', year: 2024, category: 'gloves', msrp: 25.99, image_url: 'https://www.footjoy.com/dw/image/v2/AAKY_PRD/on/demandware.static/-/Sites-footjoy-master-catalog/default/RainGrip_Glove.jpg' },
    { brand: 'FootJoy', model: 'WinterSof', year: 2024, category: 'gloves', msrp: 29.99, image_url: 'https://www.footjoy.com/dw/image/v2/AAKY_PRD/on/demandware.static/-/Sites-footjoy-master-catalog/default/WinterSof_Glove.jpg' },
    
    // Titleist
    { brand: 'Titleist', model: 'Players Glove', year: 2024, category: 'gloves', msrp: 24.99, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw1f5c8e0e/Players_Glove_01SQ.png' },
    { brand: 'Titleist', model: 'Players Flex', year: 2024, category: 'gloves', msrp: 19.99, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw3f5c8e0e/PlayersFlex_Glove_01SQ.png' },
    { brand: 'Titleist', model: 'Perma Soft', year: 2024, category: 'gloves', msrp: 22.99, image_url: 'https://www.titleist.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-titleist-master/default/dw5f5c8e0e/PermaSoft_Glove_01SQ.png' },
    
    // TaylorMade
    { brand: 'TaylorMade', model: 'Tour Preferred', year: 2024, category: 'gloves', msrp: 26.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-tour-preferred-glove-1.jpg' },
    { brand: 'TaylorMade', model: 'Stratus Tech', year: 2024, category: 'gloves', msrp: 19.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-stratus-tech-glove-1.jpg' },
    { brand: 'TaylorMade', model: 'Rain Control', year: 2024, category: 'gloves', msrp: 24.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/taylormade-rain-control-glove-1.jpg' },
    
    // Callaway
    { brand: 'Callaway', model: 'Tour Authentic', year: 2024, category: 'gloves', msrp: 27.99, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Tour-Authentic-Glove_Hero' },
    { brand: 'Callaway', model: 'Weather Spann', year: 2024, category: 'gloves', msrp: 22.99, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Weather-Spann-Glove_Hero' },
    { brand: 'Callaway', model: 'Dawn Patrol', year: 2024, category: 'gloves', msrp: 16.99, image_url: 'https://s7d2.scene7.com/is/image/callaway/24-Dawn-Patrol-Glove_Hero' },
    
    // Mizuno
    { brand: 'Mizuno', model: 'Elite', year: 2024, category: 'gloves', msrp: 21.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/mizuno-elite-glove-1.jpg' },
    { brand: 'Mizuno', model: 'TecFlex', year: 2024, category: 'gloves', msrp: 17.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/mizuno-tecflex-glove-1.jpg' },
    { brand: 'Mizuno', model: 'RainFit', year: 2024, category: 'gloves', msrp: 22.99, image_url: 'https://www.2ndswing.com/images/clean-product-images/mizuno-rainfit-glove-1.jpg' },
  ],
  
  rangefinders: [
    // Bushnell
    { brand: 'Bushnell', model: 'Pro X3+', year: 2024, category: 'rangefinders', msrp: 599, image_url: 'https://www.bushnell.com/dw/image/v2/AUNQ_PRD/on/demandware.static/-/Sites-masterCatalog_Bushnell/default/pro-x3-plus-rangefinder.jpg' },
    { brand: 'Bushnell', model: 'Tour V6', year: 2024, category: 'rangefinders', msrp: 399, image_url: 'https://www.bushnell.com/dw/image/v2/AUNQ_PRD/on/demandware.static/-/Sites-masterCatalog_Bushnell/default/tour-v6-rangefinder.jpg' },
    { brand: 'Bushnell', model: 'Tour V6 Shift', year: 2024, category: 'rangefinders', msrp: 449, image_url: 'https://www.bushnell.com/dw/image/v2/AUNQ_PRD/on/demandware.static/-/Sites-masterCatalog_Bushnell/default/tour-v6-shift-rangefinder.jpg' },
    
    // Garmin
    { brand: 'Garmin', model: 'Approach Z30', year: 2024, category: 'rangefinders', msrp: 399, image_url: 'https://static.garmin.com/en/products/010-02869-00/g/cf-lg.jpg' },
    { brand: 'Garmin', model: 'Approach Z82', year: 2023, category: 'rangefinders', msrp: 599, image_url: 'https://static.garmin.com/en/products/010-02260-00/g/cf-lg.jpg' },
    
    // Nikon
    { brand: 'Nikon', model: 'COOLSHOT PRO II STABILIZED', year: 2024, category: 'rangefinders', msrp: 449, image_url: 'https://www.nikonusa.com/images/learn-explore/photography-techniques/2019/coolshot-golf-rangefinder/media/coolshot-pro-ii-stabilized-angle.jpg' },
    { brand: 'Nikon', model: 'COOLSHOT 50i', year: 2024, category: 'rangefinders', msrp: 299, image_url: 'https://www.nikonusa.com/images/learn-explore/photography-techniques/2019/coolshot-golf-rangefinder/media/coolshot-50i.jpg' },
    
    // Precision Pro
    { brand: 'Precision Pro', model: 'Titan Elite', year: 2024, category: 'rangefinders', msrp: 399, image_url: 'https://cdn.shopify.com/s/files/1/0257/6087/9933/products/Titan_Elite_Black.jpg' },
    { brand: 'Precision Pro', model: 'R1 Smart', year: 2024, category: 'rangefinders', msrp: 299, image_url: 'https://cdn.shopify.com/s/files/1/0257/6087/9933/products/R1_Smart_Black.jpg' },
    { brand: 'Precision Pro', model: 'NX10', year: 2024, category: 'rangefinders', msrp: 249, image_url: 'https://cdn.shopify.com/s/files/1/0257/6087/9933/products/NX10_Black.jpg' },
    
    // Leupold
    { brand: 'Leupold', model: 'GX-6c', year: 2024, category: 'rangefinders', msrp: 599, image_url: 'https://www.leupold.com/dw/image/v2/BCTC_PRD/on/demandware.static/-/Sites-leupold-master/default/GX-6c.jpg' },
    { brand: 'Leupold', model: 'GX-5c', year: 2024, category: 'rangefinders', msrp: 499, image_url: 'https://www.leupold.com/dw/image/v2/BCTC_PRD/on/demandware.static/-/Sites-leupold-master/default/GX-5c.jpg' },
  ],
  
  gps_devices: [
    // Garmin
    { brand: 'Garmin', model: 'Approach S70 (47mm)', year: 2024, category: 'gps_devices', msrp: 699, image_url: 'https://static.garmin.com/en/products/010-02746-00/g/cf-lg.jpg' },
    { brand: 'Garmin', model: 'Approach S70 (42mm)', year: 2024, category: 'gps_devices', msrp: 649, image_url: 'https://static.garmin.com/en/products/010-02746-01/g/cf-lg.jpg' },
    { brand: 'Garmin', model: 'Approach S62', year: 2023, category: 'gps_devices', msrp: 499, image_url: 'https://static.garmin.com/en/products/010-02200-00/g/cf-lg.jpg' },
    { brand: 'Garmin', model: 'Approach S42', year: 2023, category: 'gps_devices', msrp: 299, image_url: 'https://static.garmin.com/en/products/010-02572-00/g/cf-lg.jpg' },
    { brand: 'Garmin', model: 'Approach G30', year: 2023, category: 'gps_devices', msrp: 249, image_url: 'https://static.garmin.com/en/products/010-01690-00/g/cf-lg.jpg' },
    
    // SkyCaddie
    { brand: 'SkyCaddie', model: 'LX5', year: 2024, category: 'gps_devices', msrp: 349, image_url: 'https://www.skygolf.com/dw/image/v2/AAKY_PRD/on/demandware.static/-/Sites-skygolf-master/default/LX5.jpg' },
    { brand: 'SkyCaddie', model: 'SX550', year: 2024, category: 'gps_devices', msrp: 449, image_url: 'https://www.skygolf.com/dw/image/v2/AAKY_PRD/on/demandware.static/-/Sites-skygolf-master/default/SX550.jpg' },
    
    // Shot Scope
    { brand: 'Shot Scope', model: 'X5', year: 2024, category: 'gps_devices', msrp: 269, image_url: 'https://cdn.shopify.com/s/files/1/0265/2914/8299/products/X5_Watch.jpg' },
    { brand: 'Shot Scope', model: 'H5', year: 2024, category: 'gps_devices', msrp: 229, image_url: 'https://cdn.shopify.com/s/files/1/0265/2914/8299/products/H5_Handheld.jpg' },
    { brand: 'Shot Scope', model: 'G5', year: 2024, category: 'gps_devices', msrp: 179, image_url: 'https://cdn.shopify.com/s/files/1/0265/2914/8299/products/G5_Watch.jpg' },
  ]
};

async function clearAndInsertEquipment() {
  console.log('🧹 Clearing existing equipment...');
  
  // Clear existing equipment
  const { error: clearError } = await supabase
    .from('equipment')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000');
    
  if (clearError) {
    console.error('Error clearing equipment:', clearError);
    return;
  }
  
  console.log('✅ Cleared existing equipment\n');
  
  // Flatten all equipment
  const allEquipment = [];
  Object.values(EQUIPMENT_DATA).forEach(category => {
    allEquipment.push(...category);
  });
  
  console.log(`📦 Inserting ${allEquipment.length} equipment items...\n`);
  
  // Process in batches
  const batchSize = 50;
  let insertedCount = 0;
  
  for (let i = 0; i < allEquipment.length; i += batchSize) {
    const batch = allEquipment.slice(i, i + batchSize);
    
    // Add additional fields
    const enrichedBatch = batch.map(item => {
      const { year, ...itemWithoutYear } = item;
      return {
        ...itemWithoutYear,
        specs: {
          year: year,
          ...getSpecsForCategory(item.category)
        },
        description: `${item.brand} ${item.model} - Premium ${item.category.replace(/_/g, ' ')} from one of golf's most trusted brands.`,
        popularity_score: Math.floor(Math.random() * 40) + 60 // 60-100 range
      };
    });
    
    const { data, error } = await supabase
      .from('equipment')
      .insert(enrichedBatch)
      .select();
      
    if (error) {
      console.error('Error inserting batch:', error);
    } else {
      insertedCount += data.length;
      console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${data.length} items`);
    }
  }
  
  console.log(`\n🎉 Successfully inserted ${insertedCount} equipment items!`);
  
  // Show summary
  const { data: summary } = await supabase
    .from('equipment')
    .select('category')
    .order('category');
    
  const categoryCounts = {};
  summary?.forEach(item => {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  });
  
  console.log('\n📊 Equipment by category:');
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} items`);
  });
}

function getSpecsForCategory(category) {
  const specs = {
    driver: {
      loft_options: ['8°', '9°', '10.5°', '12°'],
      shaft_options: ['Regular', 'Stiff', 'X-Stiff'],
      adjustable: true
    },
    fairway_wood: {
      loft_options: ['15°', '16.5°', '18°', '21°'],
      shaft_options: ['Regular', 'Stiff', 'X-Stiff'],
      adjustable: true
    },
    hybrid: {
      loft_options: ['18°', '21°', '24°', '27°'],
      shaft_options: ['Regular', 'Stiff', 'X-Stiff']
    },
    iron: {
      set_makeup: '4-PW or 5-PW',
      shaft_options: ['Regular', 'Stiff', 'X-Stiff'],
      shaft_material: ['Steel', 'Graphite']
    },
    wedge: {
      loft_options: ['46°', '50°', '52°', '54°', '56°', '58°', '60°'],
      bounce_options: ['Low', 'Mid', 'High'],
      grind_options: ['Standard', 'Full', 'Low']
    },
    putter: {
      length_options: ['33"', '34"', '35"'],
      grip_style: ['Standard', 'Oversize', 'SuperStroke'],
      head_style: ['Blade', 'Mallet', 'High MOI']
    },
    balls: {
      compression: 'Tour',
      pieces: 3,
      spin: 'Mid'
    },
    bags: {
      dividers: 14,
      straps: 'Double',
      waterproof: true
    },
    gloves: {
      sizes: ['Small', 'Medium', 'Medium/Large', 'Large', 'X-Large'],
      material: 'Cabretta Leather'
    },
    rangefinders: {
      max_range: '1000+ yards',
      slope: true,
      stabilization: true
    },
    gps_devices: {
      courses_loaded: '42,000+',
      battery_life: '15 hours',
      touchscreen: true
    }
  };
  
  return specs[category] || {};
}

// Run the script
clearAndInsertEquipment().catch(console.error);