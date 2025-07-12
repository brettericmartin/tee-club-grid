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

async function testSavedEquipment() {
  console.log('🔍 Testing saved equipment query...\n');

  try {
    // First, get a user to test with
    const { data: users } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(1);
    
    if (!users || users.length === 0) {
      console.log('No users found in database');
      return;
    }

    const userId = users[0].id;
    console.log(`Testing with user: ${users[0].username || userId}\n`);

    // Test the query structure
    const { data, error } = await supabase
      .from('equipment_saves')
      .select(`
        *,
        equipment:equipment_id (
          *,
          equipment_photos (
            photo_url,
            is_primary,
            likes_count
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Query error:', error);
      return;
    }

    console.log(`✅ Found ${data?.length || 0} saved equipment items\n`);

    if (data && data.length > 0) {
      console.log('Sample saved equipment structure:');
      const sample = data[0];
      console.log('Save record:', {
        id: sample.id,
        user_id: sample.user_id,
        equipment_id: sample.equipment_id,
        created_at: sample.created_at,
        has_equipment: !!sample.equipment
      });

      if (sample.equipment) {
        console.log('\nEquipment details:', {
          id: sample.equipment.id,
          brand: sample.equipment.brand,
          model: sample.equipment.model,
          category: sample.equipment.category,
          photos_count: sample.equipment.equipment_photos?.length || 0
        });
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSavedEquipment().catch(console.error);