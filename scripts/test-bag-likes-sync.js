import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function testBagLikesSync() {
  console.log('Testing bag likes synchronization...\n');

  try {
    // 1. Check if likes_count column exists
    console.log('1. Checking if likes_count column exists on user_bags...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('user_bags')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('Error checking table:', tableError);
      return;
    }
    
    if (tableInfo.length > 0 && 'likes_count' in tableInfo[0]) {
      console.log('✓ likes_count column exists\n');
    } else {
      console.log('✗ likes_count column not found - running migration...');
      // Run the migration
      const { error: migrationError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE user_bags ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
          
          UPDATE user_bags 
          SET likes_count = (
            SELECT COUNT(*) 
            FROM bag_likes 
            WHERE bag_likes.bag_id = user_bags.id
          );
        `
      });
      
      if (migrationError) {
        console.error('Migration error:', migrationError);
        console.log('\nPlease run the SQL migration manually from sql/add-bag-likes-count.sql');
        return;
      }
    }

    // 2. Test bag likes count accuracy
    console.log('2. Testing bag likes count accuracy...');
    const { data: bags, error: bagsError } = await supabase
      .from('user_bags')
      .select(`
        id,
        name,
        likes_count,
        bag_likes!bag_likes_bag_id_fkey(count)
      `)
      .limit(5);
    
    if (bagsError) {
      console.error('Error fetching bags:', bagsError);
      return;
    }

    console.log('\nBag likes comparison:');
    console.log('ID | Name | likes_count | actual_count');
    console.log('---|------|-------------|-------------');
    
    let mismatchCount = 0;
    for (const bag of bags) {
      const actualCount = bag.bag_likes?.[0]?.count || 0;
      const match = bag.likes_count === actualCount ? '✓' : '✗';
      console.log(`${bag.id} | ${bag.name} | ${bag.likes_count} | ${actualCount} ${match}`);
      if (bag.likes_count !== actualCount) {
        mismatchCount++;
      }
    }

    if (mismatchCount > 0) {
      console.log(`\n⚠️  Found ${mismatchCount} mismatches. Updating counts...`);
      
      // Fix mismatches
      const { error: updateError } = await supabase.rpc('exec_sql', {
        sql: `
          UPDATE user_bags 
          SET likes_count = (
            SELECT COUNT(*) 
            FROM bag_likes 
            WHERE bag_likes.bag_id = user_bags.id
          );
        `
      });
      
      if (updateError) {
        console.error('Error updating counts:', updateError);
      } else {
        console.log('✓ Counts updated successfully');
      }
    } else {
      console.log('\n✓ All likes counts are accurate');
    }

    // 3. Test trigger functionality
    console.log('\n3. Testing trigger functionality...');
    
    // Find a test bag
    const { data: testBag } = await supabase
      .from('user_bags')
      .select('id, likes_count')
      .limit(1)
      .single();
    
    if (!testBag) {
      console.log('No bags found for testing');
      return;
    }

    console.log(`Test bag ID: ${testBag.id}, current likes: ${testBag.likes_count}`);
    
    // Use a valid UUID for test user
    const testUserId = '00000000-0000-0000-0000-' + Date.now().toString().padStart(12, '0').slice(-12);
    
    // Add a like
    console.log('Adding a test like...');
    const { error: likeError } = await supabase
      .from('bag_likes')
      .insert({
        user_id: testUserId,
        bag_id: testBag.id
      });
    
    if (likeError) {
      console.error('Error adding like:', likeError);
      return;
    }

    // Check if count increased
    const { data: updatedBag } = await supabase
      .from('user_bags')
      .select('likes_count')
      .eq('id', testBag.id)
      .single();
    
    console.log(`After like: ${updatedBag.likes_count} (expected: ${testBag.likes_count + 1})`);
    
    // Remove the like
    console.log('Removing test like...');
    const { error: deleteError } = await supabase
      .from('bag_likes')
      .delete()
      .eq('user_id', testUserId)
      .eq('bag_id', testBag.id);
    
    if (deleteError) {
      console.error('Error removing like:', deleteError);
      return;
    }

    // Check if count decreased
    const { data: finalBag } = await supabase
      .from('user_bags')
      .select('likes_count')
      .eq('id', testBag.id)
      .single();
    
    console.log(`After unlike: ${finalBag.likes_count} (expected: ${testBag.likes_count})`);
    
    if (finalBag.likes_count === testBag.likes_count) {
      console.log('\n✓ Trigger is working correctly!');
    } else {
      console.log('\n✗ Trigger may not be working properly');
      console.log('Please check if the trigger exists and run sql/add-bag-likes-count.sql if needed');
    }

    console.log('\n✅ Bag likes sync test completed!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testBagLikesSync();