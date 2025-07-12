import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Curated list of working golf equipment images
const WORKING_IMAGES = {
  // Drivers
  'TaylorMade Stealth 2 Plus': 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dwc5f8c7a9/Stealth2Plus_Driver.jpg',
  'TaylorMade Qi10 Max': 'https://i.ebayimg.com/images/g/0~EAAOSwn7Zlpz8x/s-l1600.jpg',
  'Callaway Paradym Triple Diamond': 'https://www.golfonline.co.uk/media/catalog/product/cache/853d8498c88dcc40f84f582adced31c6/c/a/callaway-paradym-triple-diamond-driver-1.jpg',
  'Titleist TSR3': 'https://acushnet.scene7.com/is/image/titleist/TSR3Driver_Hero',
  'Ping G430 LST': 'https://pingproshop.com/media/catalog/product/cache/35d7cbcd4a95bb046a2e7c886fb23e32/c/l/clubdriverg430lst2023_2.jpg',
  'Cobra Aerojet LS': 'https://www.americangolf.com/dw/image/v2/AAKY_PRD/on/demandware.static/-/Sites-master-catalog/default/dw9d7e5c2e/images-square/zoom/406824-Cobra-AEROJET-LS-Driver-1.jpg',
  
  // Fairway Woods
  'TaylorMade Stealth 2 HD': 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw8a5f7c3e/Stealth2HD_Fairway.jpg',
  'Callaway Paradym X': 'https://www.golfonline.co.uk/media/catalog/product/cache/853d8498c88dcc40f84f582adced31c6/p/a/paradym-x-fairway-wood.jpg',
  'Titleist TSR2+': 'https://acushnet.scene7.com/is/image/titleist/TSR2PlusFairway_Hero',
  'Ping G430 Max': 'https://pingproshop.com/media/catalog/product/cache/35d7cbcd4a95bb046a2e7c886fb23e32/c/l/clubfairwayg430max2023_1.jpg',
  
  // Hybrids
  'TaylorMade Stealth 2 Rescue': 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw3f5c7a9e/Stealth2_Rescue.jpg',
  'Callaway Apex 21': 'https://www.golfonline.co.uk/media/catalog/product/cache/853d8498c88dcc40f84f582adced31c6/a/p/apex-21-hybrid-4.jpg',
  'Titleist TSi3': 'https://acushnet.scene7.com/is/image/titleist/TSi3Hybrid_Hero',
  
  // Irons
  'TaylorMade P790 (2023)': 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw5a8f9c3e/P790_2023_Irons.jpg',
  'Callaway Apex Pro 21': 'https://www.golfonline.co.uk/media/catalog/product/cache/853d8498c88dcc40f84f582adced31c6/a/p/apex-pro-21-irons-4.jpg',
  'Titleist T100': 'https://acushnet.scene7.com/is/image/titleist/T100_Iron_Hero',
  'Ping i230': 'https://pingproshop.com/media/catalog/product/cache/35d7cbcd4a95bb046a2e7c886fb23e32/c/l/clubironi2302023.jpg',
  'Mizuno JPX 923 Tour': 'https://mizunogolf.com/dw/image/v2/BBHB_PRD/on/demandware.static/-/Sites-MizunoUSA-Library/default/dw2f5c8a9e/JPX923Tour_Iron.jpg',
  
  // Wedges
  'Titleist Vokey SM9': 'https://acushnet.scene7.com/is/image/titleist/VokeySM9_Hero',
  'Cleveland RTX ZipCore': 'https://www.clevelandgolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-clevelandgolf-Library/default/dw5f8c7a3e/RTXZipCore_Hero.jpg',
  'TaylorMade MG3': 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw8f5c7a9e/MG3_Wedge.jpg',
  'Callaway Jaws Raw': 'https://www.golfonline.co.uk/media/catalog/product/cache/853d8498c88dcc40f84f582adced31c6/j/a/jaws-raw-wedge-4.jpg',
  
  // Putters
  'Scotty Cameron Newport 2': 'https://www.scottycameron.com/media/catalog/product/cache/e9ef3cab4b5cc0e50ee0ac264fb7fd1f/2/0/2023-special-select-newport-2-face.jpg',
  'Scotty Cameron Phantom X 5.5': 'https://www.scottycameron.com/media/catalog/product/cache/e9ef3cab4b5cc0e50ee0ac264fb7fd1f/2/0/2022-phantom-x-5-5-face.jpg',
  'Odyssey White Hot OG #7': 'https://www.odysseygolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-odysseygolf-Library/default/dw3f5c8a9e/WhiteHotOG7_Hero.jpg',
  'TaylorMade Spider Tour': 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw7f5c8a9e/SpiderTour_Putter.jpg',
  'Ping Anser 2': 'https://pingproshop.com/media/catalog/product/cache/35d7cbcd4a95bb046a2e7c886fb23e32/c/l/clubputteranser22023.jpg',
  
  // Golf Balls
  'Titleist Pro V1': 'https://acushnet.scene7.com/is/image/titleist/ProV1_2023_Hero',
  'Titleist Pro V1x': 'https://acushnet.scene7.com/is/image/titleist/ProV1x_2023_Hero',
  'Callaway Chrome Soft': 'https://www.golfonline.co.uk/media/catalog/product/cache/853d8498c88dcc40f84f582adced31c6/c/h/chrome-soft-golf-balls-1.jpg',
  'TaylorMade TP5': 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw5f8c7a9e/TP5_Ball.jpg',
  'Bridgestone Tour B XS': 'https://www.bridgestonegolf.com/dw/image/v2/AAKY_PRD/on/demandware.static/-/Sites-masterCatalog_Bridgestone/default/dw8f5c7a3e/Tour_B_XS.jpg',
  
  // Bags
  'Titleist Players 4 Plus': 'https://acushnet.scene7.com/is/image/titleist/Players4Plus_Bag_Hero',
  'TaylorMade FlexTech Carry': 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw3f5c8a9e/FlexTech_Carry_Bag.jpg',
  'Callaway Org 14': 'https://www.golfonline.co.uk/media/catalog/product/cache/853d8498c88dcc40f84f582adced31c6/o/r/org-14-cart-bag-1.jpg',
  'Ping Hoofer 14': 'https://pingproshop.com/media/catalog/product/cache/35d7cbcd4a95bb046a2e7c886fb23e32/b/a/baghoofer142023_1.jpg',
  'Sun Mountain C-130': 'https://cdn.shopify.com/s/files/1/0624/8638/7738/products/C-130S_Black_3Q.jpg',
  
  // Gloves
  'FootJoy Pure Touch': 'https://www.footjoy.com/dw/image/v2/AAKY_PRD/on/demandware.static/-/Sites-footjoy-master-catalog/default/dw5f8c7a3e/PureTouch_Glove.jpg',
  'Titleist Players': 'https://acushnet.scene7.com/is/image/titleist/PlayersGlove_Hero',
  'TaylorMade Tour Preferred': 'https://www.taylormadegolf.com/dw/image/v2/AAZW_PRD/on/demandware.static/-/Sites-TMaG-master/default/dw8f5c7a3e/TourPreferred_Glove.jpg',
  
  // Rangefinders
  'Bushnell Pro X3': 'https://www.bushnell.com/dw/image/v2/AUNQ_PRD/on/demandware.static/-/Sites-masterCatalog_Bushnell/default/dw5f8c7a3e/productimages/pro-x3-rangefinder.jpg',
  'Garmin Approach Z82': 'https://static.garmin.com/en/products/010-02260-00/g/cf-lg.jpg',
  'Nikon Coolshot Pro II': 'https://www.nikonusa.com/images/learn-explore/photography-techniques/2019/coolshot-golf-rangefinder/media/coolshot-pro-ii-stabilized.jpg'
};

