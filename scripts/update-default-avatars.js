import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateDefaultAvatars() {
  console.log('Updating profiles without avatars to use Teed logo...\n');
  
  try {
    // First, find profiles without avatars
    const { data: profilesWithoutAvatars, error: fetchError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .or('avatar_url.is.null,avatar_url.eq.');
    
    if (fetchError) {
      console.error('Error fetching profiles:', fetchError);
      return;
    }
    
    if (!profilesWithoutAvatars || profilesWithoutAvatars.length === 0) {
      console.log('✅ All profiles already have avatars!');
      return;
    }
    
    console.log(`Found ${profilesWithoutAvatars.length} profiles without avatars:`);
    profilesWithoutAvatars.forEach(profile => {
      console.log(`  - ${profile.display_name || profile.username || profile.id}`);
    });
    
    // Update them with the default Teed logo
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: '/teed-icon.svg' })
      .or('avatar_url.is.null,avatar_url.eq.')
      .select();
    
    if (updateError) {
      console.error('Error updating profiles:', updateError);
      return;
    }
    
    console.log(`\n✅ Successfully updated ${updated.length} profiles with the default Teed logo!`);
    
    // Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('avatar_url', '/teed-icon.svg');
    
    if (!verifyError && verifyData) {
      console.log(`\n📊 Total profiles with Teed logo avatar: ${verifyData.length}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

updateDefaultAvatars();