import axios from 'axios';

const testImages = [
  {
    name: 'TGW - TaylorMade Qi10',
    url: 'https://www.tgw.com/dw/image/v2/BFKH_PRD/on/demandware.static/-/Sites-master-catalog/default/dw3f8c9a1e/images/hires/1MWTM0J01_1.jpg'
  },
  {
    name: 'PGA Tour Superstore - Ping G430',
    url: 'https://www.pgatoursuperstore.com/dw/image/v2/BCFC_PRD/on/demandware.static/-/Sites-master-catalog-pgatss/default/dw9f8c9a1e/images/hires/1000000008277_1.jpg'
  }
];

async function testCDNAccess() {
  console.log('Testing CDN image accessibility...\n');
  
  for (const img of testImages) {
    try {
      const response = await axios.head(img.url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://teed.club/'
        }
      });
      
      console.log(`✅ ${img.name}: ${response.status} - ${response.headers['content-type']}`);
    } catch (error) {
      console.log(`❌ ${img.name}: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Headers:`, error.response.headers);
      }
    }
  }
}

testCDNAccess().catch(console.error);