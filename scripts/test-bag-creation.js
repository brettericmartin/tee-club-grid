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

async function testBagCreation() {
  console.log('Testing automatic bag creation logic...\n');
  
  try {
    // 1. First, let's check a few users and their bags
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .limit(5);
    
    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return;
    }
    
    console.log('Found profiles:', profiles.length);
    
    for (const profile of profiles) {
      console.log(`\nChecking user: ${profile.username || profile.display_name || profile.id}`);
      
      // Check if user has bags
      const { data: bags, error: bagError } = await supabase
        .from('user_bags')
        .select('id, name, created_at')
        .eq('user_id', profile.id);
      
      if (bagError) {
        console.error('Error fetching bags:', bagError);
        continue;
      }
      
      if (bags && bags.length > 0) {
        console.log(`  ✅ Has ${bags.length} bag(s):`);
        bags.forEach(bag => {
          console.log(`     - "${bag.name}" (created: ${new Date(bag.created_at).toLocaleDateString()})`);
        });
      } else {
        console.log(`  ⚠️  No bags found - would create: "${profile.display_name || profile.username}'s Bag"`);
      }
    }
    
    // 2. Test the bag name generation logic
    console.log('\n--- Bag Name Generation Test ---');
    const testCases = [
      { display_name: 'John Doe', username: 'johndoe', expected: "John Doe's Bag" },
      { display_name: null, username: 'janedoe', expected: "janedoe's Bag" },
      { display_name: '', username: 'bobsmith', expected: "bobsmith's Bag" },
      { display_name: null, username: null, email: 'user@example.com', expected: "user's Bag" },
    ];
    
    testCases.forEach(test => {
      let bagName = 'My Bag';
      if (test.display_name) {
        bagName = `${test.display_name}'s Bag`;
      } else if (test.username) {
        bagName = `${test.username}'s Bag`;
      } else if (test.email) {
        const emailPrefix = test.email.split('@')[0];
        bagName = `${emailPrefix}'s Bag`;
      }
      
      console.log(`  Profile: display_name="${test.display_name}", username="${test.username}"`);
      console.log(`  Generated: "${bagName}" ${bagName === test.expected ? '✅' : '❌'}`);
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testBagCreation();