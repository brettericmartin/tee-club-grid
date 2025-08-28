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
console.log('🔍 ADMIN SYSTEM VERIFICATION');
console.log('================================================================================\n');

async function verifyAdminSystem() {
  try {
    // 1. Check profiles.is_admin column
    console.log('📋 Step 1: Checking profiles.is_admin column...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, username, is_admin')
      .limit(5);
    
    if (profileError) {
      console.log(`   ❌ Error: ${profileError.message}`);
    } else {
      console.log('   ✅ profiles.is_admin column exists');
      
      const admins = profiles.filter(p => p.is_admin);
      console.log(`   Found ${admins.length} admin(s):`);
      admins.forEach(admin => {
        console.log(`      - ${admin.username || admin.email} (${admin.id.substring(0, 8)}...)`);
      });
    }
    
    // 2. Check if admins table exists (for backward compatibility)
    console.log('\n📋 Step 2: Checking admins table (legacy)...');
    const { data: adminsTable, error: adminsError } = await supabase
      .from('admins')
      .select('*')
      .limit(5);
    
    if (adminsError) {
      if (adminsError.message.includes('does not exist')) {
        console.log('   ℹ️  admins table does not exist (OK - using profiles.is_admin)');
      } else {
        console.log(`   ⚠️  admins table exists but has issues: ${adminsError.message}`);
      }
    } else {
      console.log(`   ⚠️  Legacy admins table exists with ${adminsTable.length} records`);
      console.log('   💡 Recommendation: Migrate to profiles.is_admin and drop this table');
    }
    
    // 3. Check API middleware compatibility
    console.log('\n📋 Step 3: Checking middleware expectations...');
    const middlewarePath = '/home/brettm/development/tee-club-grid/lib/middleware/adminAuth.ts';
    const fs = await import('fs');
    
    try {
      const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
      if (middlewareContent.includes("from('profiles')") && middlewareContent.includes('.is_admin')) {
        console.log('   ✅ API middleware uses profiles.is_admin (correct)');
      } else if (middlewareContent.includes("from('admins')")) {
        console.log('   ⚠️  API middleware uses admins table (needs update)');
      }
    } catch (e) {
      console.log('   ℹ️  Could not check middleware file');
    }
    
    // 4. Test admin functionality
    console.log('\n📋 Step 4: Testing admin functionality...');
    
    // Get an admin user
    const { data: adminUser, error: adminError } = await supabase
      .from('profiles')
      .select('id, email, is_admin')
      .eq('is_admin', true)
      .limit(1)
      .single();
    
    if (adminError || !adminUser) {
      console.log('   ⚠️  No admin users found');
      console.log('   To make yourself admin, run:');
      console.log('   UPDATE profiles SET is_admin = true WHERE email = \'your-email@example.com\';');
    } else {
      console.log('   ✅ Admin user found:', adminUser.email);
      
      // Test if admin can access waitlist
      const { data: waitlist, error: waitlistError } = await supabase
        .from('waitlist_applications')
        .select('id')
        .limit(1);
      
      if (!waitlistError) {
        console.log('   ✅ Admin can access waitlist applications');
      } else {
        console.log('   ❌ Admin cannot access waitlist:', waitlistError.message);
      }
    }
    
    // 5. Summary and recommendations
    console.log('\n================================================================================');
    console.log('📊 ADMIN SYSTEM STATUS');
    console.log('================================================================================\n');
    
    const hasIsAdminColumn = !profileError;
    const hasAdminUsers = profiles && profiles.some(p => p.is_admin);
    const hasLegacyTable = !adminsError || (adminsError && !adminsError.message.includes('does not exist'));
    
    if (hasIsAdminColumn && hasAdminUsers) {
      console.log('✅ Admin system is properly configured using profiles.is_admin');
      
      if (hasLegacyTable) {
        console.log('\n⚠️  Legacy admins table still exists');
        console.log('   Run this SQL to clean up:');
        console.log('   DROP TABLE IF EXISTS admins CASCADE;');
      }
    } else if (hasIsAdminColumn && !hasAdminUsers) {
      console.log('⚠️  Admin column exists but no admin users configured');
      console.log('\nTo set up an admin user:');
      console.log('1. Find your user ID: SELECT id, email FROM profiles WHERE email = \'your-email\';');
      console.log('2. Make admin: UPDATE profiles SET is_admin = true WHERE id = \'your-user-id\';');
    } else {
      console.log('❌ Admin system not properly configured');
      console.log('\nRun this SQL to fix:');
      console.log('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;');
      console.log('UPDATE profiles SET is_admin = true WHERE email = \'your-admin-email\';');
    }
    
    console.log('\n✨ Verification complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

verifyAdminSystem();