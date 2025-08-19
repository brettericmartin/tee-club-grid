#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsernameUniqueness() {
  console.log('🔍 Checking username uniqueness...\n');

  try {
    // 1. Get all profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching profiles:', error);
      return;
    }

    console.log(`Found ${profiles?.length || 0} profiles\n`);

    // 2. Check for duplicate usernames
    const usernameMap = new Map();
    const duplicates = [];

    profiles?.forEach(profile => {
      if (profile.username) {
        if (usernameMap.has(profile.username.toLowerCase())) {
          duplicates.push({
            username: profile.username,
            profiles: [usernameMap.get(profile.username.toLowerCase()), profile]
          });
        } else {
          usernameMap.set(profile.username.toLowerCase(), profile);
        }
      }
    });

    if (duplicates.length > 0) {
      console.log('⚠️  Found duplicate usernames:');
      duplicates.forEach(dup => {
        console.log(`\n  Username: "${dup.username}"`);
        dup.profiles.forEach(p => {
          console.log(`    - ${p.display_name || 'No display name'} (ID: ${p.id})`);
        });
      });
    } else {
      console.log('✅ No duplicate usernames found!');
    }

    // 3. Check for null/empty usernames
    const emptyUsernames = profiles?.filter(p => !p.username) || [];
    if (emptyUsernames.length > 0) {
      console.log(`\n⚠️  Found ${emptyUsernames.length} profiles without usernames:`);
      emptyUsernames.slice(0, 5).forEach(p => {
        console.log(`  - ${p.display_name || 'No display name'} (ID: ${p.id})`);
      });
      if (emptyUsernames.length > 5) {
        console.log(`  ... and ${emptyUsernames.length - 5} more`);
      }
    }

    // 4. Check if there's a unique constraint on username
    console.log('\n📋 Checking database constraints...');
    const { data: constraints, error: constraintError } = await supabase
      .rpc('get_table_constraints', { table_name: 'profiles' })
      .select('*');

    if (constraintError) {
      // Try alternative method
      const { data: tableInfo, error: infoError } = await supabase
        .from('information_schema.table_constraints')
        .select('*')
        .eq('table_name', 'profiles')
        .eq('constraint_type', 'UNIQUE');

      if (infoError) {
        console.log('⚠️  Could not check constraints (requires admin access)');
      } else {
        const usernameConstraint = tableInfo?.find(c => 
          c.constraint_name?.includes('username')
        );
        if (usernameConstraint) {
          console.log('✅ Username has a UNIQUE constraint');
        } else {
          console.log('⚠️  No UNIQUE constraint found on username column');
        }
      }
    }

    // 5. Suggest fixes
    if (duplicates.length > 0 || emptyUsernames.length > 0) {
      console.log('\n💡 Suggested fixes:');
      console.log('1. Add a UNIQUE constraint to the username column');
      console.log('2. Generate unique usernames for profiles without them');
      console.log('3. Resolve duplicate usernames by appending numbers');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkUsernameUniqueness();