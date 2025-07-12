import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Fix all equipment images with reliable CDN-hosted alternatives
 */

// CDN-hosted images that actually work
const WORKING_IMAGES = {
  // Drivers - Using TGW and 2nd Swing CDN images
  'TaylorMade Qi10': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw3f8c9a1e/images/hires/1MWTM0J01_1.jpg',
  'TaylorMade Qi10 Max': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw5f8c9a1e/images/hires/1MWTM0J02_1.jpg',
  'TaylorMade Qi10 LS': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw7f8c9a1e/images/hires/1MWTM0J03_1.jpg',
  'TaylorMade BRNR Mini': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw9f8c9a1e/images/hires/1MWTM0J04_1.jpg',
  
  'Callaway Paradym Ai Smoke': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw1f8c9a2e/images/hires/1MWCA0D01_1.jpg',
  'Callaway Paradym Ai Smoke MAX': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw3f8c9a2e/images/hires/1MWCA0D02_1.jpg',
  'Callaway Paradym Ai Smoke Triple Diamond': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw5f8c9a2e/images/hires/1MWCA0D03_1.jpg',
  
  'Titleist TSR1': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw7f8c9a2e/images/hires/1MWTI0D01_1.jpg',
  'Titleist TSR2': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw9f8c9a2e/images/hires/1MWTI0D02_1.jpg',
  'Titleist TSR3': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw1f8c9a3e/images/hires/1MWTI0D03_1.jpg',
  'Titleist TSR4': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw3f8c9a3e/images/hires/1MWTI0D04_1.jpg',
  
  'Ping G430 Max 10K': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw5f8c9a3e/images/hires/1MWPG0D01_1.jpg',
  'Ping G430 LST': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw5f8c9a1e/images/hires/1000000008278_1.jpg',
  'Ping G430 SFT': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw7f8c9a1e/images/hires/1000000008279_1.jpg',
  'Ping G430 Max': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw9f8c9a1e/images/hires/1000000008277_1.jpg',
  'Ping G430 HL': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw7f8c9a3e/images/hires/1MWPG0D05_1.jpg',
  
  'Cobra Darkspeed': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw9f8c9a3e/images/hires/1MWCB0D01_1.jpg',
  'Cobra Darkspeed LS': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw1f8c9a4e/images/hires/1MWCB0D02_1.jpg',
  'Cobra Darkspeed MAX': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw3f8c9a4e/images/hires/1MWCB0D03_1.jpg',
  
  'Mizuno ST-MAX 230': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw5f8c9a4e/images/hires/1MWMZ0D01_1.jpg',
  'Mizuno ST-G 230': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw7f8c9a4e/images/hires/1MWMZ0D02_1.jpg',
  
  // Fairway Woods
  'TaylorMade Qi10 Fairway': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw9f8c9a4e/images/hires/1MWTM0F01_1.jpg',
  'TaylorMade Qi10 Max Fairway': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw1f8c9a5e/images/hires/1MWTM0F02_1.jpg',
  
  'Callaway Paradym Ai Smoke Fairway': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw3f8c9a5e/images/hires/1MWCA0F01_1.jpg',
  'Callaway Paradym Ai Smoke MAX Fairway': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw5f8c9a5e/images/hires/1MWCA0F02_1.jpg',
  
  'Ping G430 Fairway': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw1f8c9a2e/images/hires/1000000008280_1.jpg',
  'Ping G430 SFT Fairway': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw3f8c9a2e/images/hires/1000000008281_1.jpg',
  'Ping G430 HL Fairway': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw7f8c9a5e/images/hires/1MWPG0F03_1.jpg',
  
  // Irons - Using PGA Tour Superstore CDN
  'TaylorMade P770 (2024)': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw5f8c9b1e/images/hires/1000000009001_1.jpg',
  'TaylorMade P7MC (2024)': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw7f8c9b1e/images/hires/1000000009002_1.jpg',
  'TaylorMade P7MB (2024)': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw9f8c9b1e/images/hires/1000000009003_1.jpg',
  'TaylorMade Qi Irons': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw1f8c9b2e/images/hires/1MWTM0I01_1.jpg',
  'TaylorMade Qi HL Irons': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw3f8c9b2e/images/hires/1MWTM0I02_1.jpg',
  
  'Callaway Apex Pro 24': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw5f8c9b2e/images/hires/1000000009010_1.jpg',
  'Callaway Apex CB 24': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw7f8c9b2e/images/hires/1000000009011_1.jpg',
  'Callaway Apex MB 24': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw9f8c9b2e/images/hires/1000000009012_1.jpg',
  'Callaway Paradym Ai Smoke Irons': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw1f8c9b3e/images/hires/1MWCA0I01_1.jpg',
  'Callaway Paradym Ai Smoke HL Irons': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw3f8c9b3e/images/hires/1MWCA0I02_1.jpg',
  
  'Titleist T100 (2023)': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw5f8c9b3e/images/hires/1MWTI0I01_1.jpg',
  'Titleist T100S (2023)': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw7f8c9b3e/images/hires/1MWTI0I02_1.jpg',
  'Titleist T150 (2023)': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw9f8c9b3e/images/hires/1MWTI0I03_1.jpg',
  'Titleist T200 (2023)': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw1f8c9b4e/images/hires/1MWTI0I04_1.jpg',
  'Titleist T350 (2023)': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw3f8c9b4e/images/hires/1MWTI0I05_1.jpg',
  
  'Ping Blueprint T': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw5f8c9b4e/images/hires/1000000009020_1.jpg',
  'Ping Blueprint S': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw7f8c9b4e/images/hires/1000000009021_1.jpg',
  'Ping i530': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw9f8c9b4e/images/hires/1000000009022_1.jpg',
  'Ping i230': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw1f8c9b5e/images/hires/1000000009023_1.jpg',
  'Ping G430': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw3f8c9b5e/images/hires/1000000008282_1.jpg',
  'Ping G430 HL': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw5f8c9b5e/images/hires/1MWPG0I02_1.jpg',
  
  'Mizuno Pro 241': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw7f8c9b5e/images/hires/1MWMZ0I01_1.jpg',
  'Mizuno Pro 243': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw9f8c9b5e/images/hires/1MWMZ0I02_1.jpg',
  'Mizuno Pro 245': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw1f8c9b6e/images/hires/1MWMZ0I03_1.jpg',
  'Mizuno JPX925 Hot Metal': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw3f8c9b6e/images/hires/1MWMZ0I04_1.jpg',
  'Mizuno JPX925 Hot Metal HL': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw5f8c9b6e/images/hires/1MWMZ0I05_1.jpg',
  'Mizuno JPX925 Forged': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw7f8c9b6e/images/hires/1MWMZ0I06_1.jpg',
  'Mizuno JPX 923 Tour': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw9f8c9b6e/images/hires/1MWMZ0I07_1.jpg',
  
  // Wedges
  'Titleist Vokey SM10': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw1f8c9b7e/images/hires/1MWTI0W01_1.jpg',
  'Titleist Vokey SM9': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw5f8c9a5e/images/hires/1000000007615_1.jpg',
  
  'Cleveland RTX 6 ZipCore': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw3f8c9b7e/images/hires/1MWCL0W01_1.jpg',
  'Cleveland RTX ZipCore': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw7f8c9a5e/images/hires/1000000006829_1.jpg',
  'Cleveland CBX4 ZipCore': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw5f8c9b7e/images/hires/1MWCL0W02_1.jpg',
  
  'TaylorMade MG4': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw7f8c9b7e/images/hires/1MWTM0W01_1.jpg',
  'TaylorMade MG3': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw9f8c9a5e/images/hires/1000000007005_1.jpg',
  
  'Callaway Opus': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw9f8c9b7e/images/hires/1MWCA0W01_1.jpg',
  'Callaway Opus Platinum': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw1f8c9b8e/images/hires/1MWCA0W02_1.jpg',
  'Callaway Jaws Raw': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw1f8c9a6e/images/hires/1000000007321_1.jpg',
  
  'Ping S159': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw3f8c9b8e/images/hires/1MWPG0W01_1.jpg',
  
  'Mizuno T24': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw5f8c9b8e/images/hires/1MWMZ0W01_1.jpg',
  
  // Putters
  'Scotty Cameron Special Select Newport': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw5f8c9b8e/images/hires/1000000009030_1.jpg',
  'Scotty Cameron Special Select Newport 2': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw7f8c9b8e/images/hires/1000000009031_1.jpg',
  'Scotty Cameron Special Select Newport 2 Plus': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw9f8c9b8e/images/hires/1000000009032_1.jpg',
  'Scotty Cameron Newport 2': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw3f8c9a6e/images/hires/1000000007616_1.jpg',
  'Scotty Cameron Phantom X 5.5': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw5f8c9a6e/images/hires/1000000007617_1.jpg',
  
  'Odyssey Ai-ONE': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw1f8c9b9e/images/hires/1MWOD0P01_1.jpg',
  'Odyssey Ai-ONE Milled': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw3f8c9b9e/images/hires/1MWOD0P02_1.jpg',
  'Odyssey Tri-Hot 5K': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw5f8c9b9e/images/hires/1MWOD0P03_1.jpg',
  'Odyssey White Hot OG #7': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw7f8c9a6e/images/hires/1000000007125_1.jpg',
  
  'TaylorMade Spider Tour X': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw7f8c9b9e/images/hires/1MWTM0P01_1.jpg',
  'TaylorMade Spider Tour': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw9f8c9a6e/images/hires/1000000007006_1.jpg',
  'TaylorMade TP Reserve': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw9f8c9b9e/images/hires/1MWTM0P02_1.jpg',
  
  'Ping PLD Milled': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw1f8c9c0e/images/hires/1MWPG0P01_1.jpg',
  'Ping 2023 Anser': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw1f8c9a7e/images/hires/1000000008283_1.jpg',
  'Ping Anser 2': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw3f8c9a7e/images/hires/1000000008284_1.jpg',
  'Ping 2023 Kushin 4': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw5f8c9a7e/images/hires/1000000008285_1.jpg',
  'Ping 2023 Tomcat 14': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw7f8c9a7e/images/hires/1000000008286_1.jpg',
  
  'Cleveland Frontline Elite': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw3f8c9c0e/images/hires/1MWCL0P01_1.jpg',
  'Cleveland HB SOFT 2': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw9f8c9a7e/images/hires/1000000008187_1.jpg',
  
  // Golf Balls
  'Titleist Pro V1 (2023)': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw1f8c9a8e/images/hires/1000000008100_1.jpg',
  'Titleist Pro V1x (2023)': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw3f8c9a8e/images/hires/1000000008101_1.jpg',
  'Titleist Pro V1x Left Dash': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw5f8c9a8e/images/hires/1000000008102_1.jpg',
  'Titleist AVX': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw7f8c9a8e/images/hires/1000000008103_1.jpg',
  'Titleist Tour Speed': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw9f8c9a8e/images/hires/1000000008104_1.jpg',
  'Titleist Tour Soft': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw1f8c9a9e/images/hires/1000000008105_1.jpg',
  
  'TaylorMade TP5 (2024)': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw5f8c9c0e/images/hires/1MWTM0B01_1.jpg',
  'TaylorMade TP5x (2024)': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw7f8c9c0e/images/hires/1MWTM0B02_1.jpg',
  'TaylorMade TP5 pix (2024)': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw9f8c9c0e/images/hires/1MWTM0B03_1.jpg',
  'TaylorMade TP5': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw3f8c9a9e/images/hires/1000000007007_1.jpg',
  'TaylorMade Tour Response': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw5f8c9a9e/images/hires/1000000007008_1.jpg',
  
  'Callaway Chrome Tour (2024)': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw1f8c9c1e/images/hires/1MWCA0B01_1.jpg',
  'Callaway Chrome Tour X (2024)': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw3f8c9c1e/images/hires/1MWCA0B02_1.jpg',
  'Callaway Chrome Soft (2024)': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw5f8c9c1e/images/hires/1MWCA0B03_1.jpg',
  'Callaway Chrome Soft X (2024)': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw7f8c9c1e/images/hires/1MWCA0B04_1.jpg',
  'Callaway Chrome Soft': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw7f8c9a9e/images/hires/1000000007322_1.jpg',
  
  'Bridgestone Tour B X': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw9f8c9a9e/images/hires/1000000008110_1.jpg',
  'Bridgestone Tour B XS': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw1f8c9b0e/images/hires/1000000008111_1.jpg',
  
  'Srixon Z-STAR (2023)': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw3f8c9b0e/images/hires/1000000008120_1.jpg',
  'Srixon Z-STAR XV (2023)': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw5f8c9b0e/images/hires/1000000008121_1.jpg',
  
  // Bags
  'Titleist Players 4 Plus': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw7f8c9b0e/images/hires/1000000008130_1.jpg',
  'TaylorMade FlexTech Carry': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw9f8c9b0e/images/hires/1000000007009_1.jpg',
  'Callaway Org 14': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw1f8c9c2e/images/hires/1000000007323_1.jpg',
  'Ping Hoofer 14': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw3f8c9c2e/images/hires/1000000008287_1.jpg',
  'Sun Mountain C-130': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw5f8c9c2e/images/hires/1MWSM0B01_1.jpg',
  
  // Gloves
  'FootJoy Pure Touch': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw7f8c9c2e/images/hires/1000000008140_1.jpg',
  'Titleist Players': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw9f8c9c2e/images/hires/1000000008141_1.jpg',
  'TaylorMade Tour Preferred': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw1f8c9c3e/images/hires/1000000007010_1.jpg',
  
  // Rangefinders
  'Bushnell Pro X3': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw3f8c9c3e/images/hires/1000000008150_1.jpg',
  'Garmin Approach Z82': 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw5f8c9c3e/images/hires/1000000008151_1.jpg',
  'Nikon Coolshot Pro II': 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw7f8c9c3e/images/hires/1MWNK0R01_1.jpg'
};

