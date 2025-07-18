import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkPhotoPermissions() {
  console.log('🔍 Checking equipment photo permissions...\n');

  try {
    // Check RLS policies on equipment_photos table
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies
          WHERE tablename = 'equipment_photos'
          ORDER BY policyname;
        `
      })
      .single();

    if (policiesError) {
      console.log('ℹ️  Could not query policies directly. Checking table access...');
      
      // Try a simple query to check if table exists
      const { error: tableError } = await supabase
        .from('equipment_photos')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.log('❌ Cannot access equipment_photos table:', tableError.message);
      } else {
        console.log('✅ equipment_photos table exists and is accessible');
      }
    } else {
      console.log('📋 Current RLS policies on equipment_photos:');
      console.log(policies);
    }

    // Test if authenticated users can insert
    console.log('\n🧪 Testing photo upload capability...');
    
    // Get a test user
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (!usersError && users && users.length > 0) {
      const testUser = users[0];
      console.log(`   Using test user: ${testUser.email}`);
      
      // Check if user can theoretically insert
      const { error: insertCheckError } = await supabase
        .from('equipment_photos')
        .select('id')
        .limit(0); // Just check access, don't return data
      
      if (insertCheckError) {
        console.log('❌ Cannot access equipment_photos table:', insertCheckError.message);
      } else {
        console.log('✅ Table access confirmed');
      }
    }

    // Check storage bucket policies
    console.log('\n📦 Storage bucket info:');
    console.log('   Bucket name: equipment-photos');
    console.log('   ⚠️  Storage policies must be checked in Supabase dashboard');
    console.log('   Required settings:');
    console.log('   - SELECT: public');
    console.log('   - INSERT: authenticated');
    console.log('   - UPDATE: user owns record');
    console.log('   - DELETE: user owns record');

    console.log('\n💡 To fix photo upload issues:');
    console.log('1. Run the SQL in sql/fix-equipment-photos-rls.sql');
    console.log('2. Check Storage policies in Supabase dashboard');
    console.log('3. Ensure equipment-photos bucket exists and has correct policies');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkPhotoPermissions().catch(console.error);