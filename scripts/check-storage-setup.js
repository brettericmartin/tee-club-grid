import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkStorageSetup() {
  console.log('🔍 Checking Storage Setup...\n');
  
  try {
    // List all buckets
    const { data: buckets, error: listError } = await supabase.storage
      .listBuckets();
      
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      console.log('\nMake sure you have the correct SUPABASE_SERVICE_KEY in .env.local');
      return;
    }
    
    console.log('📦 Available Storage Buckets:');
    buckets?.forEach(bucket => {
      console.log(`  - ${bucket.name} (${bucket.public ? 'PUBLIC' : 'PRIVATE'})`);
    });
    
    // Check specifically for equipment-photos bucket
    const equipmentBucket = buckets?.find(b => b.name === 'equipment-photos');
    
    if (!equipmentBucket) {
      console.log('\n⚠️  Missing "equipment-photos" bucket!');
      console.log('\nCreating bucket...');
      
      const { data, error: createError } = await supabase.storage
        .createBucket('equipment-photos', {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        });
        
      if (createError) {
        console.error('❌ Error creating bucket:', createError.message);
        console.log('\nPlease create the bucket manually in Supabase dashboard:');
        console.log('1. Go to Storage section');
        console.log('2. Create new bucket named "equipment-photos"');
        console.log('3. Set it to PUBLIC');
        console.log('4. Set file size limit to 10MB');
      } else {
        console.log('✅ Created equipment-photos bucket');
      }
    } else {
      console.log('\n✅ equipment-photos bucket exists');
      console.log(`   Public: ${equipmentBucket.public}`);
      console.log(`   Created: ${new Date(equipmentBucket.created_at).toLocaleDateString()}`);
    }
    
    // Test upload permissions
    console.log('\n🧪 Testing Upload Permissions...');
    
    const testFileName = `test-${Date.now()}.txt`;
    const testFile = new Blob(['test'], { type: 'text/plain' });
    
    const { error: uploadError } = await supabase.storage
      .from('equipment-photos')
      .upload(testFileName, testFile);
      
    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError.message);
      console.log('\n⚠️  Storage Policies might need adjustment:');
      console.log('1. Go to Supabase Dashboard > Storage > Policies');
      console.log('2. Add these policies for equipment-photos bucket:');
      console.log('   - INSERT: authenticated users can upload to their folder');
      console.log('   - SELECT: anyone can view (for public access)');
      console.log('   - UPDATE: users can update their own files');
      console.log('   - DELETE: users can delete their own files');
      
      console.log('\nExample INSERT policy:');
      console.log(`((auth.uid())::text = (storage.foldername(name))[1])`);
    } else {
      console.log('✅ Upload test successful');
      
      // Clean up test file
      await supabase.storage
        .from('equipment-photos')
        .remove([testFileName]);
    }
    
    // Check equipment_photos table
    console.log('\n📊 Checking equipment_photos table...');
    const { count, error: countError } = await supabase
      .from('equipment_photos')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('❌ Error accessing equipment_photos table:', countError.message);
    } else {
      console.log(`✅ equipment_photos table accessible (${count || 0} photos)`);
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
  
  console.log('\n📋 Summary:');
  console.log('- Make sure equipment-photos bucket exists and is PUBLIC');
  console.log('- Check that storage policies allow authenticated users to upload');
  console.log('- Verify equipment_photos table has proper RLS policies');
  console.log('- Test with a real user account (not service key)');
}

checkStorageSetup().catch(console.error);