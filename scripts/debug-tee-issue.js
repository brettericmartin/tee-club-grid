import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function debugTeeIssue() {
  console.log('🔍 Debugging Tee Persistence Issue\n');

  try {
    // 1. Check if equipment_photo_likes table exists and has proper structure
    console.log('1. Checking equipment_photo_likes table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'equipment_photo_likes'
          ORDER BY ordinal_position;
        `
      }).single();

    if (tableError) {
      // Try direct query
      const { data: testData, error: testError } = await supabase
        .from('equipment_photo_likes')
        .select('*')
        .limit(5);
      
      if (!testError) {
        console.log('✅ Table exists and is accessible');
        console.log('   Sample data:', testData);
      } else {
        console.log('❌ Table error:', testError.message);
      }
    }

    // 2. Check current likes in the table
    console.log('\n2. Current equipment_photo_likes records:');
    const { data: likes, error: likesError, count } = await supabase
      .from('equipment_photo_likes')
      .select('*', { count: 'exact' });
    
    if (!likesError) {
      console.log(`   Total records: ${count || 0}`);
      if (likes && likes.length > 0) {
        console.log('   Recent likes:', likes.slice(0, 3));
      }
    } else {
      console.log('❌ Error fetching likes:', likesError.message);
    }

    // 3. Test inserting a like
    console.log('\n3. Testing like insertion...');
    
    // Get a sample photo
    const { data: samplePhoto } = await supabase
      .from('equipment_photos')
      .select('id, equipment_id, likes_count')
      .gt('id', '00000000-0000-0000-0000-000000000000')
      .limit(1)
      .single();
    
    if (samplePhoto) {
      console.log(`   Test photo ID: ${samplePhoto.id}`);
      console.log(`   Current likes_count: ${samplePhoto.likes_count || 0}`);
      
      // Try to insert a test like
      const testUserId = 'test-' + Date.now();
      const { data: insertData, error: insertError } = await supabase
        .from('equipment_photo_likes')
        .insert({
          photo_id: samplePhoto.id,
          user_id: testUserId
        })
        .select()
        .single();
      
      if (!insertError) {
        console.log('✅ Test like inserted successfully:', insertData);
        
        // Check if likes_count was updated
        const { data: updatedPhoto } = await supabase
          .from('equipment_photos')
          .select('likes_count')
          .eq('id', samplePhoto.id)
          .single();
        
        console.log(`   Updated likes_count: ${updatedPhoto?.likes_count || 0}`);
        
        // Clean up test like
        await supabase
          .from('equipment_photo_likes')
          .delete()
          .eq('id', insertData.id);
        
        console.log('   Test like cleaned up');
      } else {
        console.log('❌ Insert error:', insertError.message);
        console.log('   Error details:', insertError);
      }
    }

    // 4. Check RLS policies
    console.log('\n4. Checking RLS policies...');
    const { data: policies, error: policyError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
          FROM pg_policies
          WHERE tablename = 'equipment_photo_likes';
        `
      }).single();
    
    if (!policyError && policies) {
      console.log('   RLS Policies:', policies);
    } else {
      console.log('   Could not fetch RLS policies (may need manual check)');
    }

    // 5. Check if the trigger exists
    console.log('\n5. Checking triggers...');
    const { data: triggers, error: triggerError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT trigger_name, event_manipulation, event_object_table
          FROM information_schema.triggers
          WHERE event_object_table = 'equipment_photo_likes';
        `
      }).single();
    
    if (!triggerError && triggers) {
      console.log('✅ Triggers found:', triggers);
    } else {
      console.log('⚠️  No triggers found or cannot query');
    }

    // 6. Test with an actual user ID
    console.log('\n6. Checking for real user IDs in auth.users...');
    const { data: users } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(3);
    
    if (users && users.length > 0) {
      console.log('   Sample user IDs:', users.map(u => ({ id: u.id, username: u.username })));
      
      // Check if any of these users have likes
      for (const user of users) {
        const { data: userLikes, count } = await supabase
          .from('equipment_photo_likes')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id);
        
        if (count && count > 0) {
          console.log(`   User ${user.username} has ${count} photo likes`);
        }
      }
    }

    console.log('\n📊 Diagnosis Summary:');
    console.log('================================');
    
    if (!likesError) {
      console.log('✅ Table is accessible');
    } else {
      console.log('❌ Table access issue:', likesError.message);
    }
    
    console.log('\n🔧 Recommended fixes:');
    console.log('1. Ensure the migration was fully applied in Supabase Dashboard');
    console.log('2. Check that RLS is enabled but policies allow INSERT/DELETE for authenticated users');
    console.log('3. Verify that triggers are created to update likes_count');
    console.log('4. Check browser console for any client-side errors when clicking tee buttons');

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugTeeIssue();