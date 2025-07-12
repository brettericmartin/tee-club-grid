import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testImage(url) {
  try {
    const response = await axios.head(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return {
      valid: response.status === 200,
      contentType: response.headers['content-type'],
      size: response.headers['content-length']
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

async function testCurrentImages() {
  console.log('🧪 Testing current equipment images...\n');
  
  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('id, brand, model, image_url')
    .order('brand');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  let validCount = 0;
  let invalidCount = 0;
  const invalidImages = [];
  
  for (const item of equipment) {
    const result = await testImage(item.image_url);
    
    if (result.valid) {
      validCount++;
      console.log(`✅ ${item.brand} ${item.model}`);
    } else {
      invalidCount++;
      invalidImages.push({
        ...item,
        error: result.error
      });
      console.log(`❌ ${item.brand} ${item.model} - ${result.error}`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Valid images: ${validCount}`);
  console.log(`❌ Invalid images: ${invalidCount}`);
  
  if (invalidImages.length > 0) {
    console.log('\n🔧 Invalid images that need fixing:');
    invalidImages.forEach(item => {
      console.log(`  - ${item.brand} ${item.model}: ${item.image_url}`);
    });
  }
}

testCurrentImages().catch(console.error);