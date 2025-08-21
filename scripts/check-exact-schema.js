#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function checkExactSchema() {
  console.log('📊 Checking exact table schemas...\n');

  const tables = ['profiles', 'user_bags', 'forum_threads', 'forum_posts', 'feed_posts', 'bag_equipment'];
  
  for (const table of tables) {
    console.log(`\n${table.toUpperCase()}:`);
    console.log('=' .repeat(50));
    
    // Get column information
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(0); // We just want the structure
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
      continue;
    }
    
    // Try to get actual column info from a single row
    const { data: sampleRow, error: sampleError } = await supabase
      .from(table)
      .select('*')
      .limit(1)
      .single();
    
    if (sampleRow) {
      console.log('Columns found:');
      Object.keys(sampleRow).forEach(col => {
        const value = sampleRow[col];
        const type = value === null ? 'null' : typeof value;
        console.log(`  - ${col} (${type})`);
      });
    } else if (sampleError) {
      console.log('No data to inspect, error:', sampleError.message);
    } else {
      console.log('Table appears to be empty');
    }
  }
  
  // Specifically check for is_public in user_bags
  console.log('\n\nSPECIFIC CHECK: user_bags.is_public');
  console.log('=' .repeat(50));
  const { data: bagSample, error: bagError } = await supabase
    .from('user_bags')
    .select('*')
    .limit(1)
    .single();
  
  if (bagSample) {
    if ('is_public' in bagSample) {
      console.log('✅ is_public EXISTS in user_bags');
    } else {
      console.log('❌ is_public DOES NOT EXIST in user_bags');
      console.log('Available columns:', Object.keys(bagSample).join(', '));
    }
  }
}

// Run the check
checkExactSchema()
  .then(() => {
    console.log('\n✨ Schema check complete!');
  })
  .catch(error => {
    console.error('\n❌ Check failed:', error);
  });