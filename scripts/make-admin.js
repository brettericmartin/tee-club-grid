#!/usr/bin/env node

/**
 * Make a user an admin
 * This script sets the is_admin flag for a specific user
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Note: This script requires you to be logged in as an existing admin
// or to have the service role key. For initial setup, you'll need to
// run the SQL directly in Supabase Dashboard.

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function makeUserAdmin(username) {
  console.log(`🔧 Attempting to make ${username} an admin...`);
  console.log('\n⚠️  Note: This will only work if:');
  console.log('   1. The is_admin column exists in the profiles table');
  console.log('   2. You have the proper permissions (service role key)');
  console.log('\n📝 If this fails, run this SQL in Supabase Dashboard:');
  console.log(`   UPDATE profiles SET is_admin = true WHERE username = '${username}';`);
  console.log('\n');

  try {
    // First check if user exists
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, username, is_admin')
      .eq('username', username)
      .single();

    if (userError) {
      if (userError.message.includes('column "is_admin" does not exist')) {
        console.error('❌ The is_admin column does not exist yet.');
        console.error('\n📝 Please run the following SQL in Supabase Dashboard first:');
        console.error('   ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;');
        console.error(`\n📝 Then run this to make ${username} an admin:`);
        console.error(`   UPDATE profiles SET is_admin = true WHERE username = '${username}';`);
      } else if (userError.code === 'PGRST116') {
        console.error(`❌ User '${username}' not found`);
      } else {
        console.error('❌ Error checking user:', userError.message);
      }
      return;
    }

    if (!user) {
      console.error(`❌ User '${username}' not found`);
      return;
    }

    if (user.is_admin === true) {
      console.log(`✅ ${username} is already an admin!`);
      return;
    }

    // Try to update (this will likely fail without proper permissions)
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ is_admin: true })
      .eq('username', username)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Could not update user via API:', updateError.message);
      console.error('\n📝 Please run this SQL in Supabase Dashboard:');
      console.error(`   UPDATE profiles SET is_admin = true WHERE username = '${username}';`);
      return;
    }

    console.log(`✅ Successfully made ${username} an admin!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('\n📝 Please run this SQL in Supabase Dashboard:');
    console.error(`   UPDATE profiles SET is_admin = true WHERE username = '${username}';`);
  }
}

// Get username from command line
const username = process.argv[2] || 'brettmartinplay';
makeUserAdmin(username);