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
  console.log('Testing fixed query for bag:', bagId);
  console.log('---');
  
  const { data, error } = await supabase
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
        equipment (*)
      )
    `)
    .eq('id', bagId)
    .single();
    
  if (error) {
    console.error('❌ Query error:', error);
  } else {
    console.log('✓ Query successful!');
    console.log('Bag name:', data.name);
    console.log('Profile:', data.profiles?.display_name || data.profiles?.username);
    console.log('Equipment count:', data.bag_equipment?.length || 0);
    
    if (data.bag_equipment?.length > 0) {
      console.log('Sample equipment:');
      data.bag_equipment.slice(0, 3).forEach(item => {
        console.log(`  - ${item.equipment?.brand} ${item.equipment?.model}`);
      });
    }
  }
  
  process.exit(0);
}

checkBag();