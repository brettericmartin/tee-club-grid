#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkTargetDrivers() {
  console.log('🏌️ Checking Target Drivers in Database');
  console.log('=====================================\n');

  const targetDrivers = [
    { brand: 'TaylorMade', model: 'Qi10 Max' },
    { brand: 'Callaway', model: 'Paradym Ai Smoke Max' },
    { brand: 'Ping', model: 'G430 Max' },
    { brand: 'Titleist', model: 'TSR2' },
    { brand: 'Cobra', model: 'Darkspeed' }
  ];

  for (const target of targetDrivers) {
    const { data: drivers, error } = await supabase
      .from('equipment')
      .select('brand, model, category, specs, msrp, release_year, description')
      .eq('category', 'driver')
      .eq('brand', target.brand)
      .ilike('model', `%${target.model}%`);

    if (error) {
      console.error(`Error checking ${target.brand} ${target.model}:`, error);
      continue;
    }

    console.log(`${target.brand} ${target.model}:`);
    if (drivers.length === 0) {
      console.log('  ❌ NOT FOUND - Needs complete data collection\n');
    } else {
      drivers.forEach((driver, index) => {
        console.log(`  ${index + 1}. ${driver.brand} ${driver.model}`);
        console.log(`     MSRP: ${driver.msrp || '❌ Missing'}`);
        console.log(`     Year: ${driver.release_year || '❌ Missing'}`);
        console.log(`     Specs: ${driver.specs ? '✅ Present' : '❌ Missing'}`);
        console.log(`     Description: ${driver.description ? '✅ Present' : '❌ Missing'}`);
        
        if (driver.specs) {
          console.log(`     Spec Details: ${Object.keys(driver.specs).join(', ')}`);
        }
        console.log('');
      });
    }
  }

  // Also check for any other popular 2024 drivers
  console.log('\n📊 All 2024 Drivers in Database:');
  console.log('================================');
  
  const { data: all2024Drivers, error: allError } = await supabase
    .from('equipment')
    .select('brand, model, msrp, specs')
    .eq('category', 'driver')
    .eq('release_year', 2024)
    .order('brand');

  if (allError) {
    console.error('Error fetching all 2024 drivers:', allError);
  } else {
    all2024Drivers.forEach(driver => {
      const specsStatus = driver.specs ? '✅' : '❌';
      const msrpStatus = driver.msrp ? '✅' : '❌';
      console.log(`${driver.brand} ${driver.model} - MSRP:${msrpStatus} Specs:${specsStatus}`);
    });
  }
}

checkTargetDrivers().catch(console.error);