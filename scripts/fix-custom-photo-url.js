#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndFixCustomPhotoUrl() {
  console.log('\n🔍 Checking bag_equipment table for custom_photo_url column...\n');

  try {
    // First, check if the column exists
    const { data: testData, error: testError } = await supabase
      .from('bag_equipment')
      .select('id, custom_photo_url')
      .limit(1);

    if (testError && testError.message.includes('column')) {
      console.log('⚠️  custom_photo_url column not found in bag_equipment table');
      console.log('📝 Adding custom_photo_url column...\n');

      // Add the column using raw SQL
      const { error: alterError } = await supabase.rpc('exec_sql', {
        query: `
          ALTER TABLE bag_equipment 
          ADD COLUMN IF NOT EXISTS custom_photo_url TEXT;
        `
      });

      if (alterError) {
        console.log('❌ Failed to add column via RPC. Trying alternative method...');
        
        // Alternative: Create a migration file
        console.log('\n📄 Please run this SQL in your Supabase dashboard:\n');
        console.log('```sql');
        console.log('ALTER TABLE bag_equipment');
        console.log('ADD COLUMN IF NOT EXISTS custom_photo_url TEXT;');
        console.log('```\n');
        
        return false;
      }

      console.log('✅ Successfully added custom_photo_url column!');
      return true;
    } else if (testError) {
      console.error('❌ Error checking table:', testError.message);
      return false;
    } else {
      console.log('✅ custom_photo_url column already exists');
      
      // Check how many items have custom photos
      const { data: stats, error: statsError } = await supabase
        .from('bag_equipment')
        .select('custom_photo_url')
        .not('custom_photo_url', 'is', null);

      if (!statsError && stats) {
        console.log(`📊 ${stats.length} items have custom photos set`);
      }
      
      return true;
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

async function checkDataIntegrity() {
  console.log('\n🔍 Checking data integrity...\n');

  try {
    // Get a sample of bag equipment with custom photos
    const { data: samples, error } = await supabase
      .from('bag_equipment')
      .select(`
        id,
        custom_photo_url,
        equipment:equipment_id (
          id,
          brand,
          model,
          image_url
        )
      `)
      .not('custom_photo_url', 'is', null)
      .limit(5);

    if (error) {
      console.error('❌ Error fetching samples:', error.message);
      return;
    }

    if (samples && samples.length > 0) {
      console.log('📸 Sample items with custom photos:');
      samples.forEach((item, index) => {
        console.log(`\n  ${index + 1}. ${item.equipment?.brand} ${item.equipment?.model}`);
        console.log(`     Custom Photo: ${item.custom_photo_url ? '✓' : '✗'}`);
        console.log(`     Default Photo: ${item.equipment?.image_url ? '✓' : '✗'}`);
      });
    } else {
      console.log('ℹ️  No items with custom photos found');
    }

    // Check for any orphaned photos
    const { data: allItems, error: allError } = await supabase
      .from('bag_equipment')
      .select('custom_photo_url')
      .not('custom_photo_url', 'is', null);

    if (!allError && allItems) {
      const uniqueUrls = new Set(allItems.map(i => i.custom_photo_url));
      console.log(`\n📊 Total unique custom photos: ${uniqueUrls.size}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error in integrity check:', error);
  }
}

async function main() {
  console.log('🏌️ Teed.club Custom Photo URL Fix\n');
  console.log('==================================\n');

  const columnExists = await checkAndFixCustomPhotoUrl();
  
  if (columnExists) {
    await checkDataIntegrity();
  }

  console.log('\n✨ Done!\n');
}

main().catch(console.error);