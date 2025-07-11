import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('\n📊 Database Schema Check\n');
  console.log('========================\n');

  // Try different queries to understand the schema
  console.log('1. Checking for bag-related tables...');
  
  // Check user_bags
  const { data: userBags, error: userBagsError } = await supabase
    .from('user_bags')
    .select('*')
    .limit(1);
    
  if (!userBagsError) {
    console.log('✓ Found table: user_bags');
    if (userBags?.length) {
      console.log('  Sample columns:', Object.keys(userBags[0]));
    }
  } else {
    console.log('✗ No user_bags table');
  }
  
  // Check bags
  const { data: bags, error: bagsError } = await supabase
    .from('bags')
    .select('*')
    .limit(1);
    
  if (!bagsError) {
    console.log('✓ Found table: bags');
    if (bags?.length) {
      console.log('  Sample columns:', Object.keys(bags[0]));
    }
  } else {
    console.log('✗ No bags table');
  }
  
  // Check bag_equipment
  console.log('\n2. Checking bag_equipment...');
  const { data: bagEquip, error: bagEquipError } = await supabase
    .from('bag_equipment')
    .select('*')
    .limit(1);
    
  if (!bagEquipError) {
    console.log('✓ Found table: bag_equipment');
    if (bagEquip?.length) {
      console.log('  Sample columns:', Object.keys(bagEquip[0]));
      console.log('  Sample data:', bagEquip[0]);
    }
  } else {
    console.log('✗ Error:', bagEquipError.message);
  }
  
  // Check what SQL files we have
  console.log('\n3. Available SQL files for reference:');
  const { execSync } = await import('child_process');
  const sqlFiles = execSync('find . -name "*.sql" -type f | grep -E "(bag|create)" | sort').toString();
  console.log(sqlFiles);
  
  console.log('========================\n');
}

checkSchema().catch(console.error);