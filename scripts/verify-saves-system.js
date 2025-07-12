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

async function verifyEquipmentSaves() {
  console.log('🔍 Verifying equipment saves system...\n');

  // Check if equipment_saves table exists
  try {
    const { data: tableInfo, error } = await supabase
      .from('equipment_saves')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ equipment_saves table issue:', error.message);
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('   Table does not exist. Please run the RLS script in Supabase SQL editor.');
      }
    } else {
      console.log('✅ equipment_saves table exists');
    }
  } catch (error) {
    console.error('❌ Error checking equipment_saves:', error);
  }

  // Check RLS status
  try {
    const { data: rlsStatus, error } = await supabase
      .rpc('get_table_rls_status', { table_name: 'equipment_saves' })
      .single();
    
    if (!error && rlsStatus) {
      console.log(`✅ RLS is ${rlsStatus.enabled ? 'enabled' : 'disabled'} on equipment_saves`);
    }
  } catch (error) {
    // RLS check function might not exist, that's okay
    console.log('⚠️  Could not check RLS status (function may not exist)');
  }

  // Check policies
  console.log('\n📋 Checking RLS Policies...\n');
  
  const expectedPolicies = [
    'Users can view own saves',
    'Users can insert own saves',
    'Users can delete own saves'
  ];

  // Note: This query requires admin access
  try {
    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('policyname')
      .eq('tablename', 'equipment_saves');
    
    if (!error && policies) {
      expectedPolicies.forEach(policyName => {
        const exists = policies.some(p => p.policyname === policyName);
        console.log(`${exists ? '✅' : '❌'} Policy: ${policyName}`);
      });
    }
  } catch (error) {
    console.log('⚠️  Could not check policies (requires admin access)');
    console.log('   Please verify policies exist in Supabase dashboard');
  }

  // Test data
  console.log('\n📊 Sample Data Check...\n');
  
  try {
    // Count saves
    const { count, error: countError } = await supabase
      .from('equipment_saves')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`✅ Total saves in database: ${count || 0}`);
    }

    // Get sample saves
    const { data: samples, error: sampleError } = await supabase
      .from('equipment_saves')
      .select(`
        id,
        user_id,
        equipment_id,
        created_at,
        equipment:equipment_id (
          brand,
          model
        )
      `)
      .limit(3);
    
    if (!sampleError && samples && samples.length > 0) {
      console.log('\n📌 Sample saves:');
      samples.forEach((save, index) => {
        const equipment = save.equipment;
        console.log(`   ${index + 1}. ${equipment?.brand || 'Unknown'} ${equipment?.model || 'Unknown'}`);
        console.log(`      Saved: ${new Date(save.created_at).toLocaleDateString()}`);
      });
    } else if (!sampleError) {
      console.log('   No saves found in database');
    }
  } catch (error) {
    console.error('❌ Error checking sample data:', error);
  }
}

async function testEquipmentPhotosRLS() {
  console.log('\n\n🔍 Verifying equipment photo likes system...\n');

  try {
    const { data: tableInfo, error } = await supabase
      .from('equipment_photo_likes')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ equipment_photo_likes table issue:', error.message);
    } else {
      console.log('✅ equipment_photo_likes table exists and is accessible');
    }

    // Count likes
    const { count, error: countError } = await supabase
      .from('equipment_photo_likes')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`✅ Total photo likes in database: ${count || 0}`);
    }
  } catch (error) {
    console.error('❌ Error checking equipment_photo_likes:', error);
  }
}

async function main() {
  console.log('🚀 Equipment Saves System Verification\n');
  
  await verifyEquipmentSaves();
  await testEquipmentPhotosRLS();
  
  console.log('\n\n📝 Next Steps:');
  console.log('1. If equipment_saves table is missing, run fix-equipment-saves-rls.sql in Supabase SQL editor');
  console.log('2. Test saving equipment from the Equipment or Equipment Detail pages');
  console.log('3. Check the Saved page to see saved items');
  console.log('\n✨ Verification complete!');
}

main().catch(console.error);