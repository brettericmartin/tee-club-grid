#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

console.log('🔧 FIXING MISSING PRIMARY BAGS');
console.log('==============================\n');

async function fixMissingPrimaryBags() {
  try {
    // Get all users
    const { data: users } = await supabase
      .from('profiles')
      .select('id, username');
      
    if (!users) {
      console.log('❌ Could not fetch users');
      return;
    }
    
    console.log(`Checking ${users.length} users for primary bags...\n`);
    
    for (const user of users) {
      console.log(`Checking user: ${user.username} (${user.id})`);
      
      // Check if user has a primary bag
      const { data: primaryBags } = await supabase
        .from('user_bags')
        .select('id, name, is_primary')
        .eq('user_id', user.id)
        .eq('is_primary', true);
        
      if (!primaryBags || primaryBags.length === 0) {
        console.log('  ❌ No primary bag found');
        
        // Get all bags for this user
        const { data: allBags } = await supabase
          .from('user_bags')
          .select('id, name, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
          
        if (allBags && allBags.length > 0) {
          // Set the first/oldest bag as primary
          const bagToMakePrimary = allBags[0];
          
          console.log(`  🔧 Setting "${bagToMakePrimary.name}" as primary...`);
          
          const { error } = await supabase
            .from('user_bags')
            .update({ is_primary: true })
            .eq('id', bagToMakePrimary.id);
            
          if (error) {
            console.log(`  ❌ Failed to set primary: ${error.message}`);
          } else {
            console.log('  ✅ Primary bag set');
          }
        } else {
          console.log('  ⚠️ User has no bags at all');
        }
      } else {
        console.log(`  ✅ Primary bag: "${primaryBags[0].name}"`);
      }
      console.log('');
    }
    
    console.log('🎉 Primary bag fix complete!');

  } catch (error) {
    console.error('❌ Error fixing primary bags:', error);
  }
}

// Run the fix
fixMissingPrimaryBags().then(() => {
  console.log('\n✅ MISSING PRIMARY BAG FIX COMPLETE');
  process.exit(0);
}).catch(error => {
  console.error('💥 PRIMARY BAG FIX CRASHED:', error);
  process.exit(1);
});