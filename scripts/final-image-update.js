import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Use CDN-hosted product images that are more reliable
const CDN_IMAGES = {
  // Drivers
  'TaylorMade Stealth 2 Plus': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105520090/1105520090.jpg',
  'TaylorMade Qi10 Max': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105543530/1105543530_1.jpg',
  'Callaway Paradym Triple Diamond': 'https://www.2ndswing.com/images/clean-product-images/paradym-triple-diamond-driver-p.jpg',
  'Titleist TSR3': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105524420/1105524420.jpg',
  'Ping G430 LST': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105530100/1105530100.jpg',
  'Cobra Aerojet LS': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105529210/1105529210.jpg',
  
  // Fairway Woods
  'TaylorMade Stealth 2 HD': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105521990/1105521990.jpg',
  'Callaway Paradym X': 'https://www.2ndswing.com/images/clean-product-images/paradym-x-fairway-wood-p.jpg',
  'Titleist TSR2+': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105525150/1105525150.jpg',
  'Ping G430 Max': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105530450/1105530450.jpg',
  
  // Hybrids
  'TaylorMade Stealth 2 Rescue': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105522230/1105522230.jpg',
  'Callaway Apex 21': 'https://www.2ndswing.com/images/clean-product-images/apex-21-hybrid-p.jpg',
  'Titleist TSi3': 'https://www.2ndswing.com/images/clean-product-images/tsi3-hybrid-p.jpg',
  
  // Irons
  'TaylorMade P790 (2023)': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105523360/1105523360.jpg',
  'Callaway Apex Pro 21': 'https://www.2ndswing.com/images/clean-product-images/apex-pro-21-iron-set-p.jpg',
  'Titleist T100': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105525960/1105525960.jpg',
  'Ping i230': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105530990/1105530990.jpg',
  'Mizuno JPX 923 Tour': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105508460/1105508460.jpg',
  
  // Wedges
  'Titleist Vokey SM9': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105503140/1105503140.jpg',
  'Cleveland RTX ZipCore': 'https://www.2ndswing.com/images/clean-product-images/rtx-zipcore-wedge-p.jpg',
  'TaylorMade MG3': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105497130/1105497130.jpg',
  'Callaway Jaws Raw': 'https://www.2ndswing.com/images/clean-product-images/jaws-raw-wedge-p.jpg',
  
  // Putters
  'Scotty Cameron Newport 2': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105527490/1105527490.jpg',
  'Scotty Cameron Phantom X 5.5': 'https://www.2ndswing.com/images/clean-product-images/phantom-x-5.5-2022-putter-p.jpg',
  'Odyssey White Hot OG #7': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105501670/1105501670.jpg',
  'TaylorMade Spider Tour': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105504750/1105504750.jpg',
  'Ping Anser 2': 'https://www.2ndswing.com/images/clean-product-images/pld-anser-2-putter-p.jpg',
  
  // Golf Balls (using stock images as actual product photos are small)
  'Titleist Pro V1': 'https://cdn.shopify.com/s/files/1/0062/8532/8445/products/ProV1_Ball_2023_01.jpg',
  'Titleist Pro V1x': 'https://cdn.shopify.com/s/files/1/0062/8532/8445/products/ProV1x_Ball_2023_01.jpg',
  'Callaway Chrome Soft': 'https://cdn.shopify.com/s/files/1/0062/8532/8445/products/ChromeSoft_2024_Ball.jpg',
  'TaylorMade TP5': 'https://cdn.shopify.com/s/files/1/0062/8532/8445/products/TP5_2024_Ball.jpg',
  'Bridgestone Tour B XS': 'https://cdn.shopify.com/s/files/1/0062/8532/8445/products/Tour_B_XS_Ball.jpg',
  
  // Bags
  'Titleist Players 4 Plus': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105516010/1105516010.jpg',
  'TaylorMade FlexTech Carry': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105523690/1105523690.jpg',
  'Callaway Org 14': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105501270/1105501270.jpg',
  'Ping Hoofer 14': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105532590/1105532590.jpg',
  'Sun Mountain C-130': 'https://cdn.shopify.com/s/files/1/0624/8638/7738/products/C-130S_Black_3Q.jpg',
  
  // Gloves
  'FootJoy Pure Touch': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105455260/1105455260.jpg',
  'Titleist Players': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105479460/1105479460.jpg',
  'TaylorMade Tour Preferred': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105468460/1105468460.jpg',
  
  // Rangefinders
  'Bushnell Pro X3': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105512840/1105512840.jpg',
  'Garmin Approach Z82': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105492810/1105492810.jpg',
  'Nikon Coolshot Pro II': 'https://www.tgw.com/wcsstore/CatalogAssetStore/Attachment/images/products/1105509160/1105509160.jpg'
};

// High-quality stock images as fallbacks by category
const FALLBACK_IMAGES = {
  driver: 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&h=800&fit=crop&q=80',
  fairway_wood: 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800&h=800&fit=crop&q=80',
  hybrid: 'https://images.unsplash.com/photo-1593111774940-6bef5f049d09?w=800&h=800&fit=crop&q=80',
  iron: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=800&fit=crop&q=80',
  wedge: 'https://images.unsplash.com/photo-1593111774867-2b3bb5e0f8f3?w=800&h=800&fit=crop&q=80',
  putter: 'https://images.unsplash.com/photo-1622013680799-a3816e1f7ba9?w=800&h=800&fit=crop&q=80',
  balls: 'https://images.unsplash.com/photo-1566479117636-c81e2f7c0c59?w=800&h=800&fit=crop&q=80',
  bags: 'https://images.unsplash.com/photo-1530028828-25e8270793c5?w=800&h=800&fit=crop&q=80',
  gloves: 'https://images.unsplash.com/photo-1566479117559-e9730b1ba9aa?w=800&h=800&fit=crop&q=80',
  rangefinders: 'https://images.unsplash.com/photo-1535132011086-b8818f016104?w=800&h=800&fit=crop&q=80',
  gps_devices: 'https://images.unsplash.com/photo-1595441863073-6019acd36a02?w=800&h=800&fit=crop&q=80'
};

async function finalImageUpdate() {
  console.log('🖼️  Final equipment image update...\n');
  
  // First, update with CDN images
  let updateCount = 0;
  
  for (const [model, imageUrl] of Object.entries(CDN_IMAGES)) {
    const { data, error } = await supabase
      .from('equipment')
      .update({ image_url: imageUrl })
      .eq('model', model)
      .select();
      
    if (!error && data && data.length > 0) {
      console.log(`✅ Updated ${model}`);
      updateCount++;
    }
  }
  
  console.log(`\n✅ Updated ${updateCount} items with CDN images`);
  
  // Then update any remaining items with fallback images
  console.log('\n🎨 Updating remaining items with fallback images...');
  
  const { data: needsFallback } = await supabase
    .from('equipment')
    .select('id, brand, model, category, image_url')
    .or('image_url.is.null,image_url.like.%placeholder%,image_url.like.%demandware%');
    
  if (needsFallback) {
    for (const item of needsFallback) {
      const fallbackUrl = FALLBACK_IMAGES[item.category] || FALLBACK_IMAGES.driver;
      
      await supabase
        .from('equipment')
        .update({ image_url: fallbackUrl })
        .eq('id', item.id);
        
      console.log(`🎨 Added fallback for ${item.brand} ${item.model}`);
    }
  }
  
  console.log('\n✅ All equipment now has images!');
}

finalImageUpdate().catch(console.error);