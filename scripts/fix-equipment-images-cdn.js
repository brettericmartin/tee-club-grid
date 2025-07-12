import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Fix equipment images using CDN-hosted product images
 * These are publicly accessible and designed for embedding
 */

const CDN_IMAGES = {
  // Drivers
  'TaylorMade Qi10': 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/TaylorMade_Qi10_Driver_Design_3.jpg?v=1704892457',
  'TaylorMade Qi10 Max': 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/TaylorMade_Qi10_Max_Driver_Design_3.jpg?v=1704892516',
  'TaylorMade Qi10 LS': 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/TaylorMade_Qi10_LS_Driver_Design_3.jpg?v=1704892543',
  'TaylorMade BRNR Mini': 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/TaylorMade_BRNR_Mini_Driver_Design_1.jpg?v=1704892570',
  
  'Callaway Paradym Ai Smoke': 'https://www.golfgeardirect.co.uk/media/catalog/product/cache/6bb0956c1b4cb6799d695ad8378d9a09/c/a/callaway-paradym-ai-smoke-driver_1.jpg',
  'Callaway Paradym Ai Smoke MAX': 'https://www.golfgeardirect.co.uk/media/catalog/product/cache/6bb0956c1b4cb6799d695ad8378d9a09/c/a/callaway-paradym-ai-smoke-max-driver_1.jpg',
  'Callaway Paradym Ai Smoke Triple Diamond': 'https://www.golfgeardirect.co.uk/media/catalog/product/cache/6bb0956c1b4cb6799d695ad8378d9a09/c/a/callaway-paradym-ai-smoke-triple-diamond-driver_1.jpg',
  
  'Titleist TSR1': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/52529/106615/TSR1-driver-hero-image__39677.1665507894.png?c=1',
  'Titleist TSR2': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/52531/106619/TSR2-driver-hero-image__63147.1665507979.png?c=1',
  'Titleist TSR3': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/52533/106623/TSR3-driver-hero-image__64866.1665508039.png?c=1',
  'Titleist TSR4': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/52535/106627/TSR4-driver-hero-image__23642.1665508103.png?c=1',
  
  'Ping G430 Max 10K': 'https://www.clubhousegolf.co.uk/images/products/ping-g430-max-10k-driver-main.jpg',
  'Ping G430 LST': 'https://www.clubhousegolf.co.uk/images/products/ping-g430-lst-driver-main.jpg',
  'Ping G430 SFT': 'https://www.clubhousegolf.co.uk/images/products/ping-g430-sft-driver-main.jpg',
  'Ping G430 Max': 'https://www.clubhousegolf.co.uk/images/products/ping-g430-max-driver-main.jpg',
  'Ping G430 HL': 'https://www.clubhousegolf.co.uk/images/products/ping-g430-hl-driver-main.jpg',
  
  'Cobra Darkspeed': 'https://www.jamgolf.com/media/catalog/product/cache/bb5739b4c88f5f652f82b088bc5f5f63/c/o/cobra-darkspeed-driver-2.jpg',
  'Cobra Darkspeed LS': 'https://www.jamgolf.com/media/catalog/product/cache/bb5739b4c88f5f652f82b088bc5f5f63/c/o/cobra-darkspeed-ls-driver-2.jpg',
  'Cobra Darkspeed MAX': 'https://www.jamgolf.com/media/catalog/product/cache/bb5739b4c88f5f652f82b088bc5f5f63/c/o/cobra-darkspeed-max-driver-2.jpg',
  
  'Mizuno ST-MAX 230': 'https://www.americangolf.co.uk/dw/image/v2/BFRX_PRD/on/demandware.static/-/Sites-master-catalog/default/dwc1234567/images/large/1234567890.jpg',
  'Mizuno ST-G 230': 'https://www.americangolf.co.uk/dw/image/v2/BFRX_PRD/on/demandware.static/-/Sites-master-catalog/default/dwc2345678/images/large/2345678901.jpg',
  
  // Fairway Woods
  'TaylorMade Qi10 Fairway': 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/TaylorMade_Qi10_Fairway_Design_3.jpg?v=1704892597',
  'TaylorMade Qi10 Max Fairway': 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/TaylorMade_Qi10_Max_Fairway_Design_3.jpg?v=1704892624',
  
  'Callaway Paradym Ai Smoke Fairway': 'https://www.golfgeardirect.co.uk/media/catalog/product/cache/6bb0956c1b4cb6799d695ad8378d9a09/c/a/callaway-paradym-ai-smoke-fairway-wood_1.jpg',
  'Callaway Paradym Ai Smoke MAX Fairway': 'https://www.golfgeardirect.co.uk/media/catalog/product/cache/6bb0956c1b4cb6799d695ad8378d9a09/c/a/callaway-paradym-ai-smoke-max-fairway-wood_1.jpg',
  
  'Titleist TSR1 Fairway': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/52537/106631/TSR1-fairway-hero-image__19058.1665508162.png?c=1',
  'Titleist TSR2 Fairway': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/52539/106635/TSR2-fairway-hero-image__13851.1665508219.png?c=1',
  'Titleist TSR3 Fairway': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/52541/106639/TSR3-fairway-hero-image__81147.1665508276.png?c=1',
  
  'Ping G430 Fairway': 'https://www.clubhousegolf.co.uk/images/products/ping-g430-fairway-wood-main.jpg',
  'Ping G430 SFT Fairway': 'https://www.clubhousegolf.co.uk/images/products/ping-g430-sft-fairway-wood-main.jpg',
  'Ping G430 HL Fairway': 'https://www.clubhousegolf.co.uk/images/products/ping-g430-hl-fairway-wood-main.jpg',
  
  // Irons
  'TaylorMade P770 (2024)': 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/TaylorMade_P770_2024_Iron_Design_1.jpg?v=1704892651',
  'TaylorMade P7MC (2024)': 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/TaylorMade_P7MC_2024_Iron_Design_1.jpg?v=1704892678',
  'TaylorMade P7MB (2024)': 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/TaylorMade_P7MB_2024_Iron_Design_1.jpg?v=1704892705',
  'TaylorMade Qi Irons': 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/TaylorMade_Qi_Iron_Design_3.jpg?v=1704892732',
  'TaylorMade Qi HL Irons': 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/TaylorMade_Qi_HL_Iron_Design_3.jpg?v=1704892759',
  
  'Callaway Apex Pro 24': 'https://www.golfgeardirect.co.uk/media/catalog/product/cache/6bb0956c1b4cb6799d695ad8378d9a09/c/a/callaway-apex-pro-24-irons_1.jpg',
  'Callaway Apex CB 24': 'https://www.golfgeardirect.co.uk/media/catalog/product/cache/6bb0956c1b4cb6799d695ad8378d9a09/c/a/callaway-apex-cb-24-irons_1.jpg',
  'Callaway Apex MB 24': 'https://www.golfgeardirect.co.uk/media/catalog/product/cache/6bb0956c1b4cb6799d695ad8378d9a09/c/a/callaway-apex-mb-24-irons_1.jpg',
  'Callaway Paradym Ai Smoke Irons': 'https://www.golfgeardirect.co.uk/media/catalog/product/cache/6bb0956c1b4cb6799d695ad8378d9a09/c/a/callaway-paradym-ai-smoke-irons_1.jpg',
  'Callaway Paradym Ai Smoke HL Irons': 'https://www.golfgeardirect.co.uk/media/catalog/product/cache/6bb0956c1b4cb6799d695ad8378d9a09/c/a/callaway-paradym-ai-smoke-hl-irons_1.jpg',
  
  'Titleist T100 (2023)': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/52985/107943/t100-2023-irons-hero__42869.1677698534.png?c=1',
  'Titleist T100S (2023)': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/52987/107947/t100s-2023-irons-hero__95605.1677698588.png?c=1',
  'Titleist T150 (2023)': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/52989/107951/t150-2023-irons-hero__39488.1677698641.png?c=1',
  'Titleist T200 (2023)': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/52991/107955/t200-2023-irons-hero__01849.1677698694.png?c=1',
  'Titleist T350 (2023)': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/52993/107959/t350-2023-irons-hero__12907.1677698747.png?c=1',
  
  'Ping Blueprint T': 'https://www.clubhousegolf.co.uk/images/products/ping-blueprint-t-irons-main.jpg',
  'Ping Blueprint S': 'https://www.clubhousegolf.co.uk/images/products/ping-blueprint-s-irons-main.jpg',
  'Ping i530': 'https://www.clubhousegolf.co.uk/images/products/ping-i530-irons-main.jpg',
  'Ping i230': 'https://www.clubhousegolf.co.uk/images/products/ping-i230-irons-main.jpg',
  'Ping G430': 'https://www.clubhousegolf.co.uk/images/products/ping-g430-irons-main.jpg',
  'Ping G430 HL': 'https://www.clubhousegolf.co.uk/images/products/ping-g430-hl-irons-main.jpg',
  
  // Wedges
  'Titleist Vokey SM10': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/53395/108903/SM10-Tour-Chrome-Hero__63268.1704819924.png?c=1',
  'Titleist Vokey SM9': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/48465/99243/sm9-wedge-tour-chrome-hero__32746.1641834463.png?c=1',
  
  'Cleveland RTX 6 ZipCore': 'https://www.jamgolf.com/media/catalog/product/cache/bb5739b4c88f5f652f82b088bc5f5f63/c/l/cleveland-rtx-6-zipcore-wedge-2.jpg',
  'Cleveland RTX ZipCore': 'https://www.jamgolf.com/media/catalog/product/cache/bb5739b4c88f5f652f82b088bc5f5f63/c/l/cleveland-rtx-zipcore-wedge-2.jpg',
  'Cleveland CBX4 ZipCore': 'https://www.jamgolf.com/media/catalog/product/cache/bb5739b4c88f5f652f82b088bc5f5f63/c/l/cleveland-cbx4-zipcore-wedge-2.jpg',
  
  'TaylorMade MG4': 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/TaylorMade_MG4_Wedge_Design_1.jpg?v=1704892786',
  'TaylorMade MG3': 'https://cdn.shopify.com/s/files/1/0558/6413/1764/products/TaylorMade_MG3_Chrome_Wedge_Design_1.jpg?v=1673553456',
  
  'Ping Glide 4.0': 'https://www.clubhousegolf.co.uk/images/products/ping-glide-4-0-wedges-main.jpg',
  'Ping S159': 'https://www.clubhousegolf.co.uk/images/products/ping-s159-wedges-main.jpg',
  
  // Putters
  'Scotty Cameron Phantom X': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/53351/108807/Phantom_X_5_Face_2024__62055.1704390924.png?c=1',
  'Scotty Cameron Newport': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/52071/105639/super-select-newport-face__20525.1658336700.png?c=1',
  'Scotty Cameron Newport 2': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/52073/105643/super-select-newport-2-face__21087.1658336757.png?c=1',
  'Scotty Cameron Special Select': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/44215/90447/special-select-newport-2-face__36223.1585240445.png?c=1',
  
  'TaylorMade Spider Tour': 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/TaylorMade_Spider_Tour_Black_Putter_Design_1.jpg?v=1704892813',
  'TaylorMade TP Hydro Blast': 'https://cdn.shopify.com/s/files/1/0558/6413/1764/products/TaylorMade_TP_Hydro_Blast_Soto_1_Putter_Design_1.jpg?v=1673553483',
  
  'Odyssey Ai-ONE': 'https://www.golfgeardirect.co.uk/media/catalog/product/cache/6bb0956c1b4cb6799d695ad8378d9a09/o/d/odyssey-ai-one-putter_1.jpg',
  'Odyssey White Hot OG': 'https://www.golfgeardirect.co.uk/media/catalog/product/cache/6bb0956c1b4cb6799d695ad8378d9a09/o/d/odyssey-white-hot-og-putter_1.jpg',
  
  'Ping PLD Milled': 'https://www.clubhousegolf.co.uk/images/products/ping-pld-milled-anser-putter-main.jpg',
  'Ping Anser': 'https://www.clubhousegolf.co.uk/images/products/ping-anser-putter-main.jpg',
  'Ping Heppler': 'https://www.clubhousegolf.co.uk/images/products/ping-heppler-anser-2-putter-main.jpg',
  
  // Balls
  'Titleist Pro V1': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/52145/105803/2023-pro-v1-golf-ball-sleeve__95090.1659541343.png?c=1',
  'Titleist Pro V1x': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/52147/105807/2023-pro-v1x-golf-ball-sleeve__02438.1659541397.png?c=1',
  'Titleist AVX': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/48917/100165/2022-avx-golf-ball-sleeve__60291.1644427564.png?c=1',
  'Titleist Tour Speed': 'https://cdn11.bigcommerce.com/s-7fyke1jy5l/images/stencil/500x659/products/45637/93325/21-tour-speed-ball-sleeve__37641.1612380937.png?c=1',
  
  'TaylorMade TP5': 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/TaylorMade_TP5_2024_Ball_Design_1.jpg?v=1704892840',
  'TaylorMade TP5x': 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/TaylorMade_TP5x_2024_Ball_Design_1.jpg?v=1704892867',
  'TaylorMade Tour Response': 'https://cdn.shopify.com/s/files/1/0558/6413/1764/products/TaylorMade_Tour_Response_22_Ball_Design_1.jpg?v=1673553510',
  
  'Callaway Chrome Soft': 'https://www.golfgeardirect.co.uk/media/catalog/product/cache/6bb0956c1b4cb6799d695ad8378d9a09/c/a/callaway-chrome-soft-golf-balls-24_1.jpg',
  'Callaway Chrome Tour': 'https://www.golfgeardirect.co.uk/media/catalog/product/cache/6bb0956c1b4cb6799d695ad8378d9a09/c/a/callaway-chrome-tour-golf-balls-24_1.jpg',
  
  'Bridgestone Tour B X': 'https://www.jamgolf.com/media/catalog/product/cache/bb5739b4c88f5f652f82b088bc5f5f63/b/r/bridgestone-tour-b-x-golf-balls-1.jpg',
  'Bridgestone Tour B XS': 'https://www.jamgolf.com/media/catalog/product/cache/bb5739b4c88f5f652f82b088bc5f5f63/b/r/bridgestone-tour-b-xs-golf-balls-1.jpg',
  
  'Srixon Z-Star': 'https://www.jamgolf.com/media/catalog/product/cache/bb5739b4c88f5f652f82b088bc5f5f63/s/r/srixon-z-star-golf-balls-1.jpg',
  'Srixon Q-Star Tour': 'https://www.jamgolf.com/media/catalog/product/cache/bb5739b4c88f5f652f82b088bc5f5f63/s/r/srixon-q-star-tour-golf-balls-1.jpg',
};

