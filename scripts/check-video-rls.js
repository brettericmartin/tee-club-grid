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

async function checkVideoRLS() {
  try {
    console.log('Checking RLS policies for user_bag_videos table...\n');

    // Get RLS policies for user_bag_videos
    const { data: policies, error } = await supabase
      .rpc('get_policies_for_table', { table_name: 'user_bag_videos' });

    if (error) {
      console.log('Error fetching policies:', error);
      
      // Try alternative method - direct query
      const { data: altPolicies, error: altError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'user_bag_videos');
      
      if (altError) {
        console.log('Alternative query also failed:', altError);
        
        // Let's check if the table exists and has RLS enabled
        const { data: tables, error: tableError } = await supabase
          .rpc('get_table_info', { table_name: 'user_bag_videos' });
        
        if (tableError) {
          console.log('Could not get table info. Let\'s check using raw SQL...');
          
          // Check RLS status
          const { data: rlsStatus, error: rlsError } = await supabase.rpc('check_table_rls', {
            schema_name: 'public',
            table_name: 'user_bag_videos'
          });
          
          if (rlsError) {
            console.log('RLS check failed. Trying direct SQL...');
          } else {
            console.log('RLS Status:', rlsStatus);
          }
        } else {
          console.log('Table info:', tables);
        }
      } else {
        console.log('Policies found via alternative method:', altPolicies);
      }
    } else {
      console.log('Policies found:', policies);
    }

    // Let's try to query the actual RLS policies using SQL
    console.log('\n=== Checking RLS policies directly ===\n');
    
    // Check if we can query system tables
    const { data: systemCheck, error: systemError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_bag_videos')
      .single();
    
    if (systemError) {
      console.log('Cannot query system tables directly. This is expected in Supabase.');
    } else {
      console.log('Table exists in schema:', systemCheck);
    }

    // Let's check what columns the table has
    console.log('\n=== Table Structure ===\n');
    const { data: sampleData, error: sampleError } = await supabase
      .from('user_bag_videos')
      .select('*')
      .limit(0);
    
    if (!sampleError) {
      console.log('Table columns:', Object.keys(sampleData).length === 0 ? 'Table structure verified' : Object.keys(sampleData[0]));
    }

    // Check if we can get user_bags table info
    console.log('\n=== Checking user_bags table ===\n');
    const { data: bags, error: bagsError } = await supabase
      .from('user_bags')
      .select('id, user_id, name')
      .limit(1);
    
    if (bagsError) {
      console.log('Error accessing user_bags:', bagsError);
    } else {
      console.log('user_bags table accessible. Sample:', bags);
    }

    // Test insertion with service role (should bypass RLS)
    console.log('\n=== Testing insertion with service role ===\n');
    
    // Get a test user and bag
    const { data: testUser } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();
    
    if (testUser) {
      const { data: testBag } = await supabase
        .from('user_bags')
        .select('id, user_id')
        .eq('user_id', testUser.id)
        .limit(1)
        .single();
      
      if (testBag) {
        console.log('Test user:', testUser.id);
        console.log('Test bag:', testBag.id, 'owned by:', testBag.user_id);
        
        // Try to insert a test video
        const testVideo = {
          user_id: testUser.id,
          bag_id: testBag.id,
          provider: 'youtube',
          video_id: 'test123',
          url: 'https://www.youtube.com/watch?v=test123',
          title: 'RLS Test Video',
          share_to_feed: false
        };
        
        console.log('\nAttempting to insert test video...');
        const { data: insertResult, error: insertError } = await supabase
          .from('user_bag_videos')
          .insert(testVideo)
          .select()
          .single();
        
        if (insertError) {
          console.log('❌ Service role insertion failed:', insertError);
          console.log('   This suggests a constraint or trigger issue, not just RLS');
        } else {
          console.log('✅ Service role insertion succeeded!');
          console.log('   Video ID:', insertResult.id);
          
          // Clean up
          await supabase
            .from('user_bag_videos')
            .delete()
            .eq('id', insertResult.id);
          console.log('   Test video cleaned up');
        }
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkVideoRLS();