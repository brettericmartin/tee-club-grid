import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testDownloads() {
  // Get a few equipment items to test
  const { data: equipment } = await supabase
    .from('equipment')
    .select('brand, model, image_url')
    .not('image_url', 'is', null)
    .limit(5);
    
  console.log('Testing image downloads...\n');
  
  for (const item of equipment) {
    try {
      const response = await axios.get(item.image_url, {
        responseType: 'arraybuffer',
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*'
        },
        maxRedirects: 5
      });
      
      const size = response.data.length;
      const contentType = response.headers['content-type'];
      
      console.log(`✅ ${item.brand} ${item.model}`);
      console.log(`   Size: ${(size / 1024).toFixed(0)}KB, Type: ${contentType}`);
    } catch (error) {
      console.log(`❌ ${item.brand} ${item.model}`);
      console.log(`   Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
      }
    }
  }
}

testDownloads().catch(console.error);