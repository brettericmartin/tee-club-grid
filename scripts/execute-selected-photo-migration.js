#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Database connection configuration
const supabaseUrl = 'https://rkmhslmlxazftipjoyyz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSelectedPhotoMigration() {
  console.log('🚀 Starting selected_photo_id migration...');
  
  try {
    // SQL migration from the existing migration file
    const migrationSQL = `
      -- Add the new column to reference equipment_photos
      ALTER TABLE bag_equipment 
      ADD COLUMN IF NOT EXISTS selected_photo_id UUID REFERENCES equipment_photos(id);

      -- Add index for performance
      CREATE INDEX IF NOT EXISTS idx_bag_equipment_selected_photo 
      ON bag_equipment(selected_photo_id);

      -- Add comment to document the new approach
      COMMENT ON COLUMN bag_equipment.selected_photo_id IS 
      'References equipment_photos.id - allows users to select any photo from the unified photo pool for this equipment. Replaces custom_photo_url approach to eliminate duplicates and enable photo sharing between variants.';
    `;

    console.log('📝 Executing migration SQL...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration executed successfully!');
    
    // Verify the column was added
    console.log('🔍 Verifying column was added...');
    const { data: columnCheck, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'bag_equipment')
      .eq('column_name', 'selected_photo_id');

    if (checkError) {
      console.error('❌ Error verifying column:', checkError);
    } else if (columnCheck && columnCheck.length > 0) {
      console.log('✅ Column selected_photo_id verified in bag_equipment table');
      console.log('📊 Column details:', columnCheck[0]);
    } else {
      console.log('⚠️  Column verification inconclusive');
    }

    // Verify the index was created
    console.log('🔍 Verifying index was created...');
    const { data: indexCheck, error: indexError } = await supabase
      .from('pg_indexes')
      .select('indexname, tablename')
      .eq('tablename', 'bag_equipment')
      .eq('indexname', 'idx_bag_equipment_selected_photo');

    if (indexError) {
      console.error('❌ Error verifying index:', indexError);
    } else if (indexCheck && indexCheck.length > 0) {
      console.log('✅ Index idx_bag_equipment_selected_photo verified');
    } else {
      console.log('⚠️  Index verification inconclusive');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('📌 The selected_photo_id column is now available for the unified photo pool feature.');
    
  } catch (error) {
    console.error('❌ Unexpected error during migration:', error);
    process.exit(1);
  }
}

// Execute the migration
executeSelectedPhotoMigration();