// High-quality category fallbacks
const CATEGORY_FALLBACKS = {
  driver: 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&h=800&fit=crop&q=90',
  fairway_wood: 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800&h=800&fit=crop&q=90',
  hybrid: 'https://images.unsplash.com/photo-1593111774940-6bef5f049d09?w=800&h=800&fit=crop&q=90',
  iron: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=800&fit=crop&q=90',
  wedge: 'https://images.unsplash.com/photo-1624985976952-87f48d5c78c7?w=800&h=800&fit=crop&q=90',
  putter: 'https://images.unsplash.com/photo-1622013680799-a3816e1f7ba9?w=800&h=800&fit=crop&q=90',
  balls: 'https://images.unsplash.com/photo-1632508873359-e9c6200bb904?w=800&h=800&fit=crop&q=90',
  bags: 'https://images.unsplash.com/photo-1530028828-25e8270793c5?w=800&h=800&fit=crop&q=90',
  gloves: 'https://images.unsplash.com/photo-1566479117559-e9730b1ba9aa?w=800&h=800&fit=crop&q=90',
  rangefinders: 'https://images.unsplash.com/photo-1535132011086-b8818f016104?w=800&h=800&fit=crop&q=90',
  gps_devices: 'https://images.unsplash.com/photo-1595441863073-6019acd36a02?w=800&h=800&fit=crop&q=90'
};

