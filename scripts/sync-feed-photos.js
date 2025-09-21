#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncFeedPhotos() {
  try {
    console.log('🔍 Finding feed posts with equipment photos...\n');

    // Get all feed posts with equipment photos
    const { data: feedPosts, error: feedError } = await supabase
      .from('feed_posts')
      .select('*')
      .or('type.eq.equipment_photo,type.eq.new_equipment')
      .not('content', 'is', null);

    if (feedError) throw feedError;

    console.log(`Found ${feedPosts?.length || 0} feed posts with equipment photos\n`);

    let syncedToEquipmentPhotos = 0;
    let syncedToBagEquipment = 0;
    let errors = 0;

    for (const post of feedPosts || []) {
      const content = post.content;
      
      // Skip if no equipment_id or photo_url
      if (!content?.equipment_id || !content?.photo_url) {
        continue;
      }

      console.log(`Processing post ${post.id}:`);
      console.log(`  Equipment: ${content.equipment_name || content.equipment_id}`);
      console.log(`  Photo URL: ${content.photo_url.substring(0, 50)}...`);

      // 1. Check if photo exists in equipment_photos
      const { data: existingPhoto, error: checkError } = await supabase
        .from('equipment_photos')
        .select('id')
        .eq('equipment_id', content.equipment_id)
        .eq('user_id', post.user_id)
        .eq('photo_url', content.photo_url)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error(`  ❌ Error checking equipment_photos: ${checkError.message}`);
        errors++;
        continue;
      }

      // 2. Insert into equipment_photos if doesn't exist
      if (!existingPhoto) {
        const { error: insertError } = await supabase
          .from('equipment_photos')
          .insert({
            equipment_id: content.equipment_id,
            user_id: post.user_id,
            photo_url: content.photo_url,
            caption: content.caption || `Photo of ${content.equipment_name}`,
            source: 'user_upload',
            is_primary: false,
            likes_count: 0
          });

        if (insertError) {
          if (insertError.code === '23505') {
            console.log(`  ⚠️  Photo already exists in equipment_photos`);
          } else {
            console.error(`  ❌ Error inserting to equipment_photos: ${insertError.message}`);
            errors++;
            continue;
          }
        } else {
          console.log(`  ✅ Added to equipment_photos`);
          syncedToEquipmentPhotos++;
        }
      } else {
        console.log(`  ℹ️  Already in equipment_photos`);
      }

      // 3. Find user's bags with this equipment
      const { data: userBags, error: bagsError } = await supabase
        .from('user_bags')
        .select('id')
        .eq('user_id', post.user_id);

      if (bagsError) {
        console.error(`  ❌ Error fetching user bags: ${bagsError.message}`);
        errors++;
        continue;
      }

      if (!userBags || userBags.length === 0) {
        console.log(`  ℹ️  User has no bags`);
        continue;
      }

      // 4. Find bag_equipment entries
      const bagIds = userBags.map(b => b.id);
      const { data: bagEquipment, error: equipError } = await supabase
        .from('bag_equipment')
        .select('id, custom_photo_url')
        .eq('equipment_id', content.equipment_id)
        .in('bag_id', bagIds);

      if (equipError) {
        console.error(`  ❌ Error fetching bag equipment: ${equipError.message}`);
        errors++;
        continue;
      }

      if (!bagEquipment || bagEquipment.length === 0) {
        console.log(`  ℹ️  Equipment not in user's bags`);
        continue;
      }

      // 5. Update bag_equipment entries that don't have custom photos
      let updatedCount = 0;
      for (const item of bagEquipment) {
        if (!item.custom_photo_url) {
          const { error: updateError } = await supabase
            .from('bag_equipment')
            .update({ custom_photo_url: content.photo_url })
            .eq('id', item.id);

          if (updateError) {
            console.error(`  ❌ Error updating bag_equipment ${item.id}: ${updateError.message}`);
            errors++;
          } else {
            updatedCount++;
            syncedToBagEquipment++;
          }
        }
      }

      if (updatedCount > 0) {
        console.log(`  ✅ Updated ${updatedCount} bag_equipment entries`);
      } else {
        console.log(`  ℹ️  All bag_equipment entries already have photos`);
      }
      
      console.log('');
    }

    // Now check for orphaned photos in media_urls
    console.log('\n🔍 Checking for photos in media_urls that need syncing...\n');

    const { data: postsWithMedia, error: mediaError } = await supabase
      .from('feed_posts')
      .select('*')
      .not('media_urls', 'is', null);

    if (mediaError) throw mediaError;

    let mediaUrlsSynced = 0;
    for (const post of postsWithMedia || []) {
      if (!post.media_urls || post.media_urls.length === 0) continue;
      
      const content = post.content;
      if (!content?.equipment_id) continue;

      for (const photoUrl of post.media_urls) {
        // Check if this photo is in equipment_photos
        const { data: existing } = await supabase
          .from('equipment_photos')
          .select('id')
          .eq('equipment_id', content.equipment_id)
          .eq('user_id', post.user_id)
          .eq('photo_url', photoUrl)
          .maybeSingle();

        if (!existing) {
          const { error: insertError } = await supabase
            .from('equipment_photos')
            .insert({
              equipment_id: content.equipment_id,
              user_id: post.user_id,
              photo_url: photoUrl,
              caption: content.caption || 'Equipment photo',
              source: 'user_upload',
              is_primary: false,
              likes_count: 0
            });

          if (!insertError) {
            mediaUrlsSynced++;
            console.log(`✅ Synced media_url photo for ${content.equipment_name}`);
          }
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Added to equipment_photos: ${syncedToEquipmentPhotos}`);
    console.log(`✅ Updated bag_equipment entries: ${syncedToBagEquipment}`);
    console.log(`✅ Synced from media_urls: ${mediaUrlsSynced}`);
    if (errors > 0) {
      console.log(`❌ Errors encountered: ${errors}`);
    }
    console.log('='.repeat(60));

    // Final verification
    console.log('\n🔍 Final verification...\n');
    
    const { data: photoCount } = await supabase
      .from('equipment_photos')
      .select('id', { count: 'exact', head: true });

    const { data: bagEquipmentWithPhotos } = await supabase
      .from('bag_equipment')
      .select('id', { count: 'exact', head: true })
      .not('custom_photo_url', 'is', null);

    console.log(`Total equipment_photos: ${photoCount || 0}`);
    console.log(`Bag equipment with custom photos: ${bagEquipmentWithPhotos || 0}`);

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
console.log('🚀 Starting feed photo sync...\n');
syncFeedPhotos().then(() => {
  console.log('\n✅ Sync complete!');
  process.exit(0);
});