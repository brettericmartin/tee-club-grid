import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUserContentBucket() {
  console.log('🗄️  Setting up user-content storage bucket...\n');

  try {
    // Check if bucket already exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'user-content');

    if (bucketExists) {
      console.log('✅ user-content bucket already exists');
      return;
    }

    // Create the bucket using SQL (more reliable than API)
    const { error: createError } = await supabase.rpc('create_storage_bucket', {
      bucket_name: 'user-content',
      is_public: true
    });

    if (createError && !createError.message.includes('already exists')) {
      console.error('❌ Error creating bucket:', createError);
      
      // Try alternative approach
      console.log('\n🔄 Trying alternative approach...');
      console.log('\nPlease run this SQL in your Supabase SQL Editor:');
      console.log(`
-- Create user-content bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-content',
  'user-content',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Public can view user content" ON storage.objects
FOR SELECT USING (bucket_id = 'user-content');

CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'user-content');

CREATE POLICY "Users can update own uploads" ON storage.objects
FOR UPDATE TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'user-content');

CREATE POLICY "Users can delete own uploads" ON storage.objects
FOR DELETE TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1] AND bucket_id = 'user-content');
      `);
      return;
    }

    console.log('✅ Created user-content bucket successfully');

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\nPlease create the bucket manually in your Supabase dashboard:');
    console.log('1. Go to Storage in your Supabase dashboard');
    console.log('2. Click "New bucket"');
    console.log('3. Name: "user-content"');
    console.log('4. Toggle "Public bucket" to ON');
    console.log('5. Click "Create bucket"');
  }
}

createUserContentBucket();