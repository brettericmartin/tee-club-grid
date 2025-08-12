#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function ensurePrimaryBags() {
  console.log('🔍 Checking and setting primary bags for all users...\n');

  try {
    // Get all users with their bags
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, display_name');

    if (usersError) throw usersError;

    console.log(`Found ${users.length} users to check\n`);

    let updatedCount = 0;
    let alreadySetCount = 0;

    for (const user of users) {
      // Get user's bags
      const { data: bags, error: bagsError } = await supabase
        .from('user_bags')
        .select('id, name, is_primary, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (bagsError) {
        console.error(`❌ Error fetching bags for user ${user.username || user.display_name}:`, bagsError);
        continue;
      }

      if (!bags || bags.length === 0) {
        console.log(`⏭️  User ${user.username || user.display_name} has no bags`);
        continue;
      }

      // Check if user already has a primary bag
      const primaryBag = bags.find(bag => bag.is_primary);

      if (primaryBag) {
        console.log(`✅ User ${user.username || user.display_name} already has primary bag: "${primaryBag.name}"`);
        alreadySetCount++;
      } else {
        // Set the first (oldest) bag as primary
        const firstBag = bags[0];
        
        const { error: updateError } = await supabase
          .from('user_bags')
          .update({ is_primary: true })
          .eq('id', firstBag.id);

        if (updateError) {
          console.error(`❌ Error setting primary bag for user ${user.username || user.display_name}:`, updateError);
        } else {
          console.log(`🔧 Set primary bag for user ${user.username || user.display_name}: "${firstBag.name}"`);
          updatedCount++;
        }
      }

      // Ensure only one bag is primary (fix any data issues)
      if (bags.filter(b => b.is_primary).length > 1) {
        console.log(`🔧 Fixing multiple primary bags for user ${user.username || user.display_name}`);
        
        // Keep only the first primary bag, unset others
        const primaryBags = bags.filter(b => b.is_primary);
        for (let i = 1; i < primaryBags.length; i++) {
          await supabase
            .from('user_bags')
            .update({ is_primary: false })
            .eq('id', primaryBags[i].id);
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   - Users with primary bags already set: ${alreadySetCount}`);
    console.log(`   - Primary bags newly set: ${updatedCount}`);
    console.log(`   - Total users processed: ${users.length}`);
    console.log('\n✅ Primary bag setup complete!');

  } catch (error) {
    console.error('❌ Error ensuring primary bags:', error);
    process.exit(1);
  }
}

// Run the script
ensurePrimaryBags();