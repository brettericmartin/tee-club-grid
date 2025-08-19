import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yihmnhzocmfeghmevtyh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpaG1uaHpvY21mZWdobWV2dHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0MzUyNDcsImV4cCI6MjA0NjAxMTI0N30.vr-w12LiOvRJZe_2s0GQjNJwxXz6xMKEqRMpZXJRG5s'
);

async function checkFeedPosts() {
  // Get recent feed posts
  const { data: posts, error } = await supabase
    .from('feed_posts')
    .select('id, type, user_id, bag_id, equipment_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }
  
  console.log('\n=== RECENT FEED POSTS ===\n');
  posts?.forEach(post => {
    console.log(`Post ${post.id}:`);
    console.log(`  Type: ${post.type}`);
    console.log(`  User ID: ${post.user_id}`);
    console.log(`  Bag ID: ${post.bag_id || 'NULL'}`);
    console.log(`  Equipment ID: ${post.equipment_id || 'NULL'}`);
    console.log('---');
  });
  
  // Check how many posts have bag_ids
  const withBagId = posts?.filter(p => p.bag_id)?.length || 0;
  const withoutBagId = posts?.filter(p => !p.bag_id)?.length || 0;
  
  console.log(`\nPosts WITH bag_id: ${withBagId}`);
  console.log(`Posts WITHOUT bag_id: ${withoutBagId}`);
  
  // Check a specific user's bags
  if (posts && posts.length > 0) {
    const userId = posts[0].user_id;
    const { data: bags } = await supabase
      .from('user_bags')
      .select('id, name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    console.log(`\n=== User ${userId} bags ===`);
    bags?.forEach(bag => {
      console.log(`  ${bag.name} (ID: ${bag.id})`);
    });
  }
}

checkFeedPosts().catch(console.error);