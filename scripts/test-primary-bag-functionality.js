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

async function testPrimaryBagFunctionality() {
  console.log('=== Testing Primary Bag Functionality ===\n');
  
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
      console.log(`- ${bag.name}: ${bag.is_primary ? '⭐ PRIMARY' : 'Not primary'}`);
    });
    
    if (!userBags || userBags.length < 2) {
      console.log('\nUser needs at least 2 bags to test primary switching');
      return;
    }
    
    // Find a non-primary bag
    const nonPrimaryBag = userBags.find(b => !b.is_primary);
    
    if (!nonPrimaryBag) {
      console.log('\nAll bags are already primary (data inconsistency)');
      return;
    }
    
    console.log(`\n\nTesting setPrimaryBag function...`);
    console.log(`Setting "${nonPrimaryBag.name}" as primary...\n`);
    
    // Test the updated setPrimaryBag logic
    try {
      // Step 1: Unset all bags
      const { error: unsetError } = await supabase
        .from('user_bags')
        .update({ is_primary: false })
        .eq('user_id', userId);
        
      if (unsetError) {
        console.error('❌ Failed to unset other bags:', unsetError.message);
      } else {
        console.log('✅ Step 1: Unset all bags as primary');
      }
      
      // Step 2: Set the selected bag as primary
      const { error: setError } = await supabase
        .from('user_bags')
        .update({ is_primary: true })
        .eq('id', nonPrimaryBag.id)
        .eq('user_id', userId);
        
      if (setError) {
        console.error('❌ Failed to set primary:', setError.message);
      } else {
        console.log('✅ Step 2: Set selected bag as primary');
      }
    } catch (error) {
      console.error('❌ Update failed:', error.message);
    }
    
    // Check the result
    console.log('\nChecking results...');
    const { data: updatedBags } = await supabase
      .from('user_bags')
      .select('id, name, is_primary')
      .eq('user_id', userId)
      .order('created_at');
      
    console.log('\nBags after update:');
    updatedBags?.forEach(bag => {
      console.log(`- ${bag.name}: ${bag.is_primary ? '⭐ PRIMARY' : 'Not primary'}`);
    });
    
    const primaryCount = updatedBags?.filter(b => b.is_primary).length || 0;
    
    console.log(`\n\nSummary:`);
    console.log(`- Total bags: ${updatedBags?.length || 0}`);
    console.log(`- Primary bags: ${primaryCount}`);
    
    if (primaryCount === 1) {
      const primaryBag = updatedBags?.find(b => b.is_primary);
      if (primaryBag?.id === nonPrimaryBag.id) {
        console.log('\n✅ SUCCESS: Primary bag switching works correctly!');
        console.log('The database triggers are properly enforcing single primary bag.');
      } else {
        console.log('\n⚠️  WARNING: Primary was set but on wrong bag');
      }
    } else if (primaryCount === 0) {
      console.log('\n❌ FAIL: No primary bag after update');
    } else {
      console.log('\n❌ FAIL: Multiple primary bags exist');
      console.log('The database triggers are NOT applied or not working.');
      console.log('\nTo fix this:');
      console.log('1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Run the SQL from: sql/add-primary-bag-support-fixed.sql');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testPrimaryBagFunctionality().catch(console.error);