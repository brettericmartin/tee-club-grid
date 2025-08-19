import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

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

async function checkBagIds() {
  console.log('\n=== CHECKING FEED POSTS FOR BAG_IDs ===\n');
  
  // Get recent feed posts
  const { data: posts, error } = await supabase
    .from('feed_posts')
    .select('id, type, user_id, bag_id, equipment_id, created_at')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }
  
  // Group by whether they have bag_id
  const withBagId = posts?.filter(p => p.bag_id) || [];
  const withoutBagId = posts?.filter(p => !p.bag_id) || [];
  
  console.log(`Total posts checked: ${posts?.length || 0}`);
  console.log(`Posts WITH bag_id: ${withBagId.length}`);
  console.log(`Posts WITHOUT bag_id: ${withoutBagId.length}`);
  
  if (withoutBagId.length > 0) {
    console.log('\n=== POSTS MISSING BAG_ID ===');
    withoutBagId.forEach(post => {
      console.log(`- ${post.type} (${post.id.substring(0, 8)}...) by user ${post.user_id.substring(0, 8)}...`);
    });
  }
  
  if (withBagId.length > 0) {
    console.log('\n=== POSTS WITH BAG_ID ===');
    withBagId.forEach(post => {
      console.log(`✓ ${post.type} (${post.id.substring(0, 8)}...) has bag_id: ${post.bag_id.substring(0, 8)}...`);
    });
  }
  
  // For posts without bag_id, show what bags their users have
  if (withoutBagId.length > 0) {
    console.log('\n=== FIXING MISSING BAG_IDs ===');
    
    for (const post of withoutBagId) {
      const { data: userBags } = await supabase
        .from('user_bags')
        .select('id, name, created_at')
        .eq('user_id', post.user_id)
        .order('created_at', { ascending: false });
      
      if (userBags && userBags.length > 0) {
        const defaultBag = userBags[0];
        console.log(`\nPost ${post.id.substring(0, 8)}... can use bag: ${defaultBag.name} (${defaultBag.id.substring(0, 8)}...)`);
        
        // Update the post with the bag_id
        const { error: updateError } = await supabase
          .from('feed_posts')
          .update({ bag_id: defaultBag.id })
          .eq('id', post.id);
        
        if (updateError) {
          console.error(`  ✗ Failed to update: ${updateError.message}`);
        } else {
          console.log(`  ✓ Updated post with bag_id`);
        }
      } else {
        console.log(`\nPost ${post.id.substring(0, 8)}... - User has no bags!`);
      }
    }
  }
  
  console.log('\n=== DONE ===\n');
}

checkBagIds().catch(console.error);