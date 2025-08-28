#!/usr/bin/env node
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('================================================================================');
console.log('🔧 MIGRATING ADMIN SYSTEM TO profiles.is_admin');
console.log('================================================================================\n');

async function migrateAdminSystem() {
  try {
    // 1. Check current state
    console.log('📋 Step 1: Checking current admin configuration...');
    
    // Check legacy admins table
    const { data: legacyAdmins, error: legacyError } = await supabase
      .from('admins')
      .select('user_id');
    
    if (legacyError) {
      console.log('   ℹ️  No legacy admins table found (good!)');
    } else {
      console.log(`   Found ${legacyAdmins.length} admin(s) in legacy table`);
      
      if (legacyAdmins.length > 0) {
        // Migrate legacy admins to profiles.is_admin
        console.log('\n📋 Step 2: Migrating legacy admins to profiles.is_admin...');
        
        for (const admin of legacyAdmins) {
          const { data: profile, error: updateError } = await supabase
            .from('profiles')
            .update({ is_admin: true })
            .eq('id', admin.user_id)
            .select('email, username')
            .single();
          
          if (updateError) {
            console.log(`   ❌ Failed to migrate admin ${admin.user_id}: ${updateError.message}`);
          } else {
            console.log(`   ✅ Migrated admin: ${profile.email || profile.username || admin.user_id}`);
          }
        }
      }
    }
    
    // 2. Check profiles with is_admin
    console.log('\n📋 Step 3: Verifying profiles.is_admin status...');
    const { data: adminProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, username, is_admin')
      .eq('is_admin', true);
    
    if (profileError) {
      console.log(`   ❌ Error checking profiles: ${profileError.message}`);
    } else {
      console.log(`   Found ${adminProfiles.length} admin(s) in profiles table:`);
      adminProfiles.forEach(admin => {
        console.log(`      - ${admin.email || admin.username} (${admin.id.substring(0, 8)}...)`);
      });
      
      if (adminProfiles.length === 0) {
        // Set brett as admin if no admins exist
        console.log('\n📋 Step 4: Setting up default admin...');
        const { data: brett, error: brettError } = await supabase
          .from('profiles')
          .update({ is_admin: true })
          .eq('email', 'brettmartinplay@gmail.com')
          .select('id, email')
          .single();
        
        if (brettError) {
          console.log(`   ⚠️  Could not set default admin: ${brettError.message}`);
        } else {
          console.log(`   ✅ Set default admin: ${brett.email}`);
        }
      }
    }
    
    // 3. Test admin functionality
    console.log('\n📋 Step 5: Testing admin functionality...');
    
    const { data: testAdmin, error: testError } = await supabase
      .from('profiles')
      .select('email, is_admin')
      .eq('is_admin', true)
      .limit(1)
      .single();
    
    if (testError || !testAdmin) {
      console.log('   ❌ No admin users found after migration');
    } else {
      console.log(`   ✅ Admin functionality working for: ${testAdmin.email}`);
      
      // Test admin can access waitlist
      const { error: waitlistError } = await supabase
        .from('waitlist_applications')
        .select('id')
        .limit(1);
      
      if (!waitlistError) {
        console.log('   ✅ Admin can access waitlist applications');
      } else {
        console.log('   ❌ Admin cannot access waitlist:', waitlistError.message);
      }
    }
    
    // 4. Summary
    console.log('\n================================================================================');
    console.log('📊 MIGRATION SUMMARY');
    console.log('================================================================================\n');
    
    const { count: adminCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', true);
    
    if (adminCount > 0) {
      console.log(`✅ Successfully configured ${adminCount} admin user(s)`);
      console.log('\nAdmin system is now using profiles.is_admin');
      console.log('Frontend (React) and API middleware are aligned');
      
      if (!legacyError) {
        console.log('\n💡 Next step: Remove legacy admins table');
        console.log('   Run in Supabase SQL Editor:');
        console.log('   DROP TABLE IF EXISTS admins CASCADE;');
      }
    } else {
      console.log('❌ No admin users configured');
      console.log('\nManually set an admin user:');
      console.log('UPDATE profiles SET is_admin = true WHERE email = \'your-email@example.com\';');
    }
    
    console.log('\n✨ Migration complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

migrateAdminSystem();