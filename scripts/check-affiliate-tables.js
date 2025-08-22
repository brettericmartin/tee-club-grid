#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function checkAffiliateVideoTables() {
  console.log('🔍 Checking for affiliate links and video tables...\n');
  
  const tablesToCheck = [
    'user_equipment_links',
    'link_clicks',
    'bag_videos', 
    'equipment_videos',
    'community_video_votes',
    'affiliate_links',
    'video_posts',
    'equipment_links'
  ];
  
  const existingTables = [];
  
  for (const tableName of tablesToCheck) {
    try {
      console.log(`Checking table: ${tableName}...`);
      
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`✅ Table exists: ${tableName} (${count} rows)`);
        existingTables.push(tableName);
        
        // Get first row to see structure
        const { data: sample, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
          
        if (!sampleError && sample && sample.length > 0) {
          console.log(`   Sample columns: ${Object.keys(sample[0]).join(', ')}`);
        }
        
      } else {
        console.log(`❌ Table does not exist: ${tableName}`);
        console.log(`   Error: ${error.message}`);
      }
    } catch (err) {
      console.log(`❌ Table does not exist: ${tableName}`);
      console.log(`   Error: ${err.message}`);
    }
    console.log('');
  }
  
  console.log('📊 SUMMARY');
  console.log('==========');
  console.log(`Existing tables: ${existingTables.length} out of ${tablesToCheck.length}`);
  
  if (existingTables.length > 0) {
    console.log('Tables found:', existingTables.join(', '));
  } else {
    console.log('❌ No affiliate or video tables found in the database');
    console.log('✨ You may need to run migrations to create these tables first');
  }
  
  return existingTables;
}

checkAffiliateVideoTables().catch(console.error);