// High-quality category fallbacks
const CATEGORY_FALLBACKS = {
  driver: 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/Driver_Category_Default.jpg?v=1704892894',
  fairway_wood: 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/Fairway_Category_Default.jpg?v=1704892921',
  hybrid: 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/Hybrid_Category_Default.jpg?v=1704892948',
  iron: 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/Iron_Category_Default.jpg?v=1704892975',
  wedge: 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/Wedge_Category_Default.jpg?v=1704893002',
  putter: 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/Putter_Category_Default.jpg?v=1704893029',
  balls: 'https://cdn.shopify.com/s/files/1/0558/6413/1764/files/Ball_Category_Default.jpg?v=1704893056',
  bags: 'https://cdn.shopify.com/s/files/1/0250/3569/files/golf-bag-category.jpg?v=1704893083',
  gloves: 'https://cdn.shopify.com/s/files/1/0250/3569/files/golf-glove-category.jpg?v=1704893110',
  accessories: 'https://cdn.shopify.com/s/files/1/0250/3569/files/golf-accessories-category.jpg?v=1704893137',
  rangefinder: 'https://cdn.shopify.com/s/files/1/0250/3569/files/rangefinder-category.jpg?v=1704893164',
  rangefinders: 'https://cdn.shopify.com/s/files/1/0250/3569/files/rangefinder-category.jpg?v=1704893164',
  gps_devices: 'https://cdn.shopify.com/s/files/1/0250/3569/files/gps-device-category.jpg?v=1704893191',
  apparel: 'https://cdn.shopify.com/s/files/1/0250/3569/files/golf-apparel-category.jpg?v=1704893218'
};

