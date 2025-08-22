#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function getTableSchemas() {
  console.log('🔍 Getting schemas for affiliate and video tables...\n');
  
  const tables = [
    'user_equipment_links',
    'link_clicks',
    'bag_videos', 
    'equipment_videos',
    'community_video_votes',
    'affiliate_links',
    'video_posts',
    'equipment_links'
  ];
  
  for (const tableName of tables) {
    try {
      console.log(`📊 TABLE: ${tableName}`);
      console.log('='.repeat(50));
      
      // Get sample data to understand structure
      const { data: sample, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Error: ${error.message}\n`);
        continue;
      }
      
      if (sample && sample.length > 0) {
        console.log('Columns and types:');
        Object.entries(sample[0]).forEach(([key, value]) => {
          const type = value === null ? 'null' : typeof value;
          console.log(`  ${key}: ${type}`);
        });
      } else {
        console.log('Table is empty, getting structure from information_schema...');
        
        // Try to get column info from a different approach
        const { data: structureData, error: structureError } = await supabase
          .rpc('get_column_info', { table_name: tableName });
          
        if (structureError) {
          console.log('No sample data available and cannot get structure');
        }
      }
      
      // Check current RLS policies
      console.log('\nCurrent RLS policies:');
      const { data: policies, error: policiesError } = await supabase
        .rpc('get_policies', { table_name: tableName });
        
      if (policiesError) {
        console.log('Cannot retrieve policy information');
      } else if (policies && policies.length > 0) {
        policies.forEach(policy => {
          console.log(`  - ${policy.policyname}: ${policy.cmd} for ${policy.roles}`);
        });
      } else {
        console.log('  No RLS policies found');
      }
      
      console.log('\n');
      
    } catch (err) {
      console.log(`❌ Error processing ${tableName}: ${err.message}\n`);
    }
  }
}

getTableSchemas().catch(console.error);