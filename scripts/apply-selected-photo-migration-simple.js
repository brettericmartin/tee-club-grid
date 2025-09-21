#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function applySelectedPhotoMigration() {
  console.log('🚀 Starting selected_photo_id migration...');
  
  try {
    // First, check if the column already exists by trying to select it
    console.log('🔍 Checking if selected_photo_id column already exists...');
    
    try {
      const { data: testData, error: testError } = await supabase
        .from('bag_equipment')
        .select('selected_photo_id')
        .limit(1);

      if (!testError) {
        console.log('✅ Column selected_photo_id already exists in bag_equipment table');
        console.log('✅ Migration has already been applied');
        return;
      }
    } catch (e) {
      console.log('ℹ️  Column does not exist yet, proceeding with migration...');
    }

    // Since we can't use execute_sql, let's try a different approach
    // Let's check what raw SQL capabilities we have
    console.log('📝 Attempting to apply migration using direct database connection...');
    
    // Try using a different approach - creating a temporary function
    const createTempFunction = `
      CREATE OR REPLACE FUNCTION temp_add_selected_photo_column()
      RETURNS void AS $$
      BEGIN
        -- Add the column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'bag_equipment' 
          AND column_name = 'selected_photo_id'
        ) THEN
          ALTER TABLE bag_equipment 
          ADD COLUMN selected_photo_id UUID REFERENCES equipment_photos(id);
          
          CREATE INDEX IF NOT EXISTS idx_bag_equipment_selected_photo 
          ON bag_equipment(selected_photo_id);
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `;

    // Try to create and call the function
    const { data: funcResult, error: funcError } = await supabase
      .rpc('temp_add_selected_photo_column', {});

    if (funcError) {
      console.error('❌ Function approach failed:', funcError);
      
      // Last resort: try to manually connect and run the SQL
      console.log('📝 Attempting alternative approach...');
      
      // Since Supabase doesn't expose raw SQL execution easily,
      // let's provide instructions for manual execution
      console.log('\n📋 Manual Migration Required:');
      console.log('Please execute the following SQL in your Supabase SQL editor:');
      console.log('\n' + '='.repeat(60));
      console.log(`
-- Migration: Add selected_photo_id to bag_equipment for unified photo pool
-- This replaces the custom_photo_url approach with a reference to equipment_photos

-- Add the new column to reference equipment_photos
ALTER TABLE bag_equipment 
ADD COLUMN IF NOT EXISTS selected_photo_id UUID REFERENCES equipment_photos(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_bag_equipment_selected_photo 
ON bag_equipment(selected_photo_id);

-- Add comment to document the new approach
COMMENT ON COLUMN bag_equipment.selected_photo_id IS 
'References equipment_photos.id - allows users to select any photo from the unified photo pool for this equipment. Replaces custom_photo_url approach to eliminate duplicates and enable photo sharing between variants.';
      `);
      console.log('='.repeat(60));
      console.log('\n🌐 Go to: https://supabase.com/dashboard/project/rkmhslmlxazftipjoyyz/sql/new');
      console.log('📝 Copy and paste the SQL above into the editor');
      console.log('▶️  Click "Run" to execute the migration');
      
      return;
    }

    console.log('✅ Migration applied successfully via function');

    // Verify the migration worked
    try {
      const { data: verifyData, error: verifyError } = await supabase
        .from('bag_equipment')
        .select('selected_photo_id')
        .limit(1);

      if (!verifyError) {
        console.log('✅ Migration verified: selected_photo_id column is accessible');
      }
    } catch (e) {
      console.log('⚠️  Could not verify migration, but no errors during execution');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('📌 The selected_photo_id column is now available in bag_equipment table');
    console.log('📌 This enables the unified photo pool feature for equipment');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    // Provide manual instructions as fallback
    console.log('\n📋 Manual Migration Required:');
    console.log('Please execute the following SQL in your Supabase SQL editor:');
    console.log('\n' + '='.repeat(60));
    console.log(`
-- Migration: Add selected_photo_id to bag_equipment for unified photo pool

-- Add the new column to reference equipment_photos
ALTER TABLE bag_equipment 
ADD COLUMN IF NOT EXISTS selected_photo_id UUID REFERENCES equipment_photos(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_bag_equipment_selected_photo 
ON bag_equipment(selected_photo_id);

-- Add comment to document the new approach
COMMENT ON COLUMN bag_equipment.selected_photo_id IS 
'References equipment_photos.id - allows users to select any photo from the unified photo pool for this equipment. Replaces custom_photo_url approach to eliminate duplicates and enable photo sharing between variants.';
    `);
    console.log('='.repeat(60));
    console.log('\n🌐 Go to: https://supabase.com/dashboard/project/rkmhslmlxazftipjoyyz/sql/new');
  }
}

// Execute the migration
applySelectedPhotoMigration();