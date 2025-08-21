#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function getActualTables() {
  console.log('🔍 Getting actual tables and their RLS status...\n');
  
  // List of tables from the schema check
  const allTables = [
    'profiles',
    'equipment', 
    'user_bags',
    'bag_equipment',
    'equipment_photos',
    'equipment_reports',
    'equipment_reviews',
    'equipment_saves',
    'equipment_wishlist',
    'feed_posts',
    'feed_likes', 
    'feed_comments',
    'bag_likes',
    'bag_tees',
    'user_follows',
    'user_badges',
    'badge_definitions',
    'shafts',
    'grips',
    'loft_options',
    'forum_categories',
    'forum_threads',
    'forum_posts',
    'forum_reactions'
  ];

  const userWritableTables = [];
  const publicReadTables = [];
  const errorTables = [];

  console.log('📊 Testing table access patterns...\n');

  for (const tableName of allTables) {
    try {
      // Test if we can access the table
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ ${tableName}: Table does not exist`);
          continue;
        } else if (error.message.includes('row-level security')) {
          console.log(`🔒 ${tableName}: RLS enabled (proper security)`);
          userWritableTables.push(tableName);
        } else if (error.message.includes('permission denied')) {
          console.log(`🚫 ${tableName}: Access denied (likely has RLS)`);
          userWritableTables.push(tableName);
        } else {
          console.log(`❓ ${tableName}: Other error - ${error.message}`);
          errorTables.push(tableName);
        }
      } else {
        console.log(`⚠️  ${tableName}: Public read access (may need RLS)`);
        publicReadTables.push(tableName);
      }
      
    } catch (err) {
      console.log(`❌ ${tableName}: Exception - ${err.message}`);
      errorTables.push(tableName);
    }
  }

  console.log('\n📋 SUMMARY:\n');
  
  console.log('🔒 Tables with RLS/Access Control:');
  userWritableTables.forEach(table => console.log(`   - ${table}`));
  
  console.log('\n⚠️  Tables with Public Read Access:');
  publicReadTables.forEach(table => console.log(`   - ${table}`));
  
  console.log('\n❌ Tables with Errors:');
  errorTables.forEach(table => console.log(`   - ${table}`));

  console.log('\n🎯 USER-WRITABLE TABLES THAT NEED RLS POLICIES:\n');
  
  const needsRLSPolicies = [
    // Core user data
    'profiles',
    'user_bags',
    'bag_equipment',
    
    // User-generated content
    'equipment_photos',
    'equipment_reports', 
    'equipment_reviews',
    'equipment_saves',
    'equipment_wishlist',
    
    // Feed system
    'feed_posts',
    'feed_likes',
    'feed_comments',
    
    // Social features
    'bag_likes',
    'bag_tees',
    'user_follows',
    
    // Badge system
    'user_badges',
    
    // Forum system
    'forum_threads',
    'forum_posts', 
    'forum_reactions'
  ];

  console.log('Tables that MUST have RLS policies (user data):');
  needsRLSPolicies.forEach(table => {
    const status = userWritableTables.includes(table) ? '✅ Protected' : 
                   publicReadTables.includes(table) ? '❌ NEEDS RLS' :
                   '❓ Unknown';
    console.log(`   - ${table}: ${status}`);
  });

  console.log('\n📖 READ-ONLY TABLES (may not need RLS):');
  const readOnlyTables = [
    'equipment',           // Equipment catalog (publicly browseable)
    'badge_definitions',   // Badge types (public reference)
    'shafts',             // Shaft options (public reference)
    'grips',              // Grip options (public reference)
    'loft_options',       // Loft options (public reference)
    'forum_categories'    // Forum categories (public reference)
  ];
  
  readOnlyTables.forEach(table => {
    const status = publicReadTables.includes(table) ? '✅ Public Read OK' : 
                   userWritableTables.includes(table) ? '⚠️  Has RLS (may be unnecessary)' :
                   '❓ Unknown';
    console.log(`   - ${table}: ${status}`);
  });

  return {
    userWritableTables,
    publicReadTables,
    errorTables,
    needsRLSPolicies
  };
}

// Run the analysis
getActualTables()
  .then(() => {
    console.log('\n✨ Table analysis complete!');
  })
  .catch(error => {
    console.error('\n❌ Analysis failed:', error);
  });