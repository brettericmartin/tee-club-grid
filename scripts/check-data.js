import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkData() {
  console.log('Checking database data...\n');

  // Check profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(5);

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  } else {
    console.log(`Profiles found: ${profiles?.length || 0}`);
    if (profiles?.length > 0) {
      console.log('Sample profiles:', profiles.map(p => ({ 
        id: p.id, 
        username: p.username,
        display_name: p.display_name 
      })));
    }
  }

  console.log('\n---\n');

  // Check equipment
  const { data: equipment, error: equipmentError } = await supabase
    .from('equipment')
    .select('*')
    .limit(5);

  if (equipmentError) {
    console.error('Error fetching equipment:', equipmentError);
  } else {
    console.log(`Equipment found: ${equipment?.length || 0}`);
    if (equipment?.length > 0) {
      console.log('Sample equipment:', equipment.map(e => ({ 
        id: e.id, 
        model: e.model,
        brand: e.brand,
        category: e.category,
        msrp: e.msrp 
      })));
    }
  }

  console.log('\n---\n');

  // Check user_bags
  const { data: bags, error: bagsError } = await supabase
    .from('user_bags')
    .select('*')
    .limit(5);

  if (bagsError) {
    console.error('Error fetching bags:', bagsError);
  } else {
    console.log(`User bags found: ${bags?.length || 0}`);
    if (bags?.length > 0) {
      console.log('Sample bags:', bags.map(b => ({ 
        id: b.id, 
        name: b.name,
        is_primary: b.is_primary 
      })));
    }
  }

  console.log('\n---\n');

  // Check feed posts
  const { data: feedPosts, error: feedPostsError } = await supabase
    .from('feed_posts')
    .select('*')
    .limit(5);

  if (feedPostsError) {
    console.error('Error fetching feed posts:', feedPostsError);
  } else {
    console.log(`Feed posts found: ${feedPosts?.length || 0}`);
    if (feedPosts?.length > 0) {
      console.log('Sample posts:', feedPosts.map(p => ({ 
        id: p.id, 
        type: p.type,
        created_at: p.created_at 
      })));
    }
  }
}

checkData().catch(console.error);