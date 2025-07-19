import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testSwitchFunctionality() {
  console.log('=== Testing Switch-based Primary Bag Functionality ===\n');
  
  try {
    // Get a test user with multiple bags
    const { data: userWithBags } = await supabase
      .from('user_bags')
      .select('user_id')
      .limit(1)
      .single();
      
    if (!userWithBags) {
      console.log('No users with bags found');
      return;
    }
    
    const userId = userWithBags.user_id;
    
    // Get all bags for this user
    const { data: userBags } = await supabase
      .from('user_bags')
      .select('id, name, is_primary')
      .eq('user_id', userId)
      .order('created_at');
      
    console.log(`User ${userId} has ${userBags?.length || 0} bags:`);
    userBags?.forEach(bag => {
      console.log(`- ${bag.name}: ${bag.is_primary ? '🟢 ON (Primary)' : '⚪ OFF'}`);
    });
    
    if (!userBags || userBags.length < 2) {
      console.log('\nUser needs at least 2 bags to test switching');
      return;
    }
    
    // Find a non-primary bag
    const nonPrimaryBag = userBags.find(b => !b.is_primary);
    
    if (!nonPrimaryBag) {
      // If all are primary (shouldn't happen), use the second bag
      const secondBag = userBags[1];
      console.log(`\nSwitching "${secondBag.name}" to primary...`);
      
      await testSetPrimary(userId, secondBag.id);
    } else {
      console.log(`\nSwitching "${nonPrimaryBag.name}" to primary...`);
      
      await testSetPrimary(userId, nonPrimaryBag.id);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

async function testSetPrimary(userId, bagId) {
  // Step 1: Unset all bags
  const { error: unsetError } = await supabase
    .from('user_bags')
    .update({ is_primary: false })
    .eq('user_id', userId);
    
  if (unsetError) {
    console.error('❌ Failed to switch off other bags:', unsetError.message);
    return;
  }
  
  console.log('✅ Step 1: Switched OFF all bags');
  
  // Step 2: Set the selected bag as primary
  const { error: setError } = await supabase
    .from('user_bags')
    .update({ is_primary: true })
    .eq('id', bagId)
    .eq('user_id', userId);
    
  if (setError) {
    console.error('❌ Failed to switch ON selected bag:', setError.message);
    return;
  }
  
  console.log('✅ Step 2: Switched ON selected bag');
  
  // Check the result
  console.log('\nFinal state:');
  const { data: updatedBags } = await supabase
    .from('user_bags')
    .select('id, name, is_primary')
    .eq('user_id', userId)
    .order('created_at');
    
  updatedBags?.forEach(bag => {
    console.log(`- ${bag.name}: ${bag.is_primary ? '🟢 ON (Primary)' : '⚪ OFF'}`);
  });
  
  const primaryCount = updatedBags?.filter(b => b.is_primary).length || 0;
  
  if (primaryCount === 1) {
    console.log('\n✅ SUCCESS: Switch functionality working correctly!');
    console.log('Only one bag is switched ON at a time.');
  } else {
    console.log(`\n❌ FAIL: Found ${primaryCount} bags switched ON`);
  }
}

testSwitchFunctionality().catch(console.error);