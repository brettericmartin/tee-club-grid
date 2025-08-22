#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMAs_hmJ9s';

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public'
  }
});

async function checkTables() {
  console.log('🔍 Checking for affiliate links and video tables...\n');
  
  const tablesToCheck = [
    'user_equipment_links',
    'link_clicks', 
    'bag_videos',
    'equipment_videos',
    'community_video_votes'
  ];
  
  const existingTables = [];
  
  for (const tableName of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (!error) {
        console.log(`✅ Table exists: ${tableName}`);
        existingTables.push(tableName);
        
        // Get column info
        const { data: columns, error: columnError } = await supabase.rpc('get_table_columns', { table_name: tableName });
        if (!columnError && columns) {
          console.log(`   Columns: ${columns.map(col => col.column_name).join(', ')}`);
        }
      } else {
        console.log(`❌ Table does not exist: ${tableName}`);
      }
    } catch (err) {
      console.log(`❌ Table does not exist: ${tableName}`);
    }
  }
  
  console.log(`\n📊 Summary: ${existingTables.length} out of ${tablesToCheck.length} tables exist`);
  console.log('Existing tables:', existingTables);
  
  return existingTables;
}

checkTables().catch(console.error);