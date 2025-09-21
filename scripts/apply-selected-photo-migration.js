#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function applySelectedPhotoMigration() {
  console.log('🚀 Starting selected_photo_id migration...');
  
  try {
    // First, check if the column already exists
    console.log('🔍 Checking if selected_photo_id column already exists...');
    
    const { data: columnExists, error: checkError } = await supabase
      .rpc('execute_sql', {
        query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'bag_equipment' 
          AND column_name = 'selected_photo_id';
        `
      });

    if (checkError) {
      console.log('ℹ️  Column check failed, proceeding with migration...');
    } else if (columnExists && columnExists.length > 0) {
      console.log('✅ Column selected_photo_id already exists in bag_equipment table');
      console.log('✅ Migration has already been applied');
      return;
    }

    // Apply the migration
    console.log('📝 Applying migration: Adding selected_photo_id column...');
    
    const migrationSQL = `
      -- Add the new column to reference equipment_photos
      ALTER TABLE bag_equipment 
      ADD COLUMN selected_photo_id UUID REFERENCES equipment_photos(id);
    `;

    const { data: alterResult, error: alterError } = await supabase
      .rpc('execute_sql', { query: migrationSQL });

    if (alterError) {
      console.error('❌ Failed to add column:', alterError);
      throw alterError;
    }

    console.log('✅ Column added successfully');

    // Add the index
    console.log('📝 Creating index...');
    
    const indexSQL = `
      CREATE INDEX IF NOT EXISTS idx_bag_equipment_selected_photo 
      ON bag_equipment(selected_photo_id);
    `;

    const { data: indexResult, error: indexError } = await supabase
      .rpc('execute_sql', { query: indexSQL });

    if (indexError) {
      console.error('❌ Failed to create index:', indexError);
      throw indexError;
    }

    console.log('✅ Index created successfully');

    // Add the comment
    console.log('📝 Adding column comment...');
    
    const commentSQL = `
      COMMENT ON COLUMN bag_equipment.selected_photo_id IS 
      'References equipment_photos.id - allows users to select any photo from the unified photo pool for this equipment. Replaces custom_photo_url approach to eliminate duplicates and enable photo sharing between variants.';
    `;

    const { data: commentResult, error: commentError } = await supabase
      .rpc('execute_sql', { query: commentSQL });

    if (commentError) {
      console.error('❌ Failed to add comment:', commentError);
      throw commentError;
    }

    console.log('✅ Column comment added successfully');

    // Verify the migration
    console.log('🔍 Verifying migration...');
    
    const { data: verification, error: verifyError } = await supabase
      .rpc('execute_sql', {
        query: `
          SELECT 
            column_name, 
            data_type, 
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = 'bag_equipment' 
          AND column_name = 'selected_photo_id';
        `
      });

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
    } else if (verification && verification.length > 0) {
      console.log('✅ Migration verified successfully');
      console.log('📊 Column details:', verification[0]);
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('📌 The selected_photo_id column is now available in bag_equipment table');
    console.log('📌 This enables the unified photo pool feature for equipment');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Execute the migration
applySelectedPhotoMigration();