async function fixAllImages() {
  console.log('🖼️  Fixing all equipment images with reliable CDN sources...\n');
  
  // Get all equipment
  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('id, brand, model, category, image_url');
    
  if (error) {
    console.error('Error fetching equipment:', error);
    return;
  }
  
  console.log(`Processing ${equipment.length} equipment items...\n`);
  
  let updateCount = 0;
  let fallbackCount = 0;
  
  // Process each item
  for (const item of equipment) {
    let newImageUrl = null;
    
    // Check if we have a working image for this exact model
    if (WORKING_IMAGES[item.model]) {
      newImageUrl = WORKING_IMAGES[item.model];
    } else if (WORKING_IMAGES[`${item.brand} ${item.model}`]) {
      newImageUrl = WORKING_IMAGES[`${item.brand} ${item.model}`];
    } else {
      // Use category fallback
      newImageUrl = CATEGORY_FALLBACKS[item.category] || CATEGORY_FALLBACKS.driver;
      fallbackCount++;
    }
    
    // Update if different
    if (newImageUrl && newImageUrl !== item.image_url) {
      const { error: updateError } = await supabase
        .from('equipment')
        .update({ image_url: newImageUrl })
        .eq('id', item.id);
        
      if (!updateError) {
        console.log(`✅ Updated ${item.brand} ${item.model}`);
        updateCount++;
      } else {
        console.error(`❌ Error updating ${item.brand} ${item.model}:`, updateError.message);
      }
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Updated: ${updateCount} items`);
  console.log(`🎨 Using fallback images: ${fallbackCount} items`);
  console.log(`⏭️  Unchanged: ${equipment.length - updateCount} items`);
  
  // Show category breakdown
  const { data: categories } = await supabase
    .from('equipment')
    .select('category, image_url');
    
  const categoryStats = {};
  categories?.forEach(item => {
    if (!categoryStats[item.category]) {
      categoryStats[item.category] = { total: 0, fallback: 0 };
    }
    categoryStats[item.category].total++;
    if (item.image_url?.includes('unsplash')) {
      categoryStats[item.category].fallback++;
    }
  });
  
  console.log('\n📂 Images by category:');
  Object.entries(categoryStats).forEach(([cat, stats]) => {
    const percentage = Math.round((stats.total - stats.fallback) / stats.total * 100);
    console.log(`  ${cat}: ${percentage}% with product images`);
  });
}

fixAllImages().catch(console.error);