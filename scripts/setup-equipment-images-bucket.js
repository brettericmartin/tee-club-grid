import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupEquipmentImagesBucket() {
  console.log('🪣 Setting up equipment-images bucket...\n');
  
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === 'equipment-images');
    
    if (bucketExists) {
      console.log('✅ Bucket "equipment-images" already exists');
    } else {
      // Create bucket
      const { data, error: createError } = await supabase.storage.createBucket('equipment-images', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        return;
      }
      
      console.log('✅ Created bucket "equipment-images"');
    }
    
    // Set up RLS policies
    console.log('\n🔒 Setting up RLS policies...');
    
    const policies = [
      {
        name: 'Public read access for equipment images',
        definition: `
          CREATE POLICY "Public read access for equipment images"
          ON storage.objects FOR SELECT
          USING (bucket_id = 'equipment-images');
        `
      },
      {
        name: 'Service role write access for equipment images',
        definition: `
          CREATE POLICY "Service role write access for equipment images"
          ON storage.objects FOR INSERT
          USING (bucket_id = 'equipment-images' AND auth.role() = 'service_role');
        `
      }
    ];
    
    // Note: These policies need to be run directly in Supabase SQL editor
    console.log('\n📋 Please run these policies in your Supabase SQL editor:\n');
    policies.forEach(policy => {
      console.log(`-- ${policy.name}`);
      console.log(policy.definition);
      console.log();
    });
    
    console.log('✨ Bucket setup complete!');
    
  } catch (error) {
    console.error('Error setting up bucket:', error);
  }
}

await setupEquipmentImagesBucket();