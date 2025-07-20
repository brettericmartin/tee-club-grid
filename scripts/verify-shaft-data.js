import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyShaftData() {
  console.log('🔍 Verifying shaft/grip data exists...\n');

  try {
    // Check a specific shaft ID from the test
    const shaftId = '872bebcd-a371-4667-aeac-008e6e726a8e';
    const { data: shaft, error: shaftError } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', shaftId)
      .single();

    if (shaftError) {
      console.error('Error fetching shaft:', shaftError);
    } else {
      console.log('✅ Shaft found:');
      console.log(`   Brand: ${shaft.brand}`);
      console.log(`   Model: ${shaft.model}`);
      console.log(`   Category: ${shaft.category}`);
      console.log(`   Specs:`, shaft.specs);
    }

    // Check a specific grip ID
    const gripId = '7dd11f36-91f3-4eb6-a723-0cceca699360';
    const { data: grip, error: gripError } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', gripId)
      .single();

    if (gripError) {
      console.error('Error fetching grip:', gripError);
    } else {
      console.log('\n✅ Grip found:');
      console.log(`   Brand: ${grip.brand}`);
      console.log(`   Model: ${grip.model}`);
      console.log(`   Category: ${grip.category}`);
      console.log(`   Specs:`, grip.specs);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

verifyShaftData();