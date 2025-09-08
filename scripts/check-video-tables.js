import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkVideoTables() {
  try {
    console.log('Checking video-related tables...\n');

    // Check if user_bag_videos table exists
    const { data: bagVideos, error: bagVideosError } = await supabase
      .from('user_bag_videos')
      .select('*')
      .limit(1);

    if (bagVideosError) {
      console.log('❌ user_bag_videos table:', bagVideosError.message);
    } else {
      console.log('✅ user_bag_videos table exists');
      if (bagVideos && bagVideos[0]) {
        console.log('   Sample columns:', Object.keys(bagVideos[0]).join(', '));
      } else {
        console.log('   Table is empty');
      }
    }

    // Check if equipment_videos table exists
    const { data: equipVideos, error: equipVideosError } = await supabase
      .from('equipment_videos')
      .select('*')
      .limit(1);

    if (equipVideosError) {
      console.log('❌ equipment_videos table:', equipVideosError.message);
    } else {
      console.log('✅ equipment_videos table exists');
      if (equipVideos && equipVideos[0]) {
        console.log('   Sample columns:', Object.keys(equipVideos[0]).join(', '));
      } else {
        console.log('   Table is empty');
      }
    }

    // Check RLS policies on user_bag_videos
    console.log('\nChecking RLS policies for user_bag_videos...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies', { table_name: 'user_bag_videos' })
      .single();

    if (policiesError) {
      // Try a simpler query to test
      const { count, error: countError } = await supabase
        .from('user_bag_videos')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.log('❌ Cannot access user_bag_videos:', countError.message);
      } else {
        console.log('✅ user_bag_videos is accessible (count:', count || 0, ')');
      }
    } else {
      console.log('✅ RLS policies found:', policies);
    }

    // Test inserting a video (with rollback)
    console.log('\nTesting video insert capability...');
    const testVideo = {
      user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      bag_id: '00000000-0000-0000-0000-000000000000',   // Dummy UUID
      provider: 'youtube',
      video_id: 'dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Test Video',
      share_to_feed: false
    };

    const { data: insertTest, error: insertError } = await supabase
      .from('user_bag_videos')
      .insert(testVideo)
      .select();

    if (insertError) {
      if (insertError.message.includes('violates foreign key constraint')) {
        console.log('✅ Table structure is correct (foreign key constraints working)');
      } else {
        console.log('⚠️  Insert test failed:', insertError.message);
      }
    } else {
      console.log('✅ Insert capability confirmed');
      // Clean up test data
      if (insertTest && insertTest[0]) {
        await supabase
          .from('user_bag_videos')
          .delete()
          .eq('id', insertTest[0].id);
        console.log('   Test data cleaned up');
      }
    }

  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

checkVideoTables();