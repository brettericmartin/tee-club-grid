import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorageBuckets() {
  console.log('\n🪣 Setting Up Storage Buckets\n');
  console.log('=============================\n');

  const buckets = [
    {
      name: 'equipment-photos',
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    }
  ];

  for (const bucket of buckets) {
    try {
      // Check if bucket exists
      const { data: existingBucket, error: checkError } = await supabase.storage
        .getBucket(bucket.name);

      if (existingBucket) {
        console.log(`✅ Bucket '${bucket.name}' already exists`);
        
        // Update bucket settings if needed
        const { error: updateError } = await supabase.storage
          .updateBucket(bucket.name, {
            public: bucket.public,
            fileSizeLimit: bucket.fileSizeLimit,
            allowedMimeTypes: bucket.allowedMimeTypes
          });
        
        if (updateError) {
          console.error(`Error updating bucket '${bucket.name}':`, updateError.message);
        } else {
          console.log(`   Updated settings for '${bucket.name}'`);
        }
      } else {
        // Create bucket
        const { data, error: createError } = await supabase.storage
          .createBucket(bucket.name, {
            public: bucket.public,
            fileSizeLimit: bucket.fileSizeLimit,
            allowedMimeTypes: bucket.allowedMimeTypes
          });

        if (createError) {
          console.error(`❌ Error creating bucket '${bucket.name}':`, createError.message);
        } else {
          console.log(`✅ Created bucket '${bucket.name}'`);
        }
      }
    } catch (error) {
      console.error(`Error with bucket '${bucket.name}':`, error);
    }
  }

  console.log('\n⚠️  IMPORTANT: If you see "not authorized" errors above:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to Storage');
  console.log('3. Create a new bucket called "equipment-photos"');
  console.log('4. Set it to PUBLIC');
  console.log('5. Set file size limit to 10MB');
  console.log('6. Allow image/jpeg, image/png, image/webp mime types\n');

  console.log('Storage policies needed (add in Supabase dashboard):');
  console.log('- INSERT: authenticated users can upload');
  console.log('- SELECT: public can view');
  console.log('- UPDATE: users can update their own uploads');
  console.log('- DELETE: users can delete their own uploads\n');

  console.log('=============================\n');
}

setupStorageBuckets().catch(console.error);