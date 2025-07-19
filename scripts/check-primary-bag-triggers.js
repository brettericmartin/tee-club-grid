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
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function checkPrimaryBagTriggers() {
  console.log('=== Checking Primary Bag Triggers ===\n');
  
  try {
    // Test the trigger behavior by checking actual data
    console.log('1. Checking for users with multiple primary bags...');
    
    const { data: multiplePrimary, error: multiError } = await supabase
      .from('user_bags')
      .select('user_id, id')
      .eq('is_primary', true);
      
    if (multiError) {
      console.error('Error checking bags:', multiError);
      return;
    }
    
    // Group by user and count
    const userPrimaryCounts = {};
    multiplePrimary?.forEach(bag => {
      userPrimaryCounts[bag.user_id] = (userPrimaryCounts[bag.user_id] || 0) + 1;
    });
    
    const usersWithMultiple = Object.entries(userPrimaryCounts)
      .filter(([_, count]) => count > 1);
      
    if (usersWithMultiple.length > 0) {
      console.log('⚠️  Found users with multiple primary bags:', usersWithMultiple.length);
      console.log('   This indicates triggers may not be applied!');
    } else {
      console.log('✅ No users have multiple primary bags');
    }
    
    // Check for users with bags but no primary
    console.log('\n2. Checking for users with bags but no primary...');
    
    const { data: allBags } = await supabase
      .from('user_bags')
      .select('user_id, is_primary');
      
    const userBagStats = {};
    allBags?.forEach(bag => {
      if (!userBagStats[bag.user_id]) {
        userBagStats[bag.user_id] = { total: 0, primary: 0 };
      }
      userBagStats[bag.user_id].total++;
      if (bag.is_primary) userBagStats[bag.user_id].primary++;
    });
    
    const usersWithoutPrimary = Object.entries(userBagStats)
      .filter(([_, stats]) => stats.total > 0 && stats.primary === 0);
      
    if (usersWithoutPrimary.length > 0) {
      console.log('⚠️  Found users with bags but no primary:', usersWithoutPrimary.length);
      console.log('   This indicates triggers may not be applied!');
    } else {
      console.log('✅ All users with bags have a primary bag');
    }
    
    // Test trigger by attempting to set multiple primary bags
    console.log('\n3. Testing trigger behavior...');
    
    // Get a user with multiple bags
    const { data: testUser } = await supabase
      .from('user_bags')
      .select('user_id')
      .limit(1)
      .single();
      
    if (testUser) {
      const { data: userBags } = await supabase
        .from('user_bags')
        .select('id, name, is_primary')
        .eq('user_id', testUser.user_id)
        .order('created_at');
        
      console.log(`\nTest user has ${userBags?.length || 0} bags`);
      
      if (userBags && userBags.length >= 2) {
        console.log('Current bags:', userBags.map(b => ({
          name: b.name,
          is_primary: b.is_primary
        })));
        
        // Try to set the second bag as primary
        const secondBag = userBags[1];
        console.log(`\nAttempting to set "${secondBag.name}" as primary...`);
        
        const { error: updateError } = await supabase
          .from('user_bags')
          .update({ is_primary: true })
          .eq('id', secondBag.id);
          
        if (updateError) {
          console.error('Update error:', updateError);
        } else {
          // Check the result
          const { data: afterUpdate } = await supabase
            .from('user_bags')
            .select('id, name, is_primary')
            .eq('user_id', testUser.user_id)
            .order('created_at');
            
          console.log('\nBags after update:', afterUpdate?.map(b => ({
            name: b.name,
            is_primary: b.is_primary
          })));
          
          const primaryCount = afterUpdate?.filter(b => b.is_primary).length || 0;
          
          if (primaryCount === 1) {
            console.log('\n✅ Triggers are working! Only one primary bag after update.');
          } else {
            console.log(`\n⚠️  Found ${primaryCount} primary bags - triggers may not be applied!`);
          }
        }
      } else {
        console.log('User needs at least 2 bags to test trigger behavior');
      }
    }
    
    console.log('\n=== Summary ===');
    console.log('If you see warnings above, you may need to apply the triggers.');
    console.log('Run the SQL script: sql/add-primary-bag-support-fixed.sql');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPrimaryBagTriggers().catch(console.error);