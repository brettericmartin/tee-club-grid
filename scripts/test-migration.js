#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function testMigration() {
  console.log('🔄 Testing migration: Add selected_photo_id to bag_equipment...');

  try {
    // First, check if the column already exists
    const { data: existingColumns, error: columnError } = await supabase
      .rpc('exec_sql', { 
        sql_query: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'bag_equipment' 
          AND column_name = 'selected_photo_id';
        `
      });

    if (columnError) {
      console.log('Cannot check existing columns, trying direct execution...');
    } else if (existingColumns && existingColumns.length > 0) {
      console.log('✅ Column selected_photo_id already exists in bag_equipment table');
      return;
    }

    // Try to add the column directly
    console.log('Attempting to add selected_photo_id column...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE bag_equipment ADD COLUMN selected_photo_id UUID REFERENCES equipment_photos(id);'
    });

    if (error) {
      console.error('❌ Direct SQL execution failed:', error);
      console.log('\n📋 Manual SQL needed:');
      console.log('-- Copy and paste this into Supabase SQL Editor:');
      console.log(`
ALTER TABLE bag_equipment 
ADD COLUMN selected_photo_id UUID REFERENCES equipment_photos(id);

CREATE INDEX IF NOT EXISTS idx_bag_equipment_selected_photo 
ON bag_equipment(selected_photo_id);

COMMENT ON COLUMN bag_equipment.selected_photo_id IS 
'References equipment_photos.id - allows users to select any photo from the unified photo pool for this equipment. Replaces custom_photo_url approach to eliminate duplicates and enable photo sharing between variants.';
      `);
    } else {
      console.log('✅ Column added successfully');
      
      // Add index
      await supabase.rpc('exec_sql', {
        sql_query: 'CREATE INDEX IF NOT EXISTS idx_bag_equipment_selected_photo ON bag_equipment(selected_photo_id);'
      });
      
      console.log('✅ Index added successfully');
      console.log('✅ Migration completed!');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    console.log('\n📋 Manual execution required in Supabase SQL Editor:');
    console.log(`
ALTER TABLE bag_equipment 
ADD COLUMN selected_photo_id UUID REFERENCES equipment_photos(id);

CREATE INDEX IF NOT EXISTS idx_bag_equipment_selected_photo 
ON bag_equipment(selected_photo_id);

COMMENT ON COLUMN bag_equipment.selected_photo_id IS 
'References equipment_photos.id - allows users to select any photo from the unified photo pool for this equipment. Replaces custom_photo_url approach to eliminate duplicates and enable photo sharing between variants.';
    `);
  }
}

testMigration();