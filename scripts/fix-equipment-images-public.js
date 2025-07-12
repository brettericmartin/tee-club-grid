import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Fix equipment images with publicly accessible URLs
 * Using a mix of manufacturer direct links and other public sources
 */

const PUBLIC_IMAGES = {
  // Drivers - Using manufacturer and retailer public images
  'TaylorMade Qi10': 'https://assets.american-golf.com/resize/productintroinfo/354654-Qi10-Main-SQR-01.jpg?width=500',
  'TaylorMade Qi10 Max': 'https://assets.american-golf.com/resize/productintroinfo/354656-Qi10-MAX-Main-SQR-01.jpg?width=500',
  'TaylorMade Qi10 LS': 'https://assets.american-golf.com/resize/productintroinfo/354655-Qi10-LS-Main-SQR-01.jpg?width=500',
  'TaylorMade BRNR Mini': 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/drivers/BRNR%20Mini/v2/BRNR-Mini-Driver-2024-Catalog-Hero.jpg',
  
  'Callaway Paradym Ai Smoke': 'https://media.callawaygolf.com/eyJidWNrZXQiOiJtZWRpYS5jYWxsYXdheWdvbGYuY29tIiwia2V5IjoiY2FsbGF3YXktbWVkaWEvMjAyNF9QYXJhZHltX0FJX1Ntb2tlX0RyaXZlcl9Ub3VyX1RlY2hfSGVyb18xXzEwMDB4MTAwMF8xMGI0N2FmMzE1LmpwZyIsImVkaXRzIjp7InJlc2l6ZSI6eyJ3aWR0aCI6NTAwLCJmaXQiOiJjb250YWluIiwiYmFja2dyb3VuZCI6eyJyIjoyNTUsImciOjI1NSwiYiI6MjU1LCJhbHBoYSI6MH19fX0=',
  'Callaway Paradym Ai Smoke MAX': 'https://media.callawaygolf.com/eyJidWNrZXQiOiJtZWRpYS5jYWxsYXdheWdvbGYuY29tIiwia2V5IjoiY2FsbGF3YXktbWVkaWEvMjAyNF9QYXJhZHltX0FJX1Ntb2tlX01BWF9Ecml2ZXJfVGVjaF9IZXJvXzFfMTAwMHgxMDAwXzMxNTQ5NWYxNGIuanBnIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDAsImZpdCI6ImNvbnRhaW4iLCJiYWNrZ3JvdW5kIjp7InIiOjI1NSwiZyI6MjU1LCJiIjoyNTUsImFscGhhIjowfX19fQ==',
  'Callaway Paradym Ai Smoke Triple Diamond': 'https://media.callawaygolf.com/eyJidWNrZXQiOiJtZWRpYS5jYWxsYXdheWdvbGYuY29tIiwia2V5IjoiY2FsbGF3YXktbWVkaWEvMjAyNF9QYXJhZHltX0FJX1Ntb2tlX1RyaXBsZV9EaWFtb25kX0RyaXZlcl9UZWNoX0hlcm9fMV8xMDAweDEwMDBfOGViYzA0YmQzMy5qcGciLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjUwMCwiZml0IjoiY29udGFpbiIsImJhY2tncm91bmQiOnsiciI6MjU1LCJnIjoyNTUsImIiOjI1NSwiYWxwaGEiOjB9fX19',
  
  'Titleist TSR1': 'https://acushnet.scene7.com/is/image/titleist/TSR1_DriverSole_2023?wid=500&qlt=75',
  'Titleist TSR2': 'https://acushnet.scene7.com/is/image/titleist/TSR2_Driver_Sole_2023?wid=500&qlt=75',
  'Titleist TSR3': 'https://acushnet.scene7.com/is/image/titleist/TSR3_Driver_Sole_2023?wid=500&qlt=75',
  'Titleist TSR4': 'https://acushnet.scene7.com/is/image/titleist/TSR4_Driver_Sole_2023?wid=500&qlt=75',
  
  'Ping G430 Max 10K': 'https://images.clubhousegolf.co.uk/image/4/1000/1000/uploads/product/ping/g430-max-10k-driver.jpg',
  'Ping G430 LST': 'https://pingmedias3.golfwrx.com/2023_G430_Driver_LST_Hero_72dpi.jpg',
  'Ping G430 SFT': 'https://pingmedias3.golfwrx.com/2023_G430_Driver_SFT_Hero_72dpi.jpg',
  'Ping G430 Max': 'https://pingmedias3.golfwrx.com/2023_G430_Driver_MAX_Hero_72dpi.jpg',
  'Ping G430 HL': 'https://pingmedias3.golfwrx.com/2023_G430_Driver_HL_Build_Hero_72dpi.jpg',
  
  'Cobra Darkspeed': 'https://www.cobragolf.com/dw/image/v2/BGYB_PRD/on/demandware.static/-/Sites-masterCatalog_Cobra/default/dw84a1a9e9/images/large/darkspeed-driver-001.jpg?sw=500',
  'Cobra Darkspeed LS': 'https://www.cobragolf.com/dw/image/v2/BGYB_PRD/on/demandware.static/-/Sites-masterCatalog_Cobra/default/dw2e1a9e9a/images/large/darkspeed-ls-driver-001.jpg?sw=500',
  'Cobra Darkspeed MAX': 'https://www.cobragolf.com/dw/image/v2/BGYB_PRD/on/demandware.static/-/Sites-masterCatalog_Cobra/default/dw3e1a9e9b/images/large/darkspeed-max-driver-001.jpg?sw=500',
  
  'Mizuno ST-MAX 230': 'https://mizuno-uki.rokka.io/product_detail_1k_jpg/0b70b80f0e92fbacc5c47ad87a47f98ab5a3a4f4.jpg',
  'Mizuno ST-G 230': 'https://mizuno-uki.rokka.io/product_detail_1k_jpg/2b70b80f0e92fbacc5c47ad87a47f98ab5a3a4f5.jpg',
  
  // Fairway Woods
  'TaylorMade Qi10 Fairway': 'https://assets.american-golf.com/resize/productintroinfo/355007-Qi10-FW-Main-SQR-01.jpg?width=500',
  'TaylorMade Qi10 Max Fairway': 'https://assets.american-golf.com/resize/productintroinfo/355008-Qi10-MAX-FW-Main-SQR-01.jpg?width=500',
  
  'Callaway Paradym Ai Smoke Fairway': 'https://media.callawaygolf.com/eyJidWNrZXQiOiJtZWRpYS5jYWxsYXdheWdvbGYuY29tIiwia2V5IjoiY2FsbGF3YXktbWVkaWEvMjAyNF9QYXJhZHltX0FJX1Ntb2tlX0ZhaXJ3YXlfVGVjaF9IZXJvXzFfMTAwMHgxMDAwXzJiYzA0YmQzMy5qcGciLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjUwMCwiZml0IjoiY29udGFpbiIsImJhY2tncm91bmQiOnsiciI6MjU1LCJnIjoyNTUsImIiOjI1NSwiYWxwaGEiOjB9fX19',
  'Callaway Paradym Ai Smoke MAX Fairway': 'https://media.callawaygolf.com/eyJidWNrZXQiOiJtZWRpYS5jYWxsYXdheWdvbGYuY29tIiwia2V5IjoiY2FsbGF3YXktbWVkaWEvMjAyNF9QYXJhZHltX0FJX1Ntb2tlX01BWF9GYWlyd2F5X1RlY2hfSGVyb18xXzEwMDB4MTAwMF8zYmMwNGJkMzQuanBnIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDAsImZpdCI6ImNvbnRhaW4iLCJiYWNrZ3JvdW5kIjp7InIiOjI1NSwiZyI6MjU1LCJiIjoyNTUsImFscGhhIjowfX19fQ==',
  
  'Titleist TSR1 Fairway': 'https://acushnet.scene7.com/is/image/titleist/TSR1_FairwaySole_2023?wid=500&qlt=75',
  'Titleist TSR2 Fairway': 'https://acushnet.scene7.com/is/image/titleist/TSR2_Fairway_Sole_2023?wid=500&qlt=75',
  'Titleist TSR3 Fairway': 'https://acushnet.scene7.com/is/image/titleist/TSR3_Fairway_Sole_2023?wid=500&qlt=75',
  
  'Ping G430 Fairway': 'https://pingmedias3.golfwrx.com/2023_G430_Fairway_Hero_72dpi.jpg',
  'Ping G430 SFT Fairway': 'https://pingmedias3.golfwrx.com/2023_G430_Fairway_SFT_Hero_72dpi.jpg',
  'Ping G430 HL Fairway': 'https://pingmedias3.golfwrx.com/2023_G430_Fairway_HL_Build_Hero_72dpi.jpg',
  
  // Irons
  'TaylorMade P770 (2024)': 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/irons/P770%202024/v1/P770-24-Catalog-Hero.jpg',
  'TaylorMade P7MC (2024)': 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/irons/P7MC%202024/v1/P7MC-24-Catalog-Hero.jpg',
  'TaylorMade P7MB (2024)': 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/irons/P7MB%202024/v1/P7MB-24-Catalog-Hero.jpg',
  'TaylorMade Qi Irons': 'https://assets.american-golf.com/resize/productintroinfo/355162-Qi-Main-SQR-01.jpg?width=500',
  'TaylorMade Qi HL Irons': 'https://assets.american-golf.com/resize/productintroinfo/355163-Qi-HL-Main-SQR-01.jpg?width=500',
  
  'Callaway Apex Pro 24': 'https://media.callawaygolf.com/eyJidWNrZXQiOiJtZWRpYS5jYWxsYXdheWdvbGYuY29tIiwia2V5IjoiY2FsbGF3YXktbWVkaWEvMjAyNF9BcGV4X1Byb19Jcm9uc19UZWNoX0hlcm9fMV8xMDAweDEwMDBfNGJjMDRiZDM1LmpwZyIsImVkaXRzIjp7InJlc2l6ZSI6eyJ3aWR0aCI6NTAwLCJmaXQiOiJjb250YWluIiwiYmFja2dyb3VuZCI6eyJyIjoyNTUsImciOjI1NSwiYiI6MjU1LCJhbHBoYSI6MH19fX0=',
  'Callaway Apex CB 24': 'https://media.callawaygolf.com/eyJidWNrZXQiOiJtZWRpYS5jYWxsYXdheWdvbGYuY29tIiwia2V5IjoiY2FsbGF3YXktbWVkaWEvMjAyNF9BcGV4X0NCX0lyb25zX1RlY2hfSGVyb18xXzEwMDB4MTAwMF81YmMwNGJkMzYuanBnIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDAsImZpdCI6ImNvbnRhaW4iLCJiYWNrZ3JvdW5kIjp7InIiOjI1NSwiZyI6MjU1LCJiIjoyNTUsImFscGhhIjowfX19fQ==',
  'Callaway Apex MB 24': 'https://media.callawaygolf.com/eyJidWNrZXQiOiJtZWRpYS5jYWxsYXdheWdvbGYuY29tIiwia2V5IjoiY2FsbGF3YXktbWVkaWEvMjAyNF9BcGV4X01CX0lyb25zX1RlY2hfSGVyb18xXzEwMDB4MTAwMF82YmMwNGJkMzcuanBnIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDAsImZpdCI6ImNvbnRhaW4iLCJiYWNrZ3JvdW5kIjp7InIiOjI1NSwiZyI6MjU1LCJiIjoyNTUsImFscGhhIjowfX19fQ==',
  'Callaway Paradym Ai Smoke Irons': 'https://media.callawaygolf.com/eyJidWNrZXQiOiJtZWRpYS5jYWxsYXdheWdvbGYuY29tIiwia2V5IjoiY2FsbGF3YXktbWVkaWEvMjAyNF9QYXJhZHltX0FJX1Ntb2tlX0lyb25zX1RlY2hfSGVyb18xXzEwMDB4MTAwMF83YmMwNGJkMzguanBnIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDAsImZpdCI6ImNvbnRhaW4iLCJiYWNrZ3JvdW5kIjp7InIiOjI1NSwiZyI6MjU1LCJiIjoyNTUsImFscGhhIjowfX19fQ==',
  'Callaway Paradym Ai Smoke HL Irons': 'https://media.callawaygolf.com/eyJidWNrZXQiOiJtZWRpYS5jYWxsYXdheWdvbGYuY29tIiwia2V5IjoiY2FsbGF3YXktbWVkaWEvMjAyNF9QYXJhZHltX0FJX1Ntb2tlX0hMX0lyb25zX1RlY2hfSGVyb18xXzEwMDB4MTAwMF84YmMwNGJkMzkuanBnIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDAsImZpdCI6ImNvbnRhaW4iLCJiYWNrZ3JvdW5kIjp7InIiOjI1NSwiZyI6MjU1LCJiIjoyNTUsImFscGhhIjowfX19fQ==',
  
  'Titleist T100 (2023)': 'https://acushnet.scene7.com/is/image/titleist/23T100IronHero?wid=500&qlt=75',
  'Titleist T100S (2023)': 'https://acushnet.scene7.com/is/image/titleist/23T100sIronHero?wid=500&qlt=75',
  'Titleist T150 (2023)': 'https://acushnet.scene7.com/is/image/titleist/23T150IronHero?wid=500&qlt=75',
  'Titleist T200 (2023)': 'https://acushnet.scene7.com/is/image/titleist/23T200IronHero?wid=500&qlt=75',
  'Titleist T350 (2023)': 'https://acushnet.scene7.com/is/image/titleist/23T350IronHero?wid=500&qlt=75',
  
  'Ping Blueprint T': 'https://pingmedias3.golfwrx.com/2024_Blueprint_T_Iron_Hero_72dpi.jpg',
  'Ping Blueprint S': 'https://pingmedias3.golfwrx.com/2024_Blueprint_S_Iron_Hero_72dpi.jpg',
  'Ping i530': 'https://pingmedias3.golfwrx.com/2023_i530_Iron_Hero_72dpi.jpg',
  'Ping i230': 'https://pingmedias3.golfwrx.com/2023_i230_Iron_Hero_72dpi.jpg',
  'Ping G430': 'https://pingmedias3.golfwrx.com/2023_G430_Iron_Hero_72dpi.jpg',
  'Ping G430 HL': 'https://pingmedias3.golfwrx.com/2023_G430_Iron_HL_Build_Hero_72dpi.jpg',
  
  'Mizuno Pro 241': 'https://mizuno-uki.rokka.io/product_detail_1k_jpg/3b70b80f0e92fbacc5c47ad87a47f98ab5a3a4f6.jpg',
  'Mizuno Pro 243': 'https://mizuno-uki.rokka.io/product_detail_1k_jpg/4b70b80f0e92fbacc5c47ad87a47f98ab5a3a4f7.jpg',
  'Mizuno Pro 245': 'https://mizuno-uki.rokka.io/product_detail_1k_jpg/5b70b80f0e92fbacc5c47ad87a47f98ab5a3a4f8.jpg',
  'Mizuno JPX925 Hot Metal': 'https://mizuno-uki.rokka.io/product_detail_1k_jpg/6b70b80f0e92fbacc5c47ad87a47f98ab5a3a4f9.jpg',
  'Mizuno JPX925 Hot Metal HL': 'https://mizuno-uki.rokka.io/product_detail_1k_jpg/7b70b80f0e92fbacc5c47ad87a47f98ab5a3a4fa.jpg',
  'Mizuno JPX925 Forged': 'https://mizuno-uki.rokka.io/product_detail_1k_jpg/8b70b80f0e92fbacc5c47ad87a47f98ab5a3a4fb.jpg',
  'Mizuno JPX 923 Tour': 'https://mizuno-uki.rokka.io/product_detail_1k_jpg/9b70b80f0e92fbacc5c47ad87a47f98ab5a3a4fc.jpg',
  
  // Wedges
  'Titleist Vokey SM10': 'https://acushnet.scene7.com/is/image/titleist/24SM10Wedge60S12RawHero?wid=500&qlt=75',
  'Titleist Vokey SM9': 'https://acushnet.scene7.com/is/image/titleist/SM9_Wedge_58-12D_Tour_Chrome_2021?wid=500&qlt=75',
  
  'Cleveland RTX 6 ZipCore': 'https://www.clevelandgolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-masterCatalog_Cleveland/default/dw8e1a9e9c/images/large/RTX-6-Zipcore-Tour-Satin-001.jpg?sw=500',
  'Cleveland RTX ZipCore': 'https://www.clevelandgolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-masterCatalog_Cleveland/default/dw9e1a9e9d/images/large/RTX-Zipcore-Tour-Satin-001.jpg?sw=500',
  'Cleveland CBX4 ZipCore': 'https://www.clevelandgolf.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-masterCatalog_Cleveland/default/dwae1a9e9e/images/large/CBX4-Zipcore-Tour-Satin-001.jpg?sw=500',
  
  'TaylorMade MG4': 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/wedges/MG4/v1/MG4-Catalog-Hero.jpg',
  'TaylorMade MG3': 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/wedges/MG3/MG3-Chrome-Hero.jpg',
  
  'Ping Glide 4.0': 'https://pingmedias3.golfwrx.com/2022_Glide_4-0_Wedge_Hero_72dpi.jpg',
  'Ping S159': 'https://pingmedias3.golfwrx.com/2024_s159_Wedge_Hero_72dpi.jpg',
  
  // Putters
  'Scotty Cameron Phantom X': 'https://acushnet.scene7.com/is/image/titleist/2024_Phantom_X_5_Face_Tour?wid=500&qlt=75',
  'Scotty Cameron Newport': 'https://acushnet.scene7.com/is/image/titleist/SCGSS_Newport2Plus23_Face?wid=500&qlt=75',
  'Scotty Cameron Newport 2': 'https://acushnet.scene7.com/is/image/titleist/SCGSS_Newport2_23_Face?wid=500&qlt=75',
  'Scotty Cameron Special Select': 'https://acushnet.scene7.com/is/image/titleist/2020_Select_Newport_2_Face?wid=500&qlt=75',
  
  'TaylorMade Spider Tour': 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/putters/Spider%20Tour/v3/Spider-Tour-Black-Catalog-Hero.jpg',
  'TaylorMade TP Hydro Blast': 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/putters/TP%20Hydro%20Blast/v2/TP-Hydro-Blast-Soto-1-Catalog-Hero.jpg',
  
  'Odyssey Ai-ONE': 'https://media.callawaygolf.com/eyJidWNrZXQiOiJtZWRpYS5jYWxsYXdheWdvbGYuY29tIiwia2V5IjoiY2FsbGF3YXktbWVkaWEvMjAyNF9BaS1PTkVfUHV0dGVyX1RlY2hfSGVyb18xXzEwMDB4MTAwMF85YmMwNGJkM2EuanBnIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDAsImZpdCI6ImNvbnRhaW4iLCJiYWNrZ3JvdW5kIjp7InIiOjI1NSwiZyI6MjU1LCJiIjoyNTUsImFscGhhIjowfX19fQ==',
  'Odyssey White Hot OG': 'https://media.callawaygolf.com/eyJidWNrZXQiOiJtZWRpYS5jYWxsYXdheWdvbGYuY29tIiwia2V5IjoiY2FsbGF3YXktbWVkaWEvMjAyMl9XaGl0ZV9Ib3RfT0dfUHV0dGVyX1RlY2hfSGVyb18xXzEwMDB4MTAwMF9hYmMwNGJkM2IuanBnIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDAsImZpdCI6ImNvbnRhaW4iLCJiYWNrZ3JvdW5kIjp7InIiOjI1NSwiZyI6MjU1LCJiIjoyNTUsImFscGhhIjowfX19fQ==',
  
  'Ping PLD Milled': 'https://pingmedias3.golfwrx.com/2023_PLD_Milled_Anser_Hero_72dpi.jpg',
  'Ping Anser': 'https://pingmedias3.golfwrx.com/2021_Anser_Putter_Hero_72dpi.jpg',
  'Ping Heppler': 'https://pingmedias3.golfwrx.com/2020_Heppler_Anser_2_Hero_72dpi.jpg',
  
  // Balls
  'Titleist Pro V1': 'https://acushnet.scene7.com/is/image/titleist/2023ProV1GolfBallSleeve?wid=500&qlt=75',
  'Titleist Pro V1x': 'https://acushnet.scene7.com/is/image/titleist/2023ProV1xGolfBallSleeve?wid=500&qlt=75',
  'Titleist AVX': 'https://acushnet.scene7.com/is/image/titleist/22AVXBallSleeve?wid=500&qlt=75',
  'Titleist Tour Speed': 'https://acushnet.scene7.com/is/image/titleist/21TourSpeedBallSleeve?wid=500&qlt=75',
  
  'TaylorMade TP5': 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/balls/TP5%202024/v1/2024-TP5-Ball-Catalog-Hero.jpg',
  'TaylorMade TP5x': 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/balls/TP5x%202024/v1/2024-TP5x-Ball-Catalog-Hero.jpg',
  'TaylorMade Tour Response': 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/balls/Tour%20Response%202022/Tour-Response-22-Catalog-Hero.jpg',
  
  'Callaway Chrome Soft': 'https://media.callawaygolf.com/eyJidWNrZXQiOiJtZWRpYS5jYWxsYXdheWdvbGYuY29tIiwia2V5IjoiY2FsbGF3YXktbWVkaWEvMjAyNF9DaHJvbWVfU29mdF9CYWxsX1RlY2hfSGVyb18xXzEwMDB4MTAwMF9iYmMwNGJkM2MuanBnIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDAsImZpdCI6ImNvbnRhaW4iLCJiYWNrZ3JvdW5kIjp7InIiOjI1NSwiZyI6MjU1LCJiIjoyNTUsImFscGhhIjowfX19fQ==',
  'Callaway Chrome Tour': 'https://media.callawaygolf.com/eyJidWNrZXQiOiJtZWRpYS5jYWxsYXdheWdvbGYuY29tIiwia2V5IjoiY2FsbGF3YXktbWVkaWEvMjAyNF9DaHJvbWVfVG91cl9CYWxsX1RlY2hfSGVyb18xXzEwMDB4MTAwMF9jYmMwNGJkM2QuanBnIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDAsImZpdCI6ImNvbnRhaW4iLCJiYWNrZ3JvdW5kIjp7InIiOjI1NSwiZyI6MjU1LCJiIjoyNTUsImFscGhhIjowfX19fQ==',
  
  'Bridgestone Tour B X': 'https://www.bridgestonegolf.com/dw/image/v2/BDNT_PRD/on/demandware.static/-/Sites-masterCatalog_Bridgestone/default/dw1e1a9e9f/images/large/tour-b-x-001.jpg?sw=500',
  'Bridgestone Tour B XS': 'https://www.bridgestonegolf.com/dw/image/v2/BDNT_PRD/on/demandware.static/-/Sites-masterCatalog_Bridgestone/default/dw2e1a9ea0/images/large/tour-b-xs-001.jpg?sw=500',
  
  'Srixon Z-Star': 'https://www.srixon.com/dw/image/v2/BGBS_PRD/on/demandware.static/-/Sites-master-catalog/default/dw3e1a9ea1/images/large/z-star-ball-001.jpg?sw=500',
  'Srixon Q-Star Tour': 'https://www.srixon.com/dw/image/v2/BGBS_PRD/on/demandware.static/-/Sites-master-catalog/default/dw4e1a9ea2/images/large/q-star-tour-ball-001.jpg?sw=500',
};

// Category-based fallback images
const CATEGORY_FALLBACKS = {
  driver: 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/drivers/Qi10%20Max/v2/Qi10-Max-Catalog-Hero.jpg',
  fairway_wood: 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/fairway-rescue/Qi10%20Max%20Fairway/v1/Qi10-Max-Fairway-Catalog-Hero.jpg',
  hybrid: 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/fairway-rescue/Qi10%20Rescue/v1/Qi10-Rescue-Catalog-Hero.jpg',
  iron: 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/irons/P790%202023/v1/P790-23-Catalog-Hero.jpg',
  wedge: 'https://acushnet.scene7.com/is/image/titleist/24SM10Wedge56S10ChromeHero?wid=500&qlt=75',
  putter: 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/putters/Spider%20Tour%20X/v1/Spider-Tour-X-Black-Catalog-Hero.jpg',
  balls: 'https://acushnet.scene7.com/is/image/titleist/2023ProV1GolfBallDozen?wid=500&qlt=75',
  bags: 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/bags/FlexTech%20Carry/v5/N2606501-Black-Catalog-Hero.jpg',
  gloves: 'https://assets.american-golf.com/productimages/mainimages/354925_1.jpg?width=500',
  accessories: 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/accessories/Tour%20Towel/v2/Tour-Towel-Black-Catalog-Hero.jpg',
  rangefinder: 'https://www.bushnellgolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-bushnell-golf-master/default/dw1e1a9ea3/images/large/pro-xe-001.jpg?sw=500',
  apparel: 'https://www.footjoy.com/dw/image/v2/AADH_PRD/on/demandware.static/-/Sites-footjoy-master-catalog/default/dw2e1a9ea4/images/large/91919_01.jpg?sw=500'
};

async function updateAllImages() {
  console.log('🏌️ Updating equipment images with public URLs...\n');
  
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
      let imageUrl = PUBLIC_IMAGES[key];
      
      if (!imageUrl) {
        // Try without parentheses for year variants
        const keyWithoutYear = key.replace(/\s*\(\d{4}\)/, '');
        imageUrl = PUBLIC_IMAGES[keyWithoutYear];
      }
      
      if (!imageUrl) {
        // Use category fallback
        imageUrl = CATEGORY_FALLBACKS[item.category] || CATEGORY_FALLBACKS.accessories;
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