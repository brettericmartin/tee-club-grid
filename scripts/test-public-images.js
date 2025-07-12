import axios from 'axios';

const testImages = [
  {
    name: 'American Golf - TaylorMade Qi10',
    url: 'https://assets.american-golf.com/resize/productintroinfo/354654-Qi10-Main-SQR-01.jpg?width=500'
  },
  {
    name: 'Callaway Media - Paradym',
    url: 'https://media.callawaygolf.com/eyJidWNrZXQiOiJtZWRpYS5jYWxsYXdheWdvbGYuY29tIiwia2V5IjoiY2FsbGF3YXktbWVkaWEvMjAyNF9QYXJhZHltX0FJX1Ntb2tlX0RyaXZlcl9Ub3VyX1RlY2hfSGVyb18xXzEwMDB4MTAwMF8xMGI0N2FmMzE1LmpwZyIsImVkaXRzIjp7InJlc2l6ZSI6eyJ3aWR0aCI6NTAwLCJmaXQiOiJjb250YWluIiwiYmFja2dyb3VuZCI6eyJyIjoyNTUsImciOjI1NSwiYiI6MjU1LCJhbHBoYSI6MH19fX0='
  },
  {
    name: 'Titleist - TSR2',
    url: 'https://acushnet.scene7.com/is/image/titleist/TSR2_Driver_Sole_2023?wid=500&qlt=75'
  },
  {
    name: 'Ping Media - G430',
    url: 'https://pingmedias3.golfwrx.com/2023_G430_Driver_MAX_Hero_72dpi.jpg'
  },
  {
    name: 'TaylorMade Media - P770',
    url: 'https://media.taylormadegolf.com/image/upload/f_auto,q_auto,w_768/v1/prod/product/irons/P770%202024/v1/P770-24-Catalog-Hero.jpg'
  }
];

async function testPublicImages() {
  console.log('Testing public image URLs...\n');
  
  let successCount = 0;
  
  for (const img of testImages) {
    try {
      const response = await axios.head(img.url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.status === 200) {
        console.log(`✅ ${img.name}: ${response.status}`);
        successCount++;
      } else {
        console.log(`❌ ${img.name}: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${img.name}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Success rate: ${successCount}/${testImages.length}`);
}

testPublicImages().catch(console.error);