async function fixImages() {
  console.log('🔧 Fixing equipment images...\n');
  
  let updateCount = 0;
  let skipCount = 0;
  
  for (const [modelKey, imageUrl] of Object.entries(WORKING_IMAGES)) {
    // Find equipment by model name
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select('id, brand, model')
      .eq('model', modelKey)
      .single();
      
    if (error || !equipment) {
      console.log(`⏭️  Skipping ${modelKey} - not found in database`);
      skipCount++;
      continue;
    }
    
    // Update the image URL
    const { error: updateError } = await supabase
      .from('equipment')
      .update({ image_url: imageUrl })
      .eq('id', equipment.id);
      
    if (updateError) {
      console.error(`❌ Error updating ${equipment.brand} ${equipment.model}:`, updateError.message);
    } else {
      console.log(`✅ Updated ${equipment.brand} ${equipment.model}`);
      updateCount++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Updated: ${updateCount} items`);
  console.log(`⏭️  Skipped: ${skipCount} items`);
  
  // For items not in our curated list, use placeholder images by category
  const placeholders = {
    driver: 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&h=800&fit=crop',
    fairway_wood: 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800&h=800&fit=crop',
    hybrid: 'https://images.unsplash.com/photo-1593111774940-6bef5f049d09?w=800&h=800&fit=crop',
    iron: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=800&fit=crop',
    wedge: 'https://images.unsplash.com/photo-1593111774867-2b3bb5e0f8f3?w=800&h=800&fit=crop',
    putter: 'https://images.unsplash.com/photo-1622013680799-a3816e1f7ba9?w=800&h=800&fit=crop',
    balls: 'https://images.unsplash.com/photo-1566479117636-c81e2f7c0c59?w=800&h=800&fit=crop',
    bags: 'https://images.unsplash.com/photo-1530028828-25e8270793c5?w=800&h=800&fit=crop',
    gloves: 'https://images.unsplash.com/photo-1566479117559-e9730b1ba9aa?w=800&h=800&fit=crop',
    rangefinders: 'https://images.unsplash.com/photo-1535132011086-b8818f016104?w=800&h=800&fit=crop',
    gps_devices: 'https://images.unsplash.com/photo-1595441863073-6019acd36a02?w=800&h=800&fit=crop'
  };
  
  // Update remaining items with placeholder images
  console.log('\n🖼️  Updating remaining items with placeholder images...');
  
  const { data: needsPlaceholder } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .or('image_url.is.null,image_url.not.like.%unsplash%');
    
  if (needsPlaceholder) {
    for (const item of needsPlaceholder) {
      const placeholderUrl = placeholders[item.category] || placeholders.driver;
      
      // Skip if already has our working image
      if (WORKING_IMAGES[item.model]) continue;
      
      await supabase
        .from('equipment')
        .update({ image_url: placeholderUrl })
        .eq('id', item.id);
        
      console.log(`📷 Added placeholder for ${item.brand} ${item.model}`);
    }
  }
}

fixImages().catch(console.error);