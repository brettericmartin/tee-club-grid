import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findUserWithoutBag() {
  console.log('Looking for a user without any bags...\n');
  
  try {
    // Get all profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name');
    
    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return;
    }
    
    console.log(`Checking ${profiles.length} profiles...\n`);
    
    for (const profile of profiles) {
      // Check if user has bags
      const { data: bags, error: bagError } = await supabase
        .from('user_bags')
        .select('id')
        .eq('user_id', profile.id);
      
      if (bagError) {
        console.error('Error fetching bags:', bagError);
        continue;
      }
      
      if (!bags || bags.length === 0) {
        console.log('✅ Found user without bags:');
        console.log(`   ID: ${profile.id}`);
        console.log(`   Username: ${profile.username}`);
        console.log(`   Display Name: ${profile.display_name || 'Not set'}`);
        console.log(`\n   Expected bag name: "${profile.display_name || profile.username}'s Bag"`);
        console.log('\nThis user will have a bag automatically created when they visit My Bag page.');
        return profile;
      }
    }
    
    console.log('❌ All users already have at least one bag.');
    console.log('\nTo test the automatic bag creation:');
    console.log('1. Create a new user account');
    console.log('2. Navigate to the My Bag page');
    console.log('3. A bag should be automatically created with the name "(username)\'s Bag"');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

findUserWithoutBag();