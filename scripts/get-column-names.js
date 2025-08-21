#!/usr/bin/env node

import './supabase-admin.js';
import { supabase } from './supabase-admin.js';

async function getColumnNames() {
  console.log('🔍 GETTING EXACT COLUMN NAMES FOR USER-RELATED FIELDS');
  console.log('================================================================================');

  const tables = [
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

  for (const tableName of tables) {
    try {
      console.log(`\n📋 ${tableName.toUpperCase()}:`);
      
      // Try to get one row to see the actual columns
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
        continue;
      }

      if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        const userRelatedColumns = columns.filter(col => 
          col.includes('user') || 
          col.includes('follower') || 
          col.includes('following') ||
          col.includes('uploaded') ||
          col.includes('added') ||
          col.includes('created_by') ||
          col.includes('author') ||
          col.includes('owner')
        );

        if (userRelatedColumns.length > 0) {
          userRelatedColumns.forEach(col => {
            console.log(`   ✅ User field: ${col}`);
          });
        } else {
          console.log(`   ℹ️  No obvious user fields found`);
        }
        
        console.log(`   📝 All columns: ${columns.join(', ')}`);
      } else {
        console.log(`   ⚠️  Table ${tableName} is empty - checking schema instead`);
        
        // If empty, use a describe-like query
        const { data: schemaData, error: schemaError } = await supabase.rpc('exec', {
          sql: `
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = '${tableName}'
            ORDER BY ordinal_position
          `
        });

        if (schemaError) {
          console.log(`   ❌ Schema error: ${schemaError.message}`);
        } else if (schemaData) {
          const userColumns = schemaData.filter(col => 
            col.column_name.includes('user') || 
            col.column_name.includes('follower') || 
            col.column_name.includes('following') ||
            col.column_name.includes('uploaded') ||
            col.column_name.includes('added') ||
            col.column_name.includes('created_by') ||
            col.column_name.includes('author') ||
            col.column_name.includes('owner')
          );

          if (userColumns.length > 0) {
            userColumns.forEach(col => {
              console.log(`   ✅ User field: ${col.column_name} (${col.data_type})`);
            });
          }
          
          console.log(`   📝 All columns: ${schemaData.map(c => c.column_name).join(', ')}`);
        }
      }
    } catch (err) {
      console.log(`   ❌ Error checking ${tableName}: ${err.message}`);
    }
  }

  console.log('\n✨ Column name check complete!');
}

getColumnNames().catch(console.error);