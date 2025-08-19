import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function testAnonymousAccess() {
  console.log('\n🧪 Testing anonymous access to Supabase...\n');
  
  // Create client with anon key (same as browser would use)
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  
  const tables = ['feed_posts', 'equipment', 'user_bags', 'profiles', 'bag_equipment'];
  
  for (const table of tables) {
    try {
      console.log(`Testing ${table}...`);
      const { data, error, status, statusText } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`  ❌ ${table}: ${error.message} (${error.code})`);
        if (error.message.includes('row-level security')) {
          console.log(`     RLS is blocking read access!`);
        }
      } else {
        console.log(`  ✅ ${table}: Can read (${data?.length || 0} rows returned)`);
      }
    } catch (err) {
      console.log(`  ❌ ${table}: Unexpected error - ${err.message}`);
    }
  }
  
  // Test a specific known bag ID
  console.log('\n📦 Testing specific bag fetch (like BagShowcaseLarge does)...');
  try {
    const { data, error } = await supabase
      .from('user_bags')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url
        ),
        bag_equipment (
          id,
          equipment_id,
          is_featured,
          custom_photo_url,
          equipment:equipment_id (
            id,
            brand,
            model,
            category,
            image_url
          )
        )
      `)
      .eq('id', 'f506f87e-223e-4fa4-beee-f0094915a965')
      .single();
    
    if (error) {
      console.log(`  ❌ Bag fetch failed: ${error.message}`);
      console.log(`     This is why BagShowcaseLarge isn't loading!`);
    } else {
      console.log(`  ✅ Bag fetch successful!`);
      console.log(`     Bag name: ${data?.name}`);
      console.log(`     Equipment count: ${data?.bag_equipment?.length || 0}`);
    }
  } catch (err) {
    console.log(`  ❌ Unexpected error: ${err.message}`);
  }
}

testAnonymousAccess().catch(console.error);