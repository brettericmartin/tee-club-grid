#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyTables() {
  console.log('🔍 Verifying database tables...\n');

  // Check equipment_photos table
  try {
    const { data, error } = await supabase
      .from('equipment_photos')
      .select('id, likes_count, equipment_id')
      .limit(1);
    
    if (error) {
      console.error('❌ equipment_photos table issue:', error.message);
    } else {
      console.log('✅ equipment_photos table exists');
      console.log(`   Sample record:`, data?.[0] || 'No records');
    }
  } catch (error) {
    console.error('❌ Error checking equipment_photos:', error.message);
  }

  // Check equipment_photo_likes table
  try {
    const { data, error } = await supabase
      .from('equipment_photo_likes')
      .select('id, user_id, photo_id')
      .limit(1);
    
    if (error) {
      console.error('❌ equipment_photo_likes table issue:', error.message);
    } else {
      console.log('✅ equipment_photo_likes table exists');
      console.log(`   Sample record:`, data?.[0] || 'No records');
    }
  } catch (error) {
    console.error('❌ Error checking equipment_photo_likes:', error.message);
  }

  // Check equipment_saves table
  try {
    const { data, error } = await supabase
      .from('equipment_saves')
      .select('id, user_id, equipment_id')
      .limit(1);
    
    if (error) {
      console.error('❌ equipment_saves table issue:', error.message);
    } else {
      console.log('✅ equipment_saves table exists');
      console.log(`   Sample record:`, data?.[0] || 'No records');
    }
  } catch (error) {
    console.error('❌ Error checking equipment_saves:', error.message);
  }
}

async function testPhotoQuery() {
  console.log('\n🧪 Testing photo query with likes...\n');

  try {
    const { data, error } = await supabase
      .from('equipment_photos')
      .select(`
        id,
        photo_url,
        likes_count,
        equipment_id,
        equipment_photo_likes!left (
          id
        )
      `)
      .order('likes_count', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Photo query failed:', error.message);
    } else {
      console.log('✅ Photo query successful');
      console.log(`   Found ${data?.length || 0} photos`);
      
      if (data && data.length > 0) {
        console.log('\n📸 Top liked photos:');
        data.forEach((photo, index) => {
          console.log(`   ${index + 1}. Photo ${photo.id} - ${photo.likes_count || 0} likes`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error testing photo query:', error.message);
  }
}

async function testEquipmentWithPhotos() {
  console.log('\n🎯 Testing equipment with most liked photos...\n');

  try {
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        id,
        brand,
        model,
        category,
        image_url,
        equipment_photos!left (
          photo_url,
          likes_count
        )
      `)
      .limit(3);

    if (error) {
      console.error('❌ Equipment query failed:', error.message);
    } else {
      console.log('✅ Equipment query successful');
      console.log(`   Found ${data?.length || 0} equipment items`);
      
      if (data && data.length > 0) {
        console.log('\n🏌️ Equipment with photos:');
        data.forEach((equipment, index) => {
          const photos = equipment.equipment_photos || [];
          const sortedPhotos = photos.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
          const mostLiked = sortedPhotos[0];
          
          console.log(`   ${index + 1}. ${equipment.brand} ${equipment.model}`);
          console.log(`      Photos: ${photos.length}`);
          if (mostLiked) {
            console.log(`      Most liked: ${mostLiked.likes_count || 0} likes`);
          }
        });
      }
    }
  } catch (error) {
    console.error('❌ Error testing equipment query:', error.message);
  }
}

async function main() {
  console.log('🚀 Teed Ball Photo System Verification\n');
  
  await verifyTables();
  await testPhotoQuery();
  await testEquipmentWithPhotos();
  
  console.log('\n✨ Verification complete!');
}

main().catch(console.error);