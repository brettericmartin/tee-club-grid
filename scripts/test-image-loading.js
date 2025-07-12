import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testImageLoading() {
  console.log('🔍 Testing equipment image URLs...\n');
  
  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, brand, model, category, image_url')
    .order('category')
    .limit(20);
    
  let workingCount = 0;
  let brokenCount = 0;
  const brokenImages = [];
  
  for (const item of equipment) {
    try {
      const response = await axios.head(item.image_url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        validateStatus: function (status) {
          return status >= 200 && status < 500; // Don't throw on 4xx
        }
      });
      
      if (response.status === 200) {
        console.log(`✅ ${item.brand} ${item.model}`);
        workingCount++;
      } else {
        console.log(`❌ ${item.brand} ${item.model} - Status: ${response.status}`);
        brokenImages.push({
          ...item,
          status: response.status
        });
        brokenCount++;
      }
    } catch (error) {
      console.log(`❌ ${item.brand} ${item.model} - Error: ${error.message}`);
      brokenImages.push({
        ...item,
        error: error.message
      });
      brokenCount++;
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Working images: ${workingCount}`);
  console.log(`❌ Broken images: ${brokenCount}`);
  
  if (brokenImages.length > 0) {
    console.log('\n🔧 Broken images that need fixing:');
    brokenImages.forEach(item => {
      console.log(`${item.brand} ${item.model} (${item.category}):`);
      console.log(`  URL: ${item.image_url}`);
      console.log(`  Issue: ${item.status || item.error}`);
    });
  }
}

testImageLoading().catch(console.error);