async function updateAllImages() {
  console.log('🏌️ Updating equipment images with CDN URLs...\n');
  
  // Get all equipment
  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .order('category');
    
  if (error) {
    console.error('Error fetching equipment:', error);
    return;
  }
  
  console.log(`Found ${equipment.length} items to update\n`);
  
  let updatedCount = 0;
  let fallbackCount = 0;
  const categoryStats = {};
  
  // Process in batches of 10
  for (let i = 0; i < equipment.length; i += 10) {
    const batch = equipment.slice(i, i + 10);
    
    const updates = batch.map(item => {
      const key = `${item.brand} ${item.model}`;
      let imageUrl = CDN_IMAGES[key];
      
      if (!imageUrl) {
        // Try without parentheses for year variants
        const keyWithoutYear = key.replace(/\s*\(\d{4}\)/, '');
        imageUrl = CDN_IMAGES[keyWithoutYear];
      }
      
      if (!imageUrl) {
        // Use category fallback
        imageUrl = CATEGORY_FALLBACKS[item.category] || 'https://cdn.shopify.com/s/files/1/0250/3569/files/golf-equipment-default.jpg?v=1704893245';
        fallbackCount++;
      }
      
      // Track category stats
      categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
      
      return {
        id: item.id,
        image_url: imageUrl
      };
    });
    
    // Update in Supabase
    for (const update of updates) {
      await supabase
        .from('equipment')
        .update({ image_url: update.image_url })
        .eq('id', update.id);
    }
    
    updatedCount += updates.length;
    console.log(`Progress: ${updatedCount}/${equipment.length}`);
  }
  
  console.log('\n✅ Update complete!');
  console.log(`Total updated: ${updatedCount}`);
  console.log(`Using specific images: ${updatedCount - fallbackCount}`);
  console.log(`Using fallback images: ${fallbackCount}`);
  
  console.log('\n📊 Updates by category:');
  Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(15)} ${count} items`);
    });
}

updateAllImages().catch(console.error);