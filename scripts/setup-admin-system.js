#!/usr/bin/env node

/**
 * Setup Admin System for Teed.club
 * This script adds admin capabilities to the platform
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  console.error('   Add SUPABASE_SERVICE_ROLE_KEY to your .env file');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupAdminSystem() {
  console.log('🚀 Setting up admin system for Teed.club...\n');

  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'add-admin-system.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('📝 Running database migrations...');
    
    // Execute the SQL migration
    const { error: migrationError } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    }).single();

    // If exec_sql doesn't exist, try direct approach
    if (migrationError && migrationError.message.includes('exec_sql')) {
      console.log('   Using alternative migration method...');
      
      // Add is_admin column
      const { error: alterError } = await supabase
        .from('profiles')
        .select('is_admin')
        .limit(1);
      
      if (alterError && alterError.message.includes('column "is_admin" does not exist')) {
        console.log('   Adding is_admin column to profiles table...');
        // Note: This won't work directly, we need to use SQL
        console.log('   ⚠️  Please run the SQL migration manually in Supabase Dashboard');
        console.log('   SQL file location: scripts/add-admin-system.sql');
      } else {
        console.log('   ✅ is_admin column already exists');
      }
    } else if (migrationError) {
      throw migrationError;
    } else {
      console.log('   ✅ Database migrations completed');
    }

    // Check current admin users
    console.log('\n📊 Checking current admin users...');
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('id, username, is_admin')
      .eq('is_admin', true);

    if (adminError) {
      console.log('   ⚠️  Could not check admin users:', adminError.message);
    } else if (admins && admins.length > 0) {
      console.log(`   Found ${admins.length} admin user(s):`);
      admins.forEach(admin => {
        console.log(`   - ${admin.username} (${admin.id})`);
      });
    } else {
      console.log('   No admin users found yet');
    }

    // Set specific user as admin (optional)
    const adminUsername = process.argv[2];
    if (adminUsername) {
      console.log(`\n👤 Setting ${adminUsername} as admin...`);
      
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('username', adminUsername)
        .select()
        .single();

      if (userError) {
        console.error(`   ❌ Error setting admin:`, userError.message);
      } else if (user) {
        console.log(`   ✅ ${user.username} is now an admin!`);
      } else {
        console.log(`   ❌ User ${adminUsername} not found`);
      }
    }

    console.log('\n✨ Admin system setup complete!');
    console.log('\nTo set a user as admin, run:');
    console.log('  node scripts/setup-admin-system.js <username>');
    console.log('\nOr use SQL in Supabase Dashboard:');
    console.log("  UPDATE profiles SET is_admin = true WHERE username = 'your_username';");

  } catch (error) {
    console.error('❌ Error setting up admin system:', error);
    console.error('\nPlease run the SQL migration manually in Supabase Dashboard:');
    console.error('SQL file: scripts/add-admin-system.sql');
    process.exit(1);
  }
}

// Run the setup
setupAdminSystem();