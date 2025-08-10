#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function checkLikeTables() {
  console.log('🔍 Checking which like/tee tables exist in the database...\n');

  const tablesToCheck = [
    'feed_likes',
    'bag_tees', 
    'bag_likes',
    'equipment_photo_likes',
    'review_tees',
    'comment_tees',
    'likes' // generic likes table
  ];

  const existingTables = [];

  for (const table of tablesToCheck) {
    try {
      // Try to query the table
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);

      if (!error) {
        existingTables.push(table);
        
        // Get count
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        console.log(`✅ ${table}: EXISTS (${count || 0} records)`);
        
        // Get sample to see structure
        const { data: sample } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (sample && sample.length > 0) {
          const columns = Object.keys(sample[0]);
          console.log(`   Columns: ${columns.join(', ')}`);
        }
      } else {
        console.log(`❌ ${table}: NOT FOUND`);
      }
    } catch (e) {
      console.log(`❌ ${table}: ERROR - ${e.message}`);
    }
    console.log('');
  }

  console.log('\n📊 SUMMARY:');
  console.log('Existing tables:', existingTables.join(', ') || 'None found');
  
  // Check if feed_likes has proper structure
  if (existingTables.includes('feed_likes')) {
    console.log('\n🔍 Checking feed_likes structure...');
    const { data } = await supabase
      .from('feed_likes')
      .select('*')
      .limit(5);
      
    if (data && data.length > 0) {
      console.log('Sample feed_likes records:');
      data.forEach(like => {
        console.log(`  - User: ${like.user_id?.substring(0, 8)}... Post: ${like.post_id?.substring(0, 8)}...`);
      });
    }
  }

  // Check if bag_tees is being used for feed posts
  if (existingTables.includes('bag_tees')) {
    console.log('\n🔍 Checking if bag_tees is used for feed posts...');
    const { data, count } = await supabase
      .from('bag_tees')
      .select('*', { count: 'exact' })
      .eq('target_type', 'feed_post')
      .limit(5);
      
    console.log(`Found ${count || 0} feed post tees in bag_tees table`);
    
    if (data && data.length > 0) {
      console.log('Sample bag_tees feed records:');
      data.forEach(tee => {
        console.log(`  - User: ${tee.user_id?.substring(0, 8)}... Target: ${tee.target_id?.substring(0, 8)}...`);
      });
    }
  }

  return existingTables;
}

checkLikeTables()
  .then(tables => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });