import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfiles() {
  console.log('\n👤 Checking Profiles Schema\n');
  console.log('==========================\n');

  // Get a sample profile to see columns
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (profiles && profiles.length > 0) {
    console.log('Profile columns:');
    Object.keys(profiles[0]).forEach(key => {
      console.log(`- ${key}: ${typeof profiles[0][key]}`);
    });
    
    console.log('\nSample profile data:');
    console.log(JSON.stringify(profiles[0], null, 2));
  }

  console.log('\n==========================\n');
}

checkProfiles().catch(console.error);