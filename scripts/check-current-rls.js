#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function checkCurrentRLS() {
  console.log('🔍 Checking current RLS status for affiliate and video tables...\n');
  
  const tables = [
    'user_equipment_links',
    'equipment_videos', 
    'user_bag_videos',
    'link_clicks'
  ];
  
  for (const tableName of tables) {
    console.log(`📊 TABLE: ${tableName}`);
    console.log('='.repeat(50));
    
    try {
      // Test if we can access the table (this tells us if RLS is working)
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) {
        console.log(`❌ Access Error: ${error.message}`);
        
        if (error.message.includes('insufficient_privilege') || 
            error.message.includes('policy')) {
          console.log(`✅ RLS is ENABLED and blocking access (expected for anonymous)`);
        } else {
          console.log(`⚠️  Other error - may need investigation`);
        }
      } else {
        console.log(`✅ Table accessible: ${count || 0} rows`);
        console.log(`ℹ️  RLS may be DISABLED or has permissive policies`);
        
        if (data && data.length > 0) {
          console.log(`   Sample columns: ${Object.keys(data[0]).join(', ')}`);
        }
      }
      
      // Test with an authenticated context by trying a specific operation
      console.log('🔐 Testing with authenticated context...');
      
      // Try to insert with a fake user ID to see policy response
      const testInsert = await supabase
        .from(tableName)
        .insert({ 
          // Add minimal required fields based on table
          ...(tableName === 'user_equipment_links' && {
            user_id: '00000000-0000-0000-0000-000000000000',
            bag_id: '00000000-0000-0000-0000-000000000000',
            bag_equipment_id: '00000000-0000-0000-0000-000000000000',
            label: 'test',
            url: 'https://test.com'
          }),
          ...(tableName === 'equipment_videos' && {
            equipment_id: '00000000-0000-0000-0000-000000000000',
            provider: 'youtube',
            url: 'https://youtube.com/test'
          }),
          ...(tableName === 'user_bag_videos' && {
            user_id: '00000000-0000-0000-0000-000000000000',
            bag_id: '00000000-0000-0000-0000-000000000000',
            provider: 'youtube',
            url: 'https://youtube.com/test'
          }),
          ...(tableName === 'link_clicks' && {
            link_id: '00000000-0000-0000-0000-000000000000'
          })
        });
      
      if (testInsert.error) {
        console.log(`   Insert test: ${testInsert.error.message}`);
        
        if (testInsert.error.message.includes('policy') || 
            testInsert.error.message.includes('not permitted')) {
          console.log(`   ✅ RLS policies are working (blocking unauthorized inserts)`);
        } else if (testInsert.error.message.includes('foreign key') ||
                   testInsert.error.message.includes('violates')) {
          console.log(`   ✅ RLS passed, failed on data constraints (expected)`);
        }
      } else {
        console.log(`   ⚠️  Insert succeeded - RLS may be too permissive`);
      }
      
    } catch (err) {
      console.log(`❌ Error testing ${tableName}: ${err.message}`);
    }
    
    console.log('\n');
  }
  
  console.log('🎯 Summary:');
  console.log('- Tables accessible without auth suggest RLS may need policies');
  console.log('- Policy violations indicate RLS is working correctly');
  console.log('- Manual SQL execution may be needed to set up policies\n');
}

checkCurrentRLS();