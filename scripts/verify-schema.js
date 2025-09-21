#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function verifySchema() {
  console.log('🔍 Checking current bag_equipment schema...');

  try {
    // Check current table structure using a simple query approach
    const { data: sampleData, error } = await supabase
      .from('bag_equipment')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Cannot access bag_equipment table:', error);
      return;
    }

    if (sampleData && sampleData.length > 0) {
      const columns = Object.keys(sampleData[0]);
      console.log('📋 Current bag_equipment columns:');
      columns.forEach(col => console.log(`   - ${col}`));
      
      if (columns.includes('selected_photo_id')) {
        console.log('✅ selected_photo_id column already exists!');
      } else {
        console.log('❌ selected_photo_id column does NOT exist');
        console.log('\n📋 Migration SQL to run manually in Supabase SQL Editor:');
        console.log(`
-- Migration: Add selected_photo_id to bag_equipment for unified photo pool
ALTER TABLE bag_equipment 
ADD COLUMN selected_photo_id UUID REFERENCES equipment_photos(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_bag_equipment_selected_photo 
ON bag_equipment(selected_photo_id);

-- Add comment
COMMENT ON COLUMN bag_equipment.selected_photo_id IS 
'References equipment_photos.id - allows users to select any photo from the unified photo pool for this equipment. Replaces custom_photo_url approach to eliminate duplicates and enable photo sharing between variants.';
        `);
      }
    } else {
      console.log('📋 bag_equipment table is empty, cannot determine current schema');
      console.log('🔄 Attempting to insert a test record to check schema...');
      
      // Try inserting a minimal test record to see what columns exist
      const { error: insertError } = await supabase
        .from('bag_equipment')
        .insert({ 
          user_id: '00000000-0000-0000-0000-000000000000',
          bag_id: '00000000-0000-0000-0000-000000000000',
          equipment_id: '00000000-0000-0000-0000-000000000000'
        });
      
      if (insertError) {
        console.log('Expected insert error (testing schema):', insertError.message);
        // Check if the error mentions selected_photo_id
        if (insertError.message.includes('selected_photo_id')) {
          console.log('✅ selected_photo_id column exists (mentioned in error)');
        } else {
          console.log('❌ selected_photo_id column likely does NOT exist');
        }
      }
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

verifySchema();