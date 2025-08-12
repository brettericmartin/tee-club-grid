import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const bagId = 'f506f87e-223e-4fa4-beee-f0094915a965';

async function checkBag() {
  console.log('Checking bag with ID:', bagId);
  console.log('---');
  
  // First, check if the bag exists
  const { data: bag, error: bagError } = await supabase
    .from('user_bags')
    .select('*')
    .eq('id', bagId)
    .single();
    
  if (bagError) {
    console.error('Error fetching bag:', bagError);
    return;
  }
  
  console.log('✓ Bag found:', {
    id: bag.id,
    name: bag.name,
    user_id: bag.user_id,
    created_at: bag.created_at
  });
  console.log('---');
  
  // Check if the user profile exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', bag.user_id)
    .single();
    
  if (profileError) {
    console.error('Error fetching profile:', profileError);
  } else {
    console.log('✓ Profile found:', {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name
    });
  }
  console.log('---');
  
  // Now try the joined query that the component uses
  console.log('Testing joined query...');
  const { data: joinedData, error: joinedError } = await supabase
    .from('user_bags')
    .select(`
      *,
      profiles:user_id (
        id,
        username,
        display_name,
        avatar_url,
        handicap,
        location,
        title
      ),
      bag_equipment (
        *,
        equipment (*),
        shaft:shaft_id (*),
        grip:grip_id (*)
      )
    `)
    .eq('id', bagId)
    .single();
    
  if (joinedError) {
    console.error('❌ Joined query error:', joinedError);
  } else {
    console.log('✓ Joined query successful');
    console.log('Profile in joined data:', joinedData.profiles);
    console.log('Equipment count:', joinedData.bag_equipment?.length || 0);
  }
  
  process.exit(0);
}

checkBag();