import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

console.log('🔍 Testing RLS policies with anonymous key...\n');
console.log('URL:', supabaseUrl);

// Create anonymous client (like the browser would)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQueries() {
  // Test 1: Simple feed_posts query
  console.log('\n1️⃣ Testing feed_posts (simple):');
  try {
    const { data, error } = await supabase
      .from('feed_posts')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('  ❌ Failed:', error.message, error.code);
    } else {
      console.log('  ✅ Success! Returned', data?.length || 0, 'rows');
    }
  } catch (err) {
    console.log('  ❌ Exception:', err.message);
  }

  // Test 2: feed_posts with profile join
  console.log('\n2️⃣ Testing feed_posts with profile join:');
  try {
    const { data, error } = await supabase
      .from('feed_posts')
      .select(`
        *,
        profile:profiles!feed_posts_user_id_fkey(
          username,
          display_name,
          avatar_url
        )
      `)
      .limit(1);
    
    if (error) {
      console.log('  ❌ Failed:', error.message, error.code);
    } else {
      console.log('  ✅ Success! Returned', data?.length || 0, 'rows');
    }
  } catch (err) {
    console.log('  ❌ Exception:', err.message);
  }

  // Test 3: Equipment query
  console.log('\n3️⃣ Testing equipment:');
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('  ❌ Failed:', error.message, error.code);
    } else {
      console.log('  ✅ Success! Returned', data?.length || 0, 'rows');
    }
  } catch (err) {
    console.log('  ❌ Exception:', err.message);
  }

  // Test 4: Profiles query
  console.log('\n4️⃣ Testing profiles:');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('  ❌ Failed:', error.message, error.code);
    } else {
      console.log('  ✅ Success! Returned', data?.length || 0, 'rows');
    }
  } catch (err) {
    console.log('  ❌ Exception:', err.message);
  }

  // Test 5: User bags (the failing query)
  console.log('\n5️⃣ Testing user_bags (simple):');
  try {
    const { data, error } = await supabase
      .from('user_bags')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('  ❌ Failed:', error.message, error.code);
    } else {
      console.log('  ✅ Success! Returned', data?.length || 0, 'rows');
    }
  } catch (err) {
    console.log('  ❌ Exception:', err.message);
  }

  // Test 6: User bags with nested select (the exact failing query)
  console.log('\n6️⃣ Testing user_bags with nested joins:');
  try {
    const { data, error } = await supabase
      .from('user_bags')
      .select(`
        id,
        name,
        description,
        background_image,
        bag_equipment(
          equipment(
            brand,
            model,
            category,
            msrp
          )
        )
      `)
      .limit(1);
    
    if (error) {
      console.log('  ❌ Failed:', error.message, error.code);
      console.log('     Details:', error.details);
      console.log('     Hint:', error.hint);
    } else {
      console.log('  ✅ Success! Returned', data?.length || 0, 'rows');
    }
  } catch (err) {
    console.log('  ❌ Exception:', err.message);
  }

  // Test 7: Bag equipment
  console.log('\n7️⃣ Testing bag_equipment:');
  try {
    const { data, error } = await supabase
      .from('bag_equipment')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('  ❌ Failed:', error.message, error.code);
    } else {
      console.log('  ✅ Success! Returned', data?.length || 0, 'rows');
    }
  } catch (err) {
    console.log('  ❌ Exception:', err.message);
  }
}

testQueries().catch(console.error);