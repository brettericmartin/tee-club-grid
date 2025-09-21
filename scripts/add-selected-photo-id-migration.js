#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function runMigration() {

  console.log('🔄 Starting migration: Add selected_photo_id to bag_equipment...');

  try {
    // Execute the migration SQL
    const migrationSQL = `
      -- Migration: Add selected_photo_id to bag_equipment for unified photo pool
      -- This replaces the custom_photo_url approach with a reference to equipment_photos

      -- Add the new column to reference equipment_photos
      ALTER TABLE bag_equipment 
      ADD COLUMN selected_photo_id UUID REFERENCES equipment_photos(id);

      -- Add index for performance
      CREATE INDEX IF NOT EXISTS idx_bag_equipment_selected_photo 
      ON bag_equipment(selected_photo_id);

      -- Add comment to document the new approach
      COMMENT ON COLUMN bag_equipment.selected_photo_id IS 
      'References equipment_photos.id - allows users to select any photo from the unified photo pool for this equipment. Replaces custom_photo_url approach to eliminate duplicates and enable photo sharing between variants.';
    `;

    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: migrationSQL 
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!');
    console.log('📋 Changes made:');
    console.log('   - Added selected_photo_id column to bag_equipment table');
    console.log('   - Created foreign key reference to equipment_photos(id)');
    console.log('   - Added performance index on selected_photo_id');
    console.log('   - Added documentation comment');

    // Verify the column was added
    const { data: tableInfo, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'bag_equipment')
      .eq('column_name', 'selected_photo_id');

    if (verifyError) {
      console.warn('⚠️  Could not verify column creation:', verifyError);
    } else if (tableInfo && tableInfo.length > 0) {
      console.log('✅ Verified: selected_photo_id column exists');
      console.log('   Type:', tableInfo[0].data_type);
      console.log('   Nullable:', tableInfo[0].is_nullable);
    }

  } catch (err) {
    console.error('❌ Unexpected error during migration:', err);
    process.exit(1);
  }
}

runMigration();