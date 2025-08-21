#!/usr/bin/env node

import './supabase-admin.js';
import { supabase } from './supabase-admin.js';

async function checkUserColumns() {
  console.log('🔍 CHECKING USER-RELATED COLUMN NAMES');
  console.log('================================================================================');

  const tablesToCheck = [
    'equipment_photos',
    'equipment', 
    'equipment_reviews',
    'equipment_saves',
    'equipment_wishlist',
    'bag_likes',
    'bag_tees',
    'user_follows',
    'user_badges',
    'forum_threads',
    'forum_posts', 
    'forum_reactions',
    'feed_comments'
  ];

  for (const table of tablesToCheck) {
    try {
      console.log(`\n📋 ${table.toUpperCase()}:`);
      
      const { data: columns, error } = await supabase.rpc('get_table_columns', {
        table_name: table
      });

      if (error && error.code === '42883') {
        // Function doesn't exist, use direct query
        const { data, error: queryError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable')
          .eq('table_schema', 'public')
          .eq('table_name', table)
          .order('ordinal_position');

        if (queryError) {
          console.log(`   ❌ Error querying ${table}: ${queryError.message}`);
          continue;
        }

        if (data && data.length > 0) {
          // Look for user-related columns
          const userColumns = data.filter(col => 
            col.column_name.includes('user') || 
            col.column_name.includes('follower') || 
            col.column_name.includes('following') ||
            col.column_name.includes('uploaded') ||
            col.column_name.includes('added') ||
            col.column_name.includes('created_by') ||
            col.column_name.includes('author')
          );

          if (userColumns.length > 0) {
            userColumns.forEach(col => {
              console.log(`   ✅ ${col.column_name} (${col.data_type})`);
            });
          } else {
            console.log(`   ℹ️  No obvious user-related columns found`);
            // Show all columns for manual inspection
            console.log(`   📝 All columns: ${data.map(c => c.column_name).join(', ')}`);
          }
        } else {
          console.log(`   ⚠️  Table ${table} not found or has no columns`);
        }
      }
    } catch (err) {
      console.log(`   ❌ Error checking ${table}: ${err.message}`);
    }
  }

  console.log('\n✨ User column check complete!');
}

checkUserColumns().catch(console.error);