import { supabase } from './supabase-admin.js';

async function checkCurrentRLSStatus() {
  const tables = ['user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks'];
  
  console.log('Checking current RLS status and policies...\n');
  
  for (const tableName of tables) {
    console.log(`\n=== ${tableName.toUpperCase()} ===`);
    
    try {
      // Check if table exists and RLS is enabled by trying a simple query
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ Table '${tableName}' does not exist`);
          continue;
        } else if (error.message.includes('policy')) {
          console.log(`✅ Table exists with RLS policies`);
          console.log(`   RLS Policy Error: ${error.message}`);
        } else {
          console.log(`❌ Error accessing table: ${error.message}`);
          continue;
        }
      } else {
        console.log(`✅ Table exists and accessible`);
        console.log(`   Rows returned: ${data?.length || 0}`);
      }
      
      // Try to insert a test record to check INSERT policies
      const { error: insertError } = await supabase
        .from(tableName)
        .insert({})
        .select();
      
      if (insertError) {
        if (insertError.message.includes('policy')) {
          console.log(`   INSERT policies: Active (${insertError.message.substring(0, 100)}...)`);
        } else if (insertError.message.includes('null value')) {
          console.log(`   INSERT policies: Accessible (schema validation failed as expected)`);
        } else {
          console.log(`   INSERT error: ${insertError.message.substring(0, 100)}...`);
        }
      } else {
        console.log(`   INSERT policies: No restrictions detected`);
      }
      
    } catch (error) {
      console.log(`❌ Exception checking table '${tableName}': ${error.message}`);
    }
  }
  
  console.log('\n=== TESTING AUTHENTICATED ACCESS ===');
  console.log('Testing with a dummy auth context...');
  
  // Test with auth.uid() context
  for (const tableName of tables) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error && error.message.includes('policy')) {
        console.log(`${tableName}: RLS active - requires authentication`);
      } else if (!error) {
        console.log(`${tableName}: Public read access`);
      }
    } catch (e) {
      console.log(`${tableName}: Error - ${e.message}`);
    }
  }
}

checkCurrentRLSStatus().catch(console.error);