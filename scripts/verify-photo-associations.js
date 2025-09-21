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

async function verifyPhotoAssociations() {
  try {
    console.log('🔍 Verifying photo associations across the system...\n');

    // 1. Count feed posts with equipment photos
    const { data: feedPosts, count: feedCount } = await supabase
      .from('feed_posts')
      .select('*', { count: 'exact', head: false })
      .or('type.eq.equipment_photo,type.eq.new_equipment')
      .not('content', 'is', null);

    const photosInFeed = feedPosts?.filter(p => p.content?.photo_url).length || 0;
    
    console.log('📊 Feed Posts with Equipment Photos:');
    console.log(`   Total posts: ${feedCount || 0}`);
    console.log(`   Posts with photo_url: ${photosInFeed}`);
    console.log('');

    // 2. Count equipment_photos table
    const { count: equipmentPhotosCount } = await supabase
      .from('equipment_photos')
      .select('*', { count: 'exact', head: true });

    console.log('📸 Equipment Photos Table:');
    console.log(`   Total photos: ${equipmentPhotosCount || 0}`);
    
    // Count by source
    const { data: photoSources } = await supabase
      .from('equipment_photos')
      .select('source');
    
    const sourceCounts = {};
    photoSources?.forEach(p => {
      sourceCounts[p.source] = (sourceCounts[p.source] || 0) + 1;
    });
    
    Object.entries(sourceCounts).forEach(([source, count]) => {
      console.log(`   ${source}: ${count}`);
    });
    console.log('');

    // 3. Count bag_equipment with custom photos
    const { count: bagEquipmentWithPhotos } = await supabase
      .from('bag_equipment')
      .select('*', { count: 'exact', head: true })
      .not('custom_photo_url', 'is', null);

    const { count: totalBagEquipment } = await supabase
      .from('bag_equipment')
      .select('*', { count: 'exact', head: true });

    console.log('🎒 Bag Equipment Custom Photos:');
    console.log(`   Total bag equipment: ${totalBagEquipment || 0}`);
    console.log(`   With custom photos: ${bagEquipmentWithPhotos || 0}`);
    console.log(`   Percentage with photos: ${((bagEquipmentWithPhotos/totalBagEquipment)*100).toFixed(1)}%`);
    console.log('');

    // 4. Check for orphaned photos
    console.log('🔍 Checking for potential issues...\n');
    
    // Feed posts without corresponding equipment_photos
    let orphanedFeedPosts = 0;
    for (const post of feedPosts || []) {
      if (!post.content?.photo_url || !post.content?.equipment_id) continue;
      
      const { data: exists } = await supabase
        .from('equipment_photos')
        .select('id')
        .eq('photo_url', post.content.photo_url)
        .eq('equipment_id', post.content.equipment_id)
        .maybeSingle();
      
      if (!exists) {
        orphanedFeedPosts++;
      }
    }
    
    if (orphanedFeedPosts > 0) {
      console.log(`⚠️  Found ${orphanedFeedPosts} feed posts without equipment_photos entries`);
      console.log('   (Run sync-feed-photos.js to fix)');
    } else {
      console.log('✅ All feed posts have corresponding equipment_photos entries');
    }

    // 5. Sample some specific cases
    console.log('\n📝 Sample Photo Associations:\n');
    
    const { data: sampleBagEquipment } = await supabase
      .from('bag_equipment')
      .select(`
        *,
        equipment (
          brand,
          model,
          equipment_photos (
            id,
            photo_url
          )
        )
      `)
      .not('custom_photo_url', 'is', null)
      .limit(3);

    sampleBagEquipment?.forEach((item, idx) => {
      console.log(`Sample ${idx + 1}:`);
      console.log(`  Equipment: ${item.equipment.brand} ${item.equipment.model}`);
      console.log(`  Custom Photo: ${item.custom_photo_url?.substring(0, 50)}...`);
      console.log(`  Equipment Photos: ${item.equipment.equipment_photos?.length || 0} total photos`);
      console.log('');
    });

    // 6. Check for users with the most uploaded photos
    const { data: topUploaders } = await supabase
      .from('equipment_photos')
      .select('user_id')
      .eq('source', 'user_upload');

    const uploaderCounts = {};
    topUploaders?.forEach(p => {
      uploaderCounts[p.user_id] = (uploaderCounts[p.user_id] || 0) + 1;
    });

    const sortedUploaders = Object.entries(uploaderCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    if (sortedUploaders.length > 0) {
      console.log('👥 Top Photo Contributors:');
      for (const [userId, count] of sortedUploaders) {
        const { data: user } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .single();
        
        console.log(`   ${user?.username || 'Unknown'}: ${count} photos`);
      }
      console.log('');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Feed posts with photos: ${photosInFeed}`);
    console.log(`Equipment photos total: ${equipmentPhotosCount || 0}`);
    console.log(`Bag equipment with custom photos: ${bagEquipmentWithPhotos || 0}`);
    
    if (orphanedFeedPosts === 0) {
      console.log('\n🎉 All photos are properly associated!');
    } else {
      console.log(`\n⚠️  ${orphanedFeedPosts} photos need syncing`);
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run verification
console.log('🚀 Starting photo association verification...\n');
verifyPhotoAssociations().then(() => {
  process.exit(0);
});