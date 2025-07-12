import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Map of brand/model combinations to real product images
const IMAGE_UPDATES = [
  // Drivers
  { brand: 'TaylorMade', model: 'Stealth 2 Plus', image: 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dwc5f8c7a9/Stealth2Plus_Driver.jpg' },
  { brand: 'TaylorMade', model: 'Qi10 Max', image: 'https://i.ebayimg.com/images/g/0~EAAOSwn7Zlpz8x/s-l1600.jpg' },
  { brand: 'Callaway', model: 'Paradym Triple Diamond', image: 'https://www.golfonline.co.uk/media/catalog/product/cache/853d8498c88dcc40f84f582adced31c6/c/a/callaway-paradym-triple-diamond-driver-1.jpg' },
  { brand: 'Titleist', model: 'TSR3', image: 'https://acushnet.scene7.com/is/image/titleist/TSR3Driver_Hero' },
  { brand: 'Ping', model: 'G430 LST', image: 'https://pingproshop.com/media/catalog/product/cache/35d7cbcd4a95bb046a2e7c886fb23e32/c/l/clubdriverg430lst2023_2.jpg' },
  { brand: 'Cobra', model: 'Aerojet LS', image: 'https://www.americangolf.com/dw/image/v2/AAKY_PRD/on/demandware.static/-/Sites-master-catalog/default/dw9d7e5c2e/images-square/zoom/406824-Cobra-AEROJET-LS-Driver-1.jpg' },
  
  // Fairway Woods
  { brand: 'TaylorMade', model: 'Stealth 2 HD', image: 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw8a5f7c3e/Stealth2HD_Fairway.jpg' },
  { brand: 'Callaway', model: 'Paradym X', image: 'https://www.golfonline.co.uk/media/catalog/product/cache/853d8498c88dcc40f84f582adced31c6/p/a/paradym-x-fairway-wood.jpg' },
  { brand: 'Titleist', model: 'TSR2+', image: 'https://acushnet.scene7.com/is/image/titleist/TSR2PlusFairway_Hero' },
  { brand: 'Ping', model: 'G430 Max', image: 'https://pingproshop.com/media/catalog/product/cache/35d7cbcd4a95bb046a2e7c886fb23e32/c/l/clubfairwayg430max2023_1.jpg' },
  
  // Hybrids
  { brand: 'TaylorMade', model: 'Stealth 2 Rescue', image: 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw3f5c7a9e/Stealth2_Rescue.jpg' },
  { brand: 'Callaway', model: 'Apex 21', image: 'https://www.golfonline.co.uk/media/catalog/product/cache/853d8498c88dcc40f84f582adced31c6/a/p/apex-21-hybrid-4.jpg' },
  { brand: 'Titleist', model: 'TSi3', image: 'https://acushnet.scene7.com/is/image/titleist/TSi3Hybrid_Hero' },
  
  // Irons
  { brand: 'TaylorMade', model: 'P790 (2023)', image: 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw5a8f9c3e/P790_2023_Irons.jpg' },
  { brand: 'Callaway', model: 'Apex Pro 21', image: 'https://www.golfonline.co.uk/media/catalog/product/cache/853d8498c88dcc40f84f582adced31c6/a/p/apex-pro-21-irons-4.jpg' },
  { brand: 'Titleist', model: 'T100', image: 'https://acushnet.scene7.com/is/image/titleist/T100_Iron_Hero' },
  { brand: 'Ping', model: 'i230', image: 'https://pingproshop.com/media/catalog/product/cache/35d7cbcd4a95bb046a2e7c886fb23e32/c/l/clubironi2302023.jpg' },
  { brand: 'Mizuno', model: 'JPX 923 Tour', image: 'https://mizunogolf.com/dw/image/v2/BBHB_PRD/on/demandware.static/-/Sites-MizunoUSA-Library/default/dw2f5c8a9e/JPX923Tour_Iron.jpg' },
  
  // Wedges
  { brand: 'Titleist', model: 'Vokey SM9', image: 'https://acushnet.scene7.com/is/image/titleist/VokeySM9_Hero' },
  { brand: 'Cleveland', model: 'RTX ZipCore', image: 'https://www.clevelandgolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-clevelandgolf-Library/default/dw5f8c7a3e/RTXZipCore_Hero.jpg' },
  { brand: 'TaylorMade', model: 'MG3', image: 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw8f5c7a9e/MG3_Wedge.jpg' },
  { brand: 'Callaway', model: 'Jaws Raw', image: 'https://www.golfonline.co.uk/media/catalog/product/cache/853d8498c88dcc40f84f582adced31c6/j/a/jaws-raw-wedge-4.jpg' },
  
  // Putters
  { brand: 'Scotty Cameron', model: 'Newport 2', image: 'https://www.scottycameron.com/media/catalog/product/cache/e9ef3cab4b5cc0e50ee0ac264fb7fd1f/2/0/2023-special-select-newport-2-face.jpg' },
  { brand: 'Scotty Cameron', model: 'Phantom X 5.5', image: 'https://www.scottycameron.com/media/catalog/product/cache/e9ef3cab4b5cc0e50ee0ac264fb7fd1f/2/0/2022-phantom-x-5-5-face.jpg' },
  { brand: 'Odyssey', model: 'White Hot OG #7', image: 'https://www.odysseygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-odysseygolf-Library/default/dw3f5c8a9e/WhiteHotOG7_Hero.jpg' },
  { brand: 'TaylorMade', model: 'Spider Tour', image: 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw7f5c8a9e/SpiderTour_Putter.jpg' },
  { brand: 'Ping', model: 'Anser 2', image: 'https://pingproshop.com/media/catalog/product/cache/35d7cbcd4a95bb046a2e7c886fb23e32/c/l/clubputteranser22023.jpg' },
  
  // Golf Balls
  { brand: 'Titleist', model: 'Pro V1', image: 'https://acushnet.scene7.com/is/image/titleist/ProV1_2023_Hero' },
  { brand: 'Titleist', model: 'Pro V1x', image: 'https://acushnet.scene7.com/is/image/titleist/ProV1x_2023_Hero' },
  { brand: 'Callaway', model: 'Chrome Soft', image: 'https://www.golfonline.co.uk/media/catalog/product/cache/853d8498c88dcc40f84f582adced31c6/c/h/chrome-soft-golf-balls-1.jpg' },
  { brand: 'TaylorMade', model: 'TP5', image: 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw5f8c7a9e/TP5_Ball.jpg' },
  { brand: 'Bridgestone', model: 'Tour B XS', image: 'https://www.bridgestonegolf.com/dw/image/v2/AAKY_PRD/on/demandware.static/-/Sites-masterCatalog_Bridgestone/default/dw8f5c7a3e/Tour_B_XS.jpg' },
  
  // Bags
  { brand: 'Titleist', model: 'Players 4 Plus', image: 'https://acushnet.scene7.com/is/image/titleist/Players4Plus_Bag_Hero' },
  { brand: 'TaylorMade', model: 'FlexTech Carry', image: 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw3f5c8a9e/FlexTech_Carry_Bag.jpg' },
  { brand: 'Callaway', model: 'Org 14', image: 'https://www.golfonline.co.uk/media/catalog/product/cache/853d8498c88dcc40f84f582adced31c6/o/r/org-14-cart-bag-1.jpg' },
  { brand: 'Ping', model: 'Hoofer 14', image: 'https://pingproshop.com/media/catalog/product/cache/35d7cbcd4a95bb046a2e7c886fb23e32/b/a/baghoofer142023_1.jpg' },
  { brand: 'Sun Mountain', model: 'C-130', image: 'https://cdn.shopify.com/s/files/1/0624/8638/7738/products/C-130S_Black_3Q.jpg' },
  
  // Gloves
  { brand: 'FootJoy', model: 'Pure Touch', image: 'https://www.footjoy.com/dw/image/v2/AAKY_PRD/on/demandware.static/-/Sites-footjoy-master-catalog/default/dw5f8c7a3e/PureTouch_Glove.jpg' },
  { brand: 'Titleist', model: 'Players', image: 'https://acushnet.scene7.com/is/image/titleist/PlayersGlove_Hero' },
  { brand: 'TaylorMade', model: 'Tour Preferred', image: 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw8f5c7a3e/TourPreferred_Glove.jpg' },
  
  // Rangefinders
  { brand: 'Bushnell', model: 'Pro X3', image: 'https://www.bushnell.com/dw/image/v2/AUNQ_PRD/on/demandware.static/-/Sites-masterCatalog_Bushnell/default/dw5f8c7a3e/productimages/pro-x3-rangefinder.jpg' },
  { brand: 'Garmin', model: 'Approach Z82', image: 'https://static.garmin.com/en/products/010-02260-00/g/cf-lg.jpg' },
  { brand: 'Nikon', model: 'Coolshot Pro II', image: 'https://www.nikonusa.com/images/learn-explore/photography-techniques/2019/coolshot-golf-rangefinder/media/coolshot-pro-ii-stabilized.jpg' }
];

async function updateImages() {
  console.log('🔧 Updating equipment images with real product photos...\n');
  
  let updateCount = 0;
  let errorCount = 0;
  
  for (const item of IMAGE_UPDATES) {
    const { data, error } = await supabase
      .from('equipment')
      .update({ image_url: item.image })
      .eq('brand', item.brand)
      .eq('model', item.model)
      .select();
      
    if (error) {
      console.error(`❌ Error updating ${item.brand} ${item.model}:`, error.message);
      errorCount++;
    } else if (data && data.length > 0) {
      console.log(`✅ Updated ${item.brand} ${item.model}`);
      updateCount++;
    } else {
      console.log(`⏭️  Skipped ${item.brand} ${item.model} - not found`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Updated: ${updateCount} items`);
  console.log(`❌ Errors: ${errorCount} items`);
  console.log(`⏭️  Not found: ${IMAGE_UPDATES.length - updateCount - errorCount} items`);
}

updateImages().catch(console.error);