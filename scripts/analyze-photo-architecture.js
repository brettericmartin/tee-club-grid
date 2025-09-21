#!/usr/bin/env node

/**
 * Analyze current photo architecture and propose unified photo pool solution
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function analyzePhotoArchitecture() {
  console.log('\n🔍 ANALYZING PHOTO ARCHITECTURE\n');
  console.log('=' .repeat(60));

  try {
    // 1. Current state analysis
    console.log('1. CURRENT PHOTO STORAGE ANALYSIS');
    console.log('-'.repeat(40));
    
    // Count custom_photo_urls in bag_equipment
    const { count: customPhotoCount } = await supabase
      .from('bag_equipment')
      .select('*', { count: 'exact', head: true })
      .not('custom_photo_url', 'is', null);
    
    console.log(`Custom photos in bag_equipment: ${customPhotoCount}`);
    
    // Count photos in equipment_photos
    const { count: equipmentPhotoCount } = await supabase
      .from('equipment_photos')
      .select('*', { count: 'exact', head: true });
      
    console.log(`Photos in equipment_photos table: ${equipmentPhotoCount}`);
    
    // Check for duplicates
    const { data: customPhotos } = await supabase
      .from('bag_equipment')
      .select('custom_photo_url')
      .not('custom_photo_url', 'is', null)
      .limit(100);
      
    const uniqueCustomUrls = [...new Set(customPhotos?.map(p => p.custom_photo_url))];
    console.log(`Unique custom photo URLs: ${uniqueCustomUrls.length}`);
    console.log(`Duplicate custom photos: ${(customPhotos?.length || 0) - uniqueCustomUrls.length}`);
    
    // 2. Check how many custom photos are NOT in equipment_photos
    console.log('\n2. PHOTO SYNC STATUS');
    console.log('-'.repeat(40));
    
    let unsyncedCount = 0;
    for (const url of uniqueCustomUrls.slice(0, 20)) {
      const { data } = await supabase
        .from('equipment_photos')
        .select('id')
        .eq('photo_url', url)
        .single();
        
      if (!data) unsyncedCount++;
    }
    
    console.log(`Unsynced custom photos (sample of 20): ${unsyncedCount}`);
    
    // 3. Analyze equipment_photos usage
    console.log('\n3. EQUIPMENT_PHOTOS TABLE USAGE');
    console.log('-'.repeat(40));
    
    const { data: photosBySource } = await supabase
      .from('equipment_photos')
      .select('source')
      .limit(1000);
      
    const sourceCounts = {};
    photosBySource?.forEach(p => {
      sourceCounts[p.source || 'unknown'] = (sourceCounts[p.source || 'unknown'] || 0) + 1;
    });
    
    Object.entries(sourceCounts).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} photos`);
    });
    
    // 4. Problems with current architecture
    console.log('\n4. PROBLEMS WITH CURRENT ARCHITECTURE');
    console.log('-'.repeat(40));
    console.log('❌ custom_photo_url creates duplicates across users');
    console.log('❌ Photos not automatically shared between variants');
    console.log('❌ Two separate photo systems (custom_photo_url vs equipment_photos)');
    console.log('❌ Sync issues between the two systems');
    console.log('❌ No way to select from existing photo pool');
    
    // 5. Proposed solution
    console.log('\n5. PROPOSED UNIFIED PHOTO POOL SOLUTION');
    console.log('-'.repeat(40));
    console.log('✅ Remove custom_photo_url from bag_equipment');
    console.log('✅ Add selected_photo_id to bag_equipment (references equipment_photos)');
    console.log('✅ All photos go into equipment_photos table');
    console.log('✅ Users can upload new OR select existing photos');
    console.log('✅ Photos automatically shared between all users and variants');
    console.log('✅ Single source of truth for all equipment photos');
    
    // 6. Migration path
    console.log('\n6. MIGRATION PATH');
    console.log('-'.repeat(40));
    console.log('Step 1: Add selected_photo_id column to bag_equipment');
    console.log('Step 2: Sync all custom_photo_urls to equipment_photos');
    console.log('Step 3: Update bag_equipment.selected_photo_id to point to synced photos');
    console.log('Step 4: Update UI to use selected_photo_id instead of custom_photo_url');
    console.log('Step 5: Create photo selector UI component');
    console.log('Step 6: Remove custom_photo_url column (after verification)');
    
    // 7. Benefits
    console.log('\n7. BENEFITS OF UNIFIED APPROACH');
    console.log('-'.repeat(40));
    console.log('• No duplicate photos across users');
    console.log('• Photos shared between all equipment variants');
    console.log('• Community photo pool grows organically');
    console.log('• Better performance (fewer unique URLs to load)');
    console.log('• Simpler mental model (one photo system)');
    console.log('• Easier to implement features like "most popular photo"');
    
    // 8. Database changes needed
    console.log('\n8. DATABASE CHANGES NEEDED');
    console.log('-'.repeat(40));
    console.log(`
ALTER TABLE bag_equipment 
ADD COLUMN selected_photo_id UUID REFERENCES equipment_photos(id);

-- Add index for performance
CREATE INDEX idx_bag_equipment_selected_photo 
ON bag_equipment(selected_photo_id);

-- After migration, remove old column
-- ALTER TABLE bag_equipment DROP COLUMN custom_photo_url;
    `);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run analysis
analyzePhotoArchitecture().then(() => {
  console.log('\n✅ Analysis completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});