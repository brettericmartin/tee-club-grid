#!/usr/bin/env node

/**
 * Driver Photo Collection Script
 * Specifically targets drivers in the database for photo collection
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDriverStatus() {
  console.log('🏌️ Checking Driver Photo Status\n');
  console.log('=' .repeat(60) + '\n');
  
  // Get all drivers
  const { data: allDrivers, error: allError } = await supabase
    .from('equipment')
    .select('id, brand, model, image_url')
    .eq('category', 'driver')
    .order('popularity_score', { ascending: false, nullsFirst: false });
  
  if (allError) {
    console.error('Error fetching drivers:', allError);
    return;
  }
  
  // Get drivers without photos
  const { data: driversNoPhoto, error: noPhotoError } = await supabase
    .from('equipment')
    .select('id, brand, model')
    .eq('category', 'driver')
    .or('image_url.is.null,image_url.eq.""')
    .order('popularity_score', { ascending: false, nullsFirst: false });
  
  if (noPhotoError) {
    console.error('Error fetching drivers without photos:', noPhotoError);
    return;
  }
  
  // Stats
  const totalDrivers = allDrivers.length;
  const driversWithPhotos = totalDrivers - driversNoPhoto.length;
  const percentComplete = Math.round((driversWithPhotos / totalDrivers) * 100);
  
  console.log('📊 Driver Photo Statistics:');
  console.log(`  Total drivers: ${totalDrivers}`);
  console.log(`  With photos: ${driversWithPhotos} (${percentComplete}%)`);
  console.log(`  Need photos: ${driversNoPhoto.length}\n`);
  
  if (driversNoPhoto.length > 0) {
    console.log('🎯 Top 10 Drivers Needing Photos:');
    driversNoPhoto.slice(0, 10).forEach((driver, i) => {
      console.log(`  ${i + 1}. ${driver.brand} ${driver.model}`);
    });
    
    console.log('\n📝 Brands needing photos:');
    const brandCounts = {};
    driversNoPhoto.forEach(driver => {
      brandCounts[driver.brand] = (brandCounts[driver.brand] || 0) + 1;
    });
    
    Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([brand, count]) => {
        console.log(`  ${brand}: ${count} drivers`);
      });
  }
  
  console.log('\n' + '=' .repeat(60) + '\n');
  
  return {
    total: totalDrivers,
    withPhotos: driversWithPhotos,
    needPhotos: driversNoPhoto.length,
    drivers: driversNoPhoto
  };
}

// Check status and prepare for collection
async function main() {
  const status = await checkDriverStatus();
  
  if (status && status.needPhotos > 0) {
    console.log(`\n🚀 Ready to collect photos for ${status.needPhotos} drivers\n`);
    console.log('To start collection, run:');
    console.log(`  node scripts/equipment-photo-agent.js ${status.needPhotos}\n`);
    console.log('Or for a test batch of 10:');
    console.log('  node scripts/equipment-photo-agent.js 10\n');
    
    // Save driver list to file for targeted collection
    const fs = await import('fs/promises');
    const driverIds = status.drivers.map(d => d.id);
    await fs.writeFile(
      join(__dirname, 'driver-ids-to-process.json'),
      JSON.stringify({
        category: 'driver',
        count: status.needPhotos,
        ids: driverIds,
        drivers: status.drivers
      }, null, 2)
    );
    
    console.log('Driver IDs saved to: scripts/driver-ids-to-process.json\n');
  }
}

main().catch(console.error);