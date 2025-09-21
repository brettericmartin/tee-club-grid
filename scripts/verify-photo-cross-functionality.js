#!/usr/bin/env node

/**
 * Comprehensive photo cross-functionality verification
 * Tests all aspects of the photo system across feed, bags, and equipment pages
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyPhotoCrossFunctionality() {
  console.log('\n🔍 Comprehensive Photo Cross-Functionality Verification\n');
  console.log('=' .repeat(60));

  const results = {
    totalChecks: 0,
    passed: 0,
    failed: 0,
    issues: []
  };

  try {
    // 1. Check Feed Posts with Equipment Photos
    console.log('\n1. FEED POSTS WITH EQUIPMENT PHOTOS');
    console.log('-'.repeat(40));
    
    const { data: feedPosts, error: feedError } = await supabase
      .from('feed_posts')
      .select(`
        id,
        content,
        media_urls,
        equipment_id,
        equipment (
          brand,
          model,
          equipment_photos (
            id,
            photo_url
          )
        )
      `)
      .not('equipment_id', 'is', null)
      .not('media_urls', 'is', null)
      .limit(10);

    if (feedError) throw feedError;

    console.log(`Found ${feedPosts.length} feed posts with equipment and photos`);
    
    for (const post of feedPosts) {
      results.totalChecks++;
      const mediaUrl = post.media_urls?.[0];
      const equipmentPhotos = post.equipment?.equipment_photos || [];
      
      // Check if media URL is synced to equipment_photos
      const photoInEquipmentPhotos = equipmentPhotos.some(p => p.photo_url === mediaUrl);
      
      if (mediaUrl && !photoInEquipmentPhotos) {
        console.log(`⚠️  Feed post ${post.id.slice(0, 8)}: Photo not in equipment_photos table`);
        results.issues.push(`Feed post ${post.id}: Photo not synced to equipment_photos`);
        results.failed++;
      } else if (mediaUrl) {
        console.log(`✅ Feed post ${post.id.slice(0, 8)}: Photo properly synced`);
        results.passed++;
      }
    }

    // 2. Check Bag Equipment Photo Consistency
    console.log('\n2. BAG EQUIPMENT PHOTO CONSISTENCY');
    console.log('-'.repeat(40));
    
    const { data: bagEquipment, error: bagError } = await supabase
      .from('bag_equipment')
      .select(`
        id,
        custom_photo_url,
        equipment_id,
        equipment (
          id,
          brand,
          model,
          image_url,
          equipment_photos (
            id,
            photo_url,
            likes_count
          )
        )
      `)
      .not('custom_photo_url', 'is', null)
      .limit(20);

    if (bagError) throw bagError;

    console.log(`Checking ${bagEquipment.length} bag equipment items with custom photos`);
    
    for (const item of bagEquipment) {
      results.totalChecks++;
      const customUrl = item.custom_photo_url;
      const equipmentPhotos = item.equipment?.equipment_photos || [];
      
      // Check if custom photo exists in equipment_photos
      const customInEquipmentPhotos = equipmentPhotos.some(p => p.photo_url === customUrl);
      
      if (!customInEquipmentPhotos && customUrl && !customUrl.includes('placehold')) {
        console.log(`⚠️  Bag equipment ${item.id.slice(0, 8)}: Custom photo not in equipment_photos`);
        results.issues.push(`Bag equipment ${item.id}: Custom photo not in equipment_photos`);
        results.failed++;
      } else {
        console.log(`✅ Bag equipment ${item.id.slice(0, 8)}: Photos properly linked`);
        results.passed++;
      }
    }

    // 3. Check Equipment Photos Table Integrity
    console.log('\n3. EQUIPMENT PHOTOS TABLE INTEGRITY');
    console.log('-'.repeat(40));
    
    const { data: equipmentPhotos, error: photoError } = await supabase
      .from('equipment_photos')
      .select(`
        id,
        photo_url,
        equipment_id,
        user_id,
        source,
        equipment (
          id,
          brand,
          model
        )
      `)
      .limit(20);

    if (photoError) throw photoError;

    console.log(`Checking ${equipmentPhotos.length} equipment photos`);
    
    for (const photo of equipmentPhotos) {
      results.totalChecks++;
      
      // Check if photo URL is valid
      if (!photo.photo_url || photo.photo_url.includes('placehold')) {
        console.log(`⚠️  Photo ${photo.id.slice(0, 8)}: Invalid or placeholder URL`);
        results.issues.push(`Photo ${photo.id}: Invalid URL`);
        results.failed++;
      } else if (!photo.equipment) {
        console.log(`⚠️  Photo ${photo.id.slice(0, 8)}: Missing equipment reference`);
        results.issues.push(`Photo ${photo.id}: Missing equipment`);
        results.failed++;
      } else {
        console.log(`✅ Photo ${photo.id.slice(0, 8)}: Valid (${photo.equipment.brand} ${photo.equipment.model})`);
        results.passed++;
      }
    }

    // 4. Check Variant Photo Sharing
    console.log('\n4. VARIANT PHOTO SHARING');
    console.log('-'.repeat(40));
    
    // Find equipment with multiple bag entries (variants)
    const { data: variants, error: varError } = await supabase
      .rpc('get_equipment_with_variants')
      .limit(5);

    if (!varError && variants) {
      console.log(`Found ${variants.length} equipment items with variants`);
      
      for (const variant of variants) {
        results.totalChecks++;
        
        // Get all bag_equipment entries for this equipment
        const { data: variantEntries, error: veError } = await supabase
          .from('bag_equipment')
          .select(`
            id,
            custom_photo_url,
            equipment (
              equipment_photos (
                id
              )
            )
          `)
          .eq('equipment_id', variant.equipment_id)
          .limit(5);

        if (veError) throw veError;

        const photoCount = variantEntries[0]?.equipment?.equipment_photos?.length || 0;
        const allHaveSameCount = variantEntries.every(
          v => (v.equipment?.equipment_photos?.length || 0) === photoCount
        );

        if (allHaveSameCount) {
          console.log(`✅ Equipment ${variant.equipment_id.slice(0, 8)}: All ${variantEntries.length} variants share ${photoCount} photos`);
          results.passed++;
        } else {
          console.log(`⚠️  Equipment ${variant.equipment_id.slice(0, 8)}: Photo count mismatch between variants`);
          results.issues.push(`Equipment ${variant.equipment_id}: Variant photo mismatch`);
          results.failed++;
        }
      }
    }

    // 5. Summary Report
    console.log('\n' + '='.repeat(60));
    console.log('📊 CROSS-FUNCTIONALITY VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`\nTotal Checks: ${results.totalChecks}`);
    console.log(`✅ Passed: ${results.passed} (${((results.passed/results.totalChecks)*100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${results.failed} (${((results.failed/results.totalChecks)*100).toFixed(1)}%)`);
    
    if (results.issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      results.issues.slice(0, 10).forEach(issue => {
        console.log(`  - ${issue}`);
      });
      if (results.issues.length > 10) {
        console.log(`  ... and ${results.issues.length - 10} more`);
      }
    } else {
      console.log('\n✅ No issues found! Photo system is fully functional.');
    }

    // Check if we need the RPC function
    if (varError && varError.message.includes('get_equipment_with_variants')) {
      console.log('\n📝 Note: Creating helper function for variant detection...');
      
      const createFunction = `
        CREATE OR REPLACE FUNCTION get_equipment_with_variants()
        RETURNS TABLE (
          equipment_id UUID,
          variant_count BIGINT
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            be.equipment_id,
            COUNT(*)::BIGINT as variant_count
          FROM bag_equipment be
          GROUP BY be.equipment_id
          HAVING COUNT(*) > 1
          ORDER BY COUNT(*) DESC;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', {
        query: createFunction
      }).single();
      
      if (!createError) {
        console.log('✅ Helper function created successfully');
      }
    }

  } catch (error) {
    console.error('\n❌ Error during verification:', error);
    process.exit(1);
  }
}

// Run the verification
verifyPhotoCrossFunctionality().then(() => {
  console.log('\n✅ Photo cross-functionality verification completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});